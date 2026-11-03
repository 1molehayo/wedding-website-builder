# Ìgbéyàwówa — recovered progress (Aug 9–13, 2026)

Snapshot from the recovered chat ([Co creation discussion](a83c655c-b3ac-447b-b0bd-017ee56c5999)). Last agent work: **lint clean** (Aug 13, ~8:12 AM). You were going to test the overnight slice after a nap; that confirmation never happened.

v1 is **one wedding per deploy**. Local/demo couple samples use fictional **Theo & Ada**. Domain direction: `igbeyawowa.app`.

---

## Sep 27, 2026 — current backlog (source of truth)

Recap confirmed with you. Older Sep 10 notes below still apply where they are not restated here.

### Pending tasks

1. **Registry** — **decided Oct 10. Build the bank-transfer flow first.** Full rules are in [Bank-transfer gift registry](#oct-10-2026--bank-transfer-gift-registry).  
   Guests contribute by bank transfer toward a gift, or donate straight to the couple’s account. We do not take the payment. Amazon is the second way to pay for a gift, and it comes after this. Do not build an in-app card checkout.

2. **E-invitation: boilerplate designs that follow the wedding theme** — **persisted + email image (Nov 3).**  
   Catalog designs on Wedding settings, under the colour theme, with a Light / Dark toggle. Names, date, and venue come from the form.  
   Design + mode save with wedding settings. Saving also captures the preview PNG into storage. Guest invite emails embed that card inline when `invitation_card_path` is set. Apply migration `20261103220000_invitation_design.sql`, then **Save settings** once so the card image is generated.

3. **Nocturne dark hero overlay is too heavy** — **in code (Sep 27), needs a look in the browser.**  
   Only **Nocturne + dark mode**. Other themes stay as they are.  
   Middle of the photo is lighter. The bottom of the overlay is still solid theme background so the hero fades into the next section.

4. **In-page nav uses each block’s title, not the block type** — **in code (Sep 27).**  
   Colour Palette was **Photos** because it is an image block.  
   **Except the hero** (stays “Home”).
   - Anchor is the block id (stable if the title changes). Each details block has its own id (`details-{id}`).
   - Checkbox, **on by default:** “Use title in nav”. When off, a shorter nav label.
   - Visible label truncates at **20 characters** with an ellipsis. Full title is the tooltip.
   - Details has a title field (existing blocks default to “Celebrate with us”). An image with an empty title is left out of the nav.

5. **Admin navigation must not full-page load** — **in code (Sep 27), needs a click-through.**  
   Sidebar stays. Only the content area spins. Root route no longer reloads on every admin click (that was replacing the whole page). Session is reused in the browser so the layout does not wait on a new round-trip.

### Next, after the three above are checked

6. **E-invitation designs, then the email image** — **done in item 2 (Nov 3).**  
   Design persists; card PNG is generated on settings save and embedded in guest invite emails.

7. **Amazon on a gift** — **after the bank-transfer registry, not before.**  
   A gift can then be paid on Amazon or by the bank transfer in the Oct 10 spec. Amazon owns that payment and shipping. Group gifting (contribute any amount, or buy the whole item) is an Amazon.com wedding registry, not Amazon.es. A test list was started on a personal Amazon.com account. Still to verify as a guest: button labels, contribute vs buy, and that a $1 contribution does not ship. A full purchase needs a real US shipping address on the registry first. The odd names on that test list are fine.

### After touch-ups and the registry feature

Do not start these until the current UI touch-ups and the registry work are finished. Production is [igbeyawowa.app](https://www.igbeyawowa.app/). Do not fill it with test data.

1. **Staging on Vercel**  
   A staging environment for tests, separate from production. Import and export must work the same on staging, production, and any later environment.

2. **Super-admin import and export**  
   Page content, wedding settings, media, and registry. Only a super admin can import or export. The point is to move a wedding between environments without retyping it.

3. **In-app notifications**  
   Guest RSVP emails already send. The app should also notify admins when something changes: guest RSVP, profile updates, registry add or remove, page content updates, library shares, and similar. Super-admin notifications are only for feedback submitted from the feedback form.

4. **Activity logs**  
   A record of what everyone does, including admins, so actions on the app can be traced.

### Still open from Sep 10 (unchanged)

- Public footer: drop “Built with Ìgbéyàwówa”; keep the © line. Landing page line: confirm.
- Wedding settings `status`: what it should do (see Sep 10).
- New text-content block (title + rich text content; TipTap; H4–H6 only).
- Image block lightbox (`object-contain`, viewport max height).

---

## Oct 10, 2026 — bank-transfer gift registry

Source of truth for the next registry build. Confirmed in chat. Implement this before Amazon.

Today the registry is gift links, bank accounts, and a soft reserve. Cash is “show the account.” This replaces that guest path with a tracked transfer. Keep the couple’s bank accounts as the details we show. Do not take card payments in the app.

A guest can give in two ways:

- **Toward a gift.** Several people can contribute to the same gift. The same person can contribute to it more than once.
- **Straight to the bank account**, with no gift chosen. That donation does not change any gift’s remaining amount.

Both use the same transfer, confirmation, thank-you, and admin audit. Amazon is a later second option on a gift only: pay on Amazon, or send money this way.

### Gift

Fields: photo, title, an optional link to the product online, and prices by currency. The link is so guests can see the gift. It is not how they pay.

The form starts with one currency and its price. Both are required. The admin can add more currencies with a repeatable list (a TanStack Form array field). Every added row must have a currency and a price. Saving is blocked until each row has both. There is no live exchange rate. The prices they enter are the rate. A payment in one currency reduces the others by that ratio. A direct donation still has a currency, and it does not change a gift.

Example: the gift is listed at 100 USD and 90 EUR. A guest sends 45 EUR. That is half of the EUR price, so USD left becomes 50 and EUR left becomes 45. A later admin edit of the amount uses the corrected figure in the currency they paid. Past payments keep the reduction already applied. Changing a listed price affects later payments.

The guest pays in one of the currencies on that gift, and we show the bank account for that currency. A direct donation (no gift) still has a currency, and it does not change any gift.

On the public gift, show each original price with a line through it and the amount still left in that currency. Amount left changes only after the guest confirms they sent the money, and only for transfers that are not **Not received**. Use the admin-adjusted amount when the admin has changed it. **Not received** puts that share back. Marking it **Received** again takes it off again.

The gift is still open while any amount left is above zero. When the money covers the price, the gift is complete. If the total runs over, that is fine. The page only needs to show that a gift is still short.

### Transfer status

Label every transfer with one of these:

| Status | When |
| --- | --- |
| **Pending** | The guest has started the transfer. It stays pending until the admin settles it. |
| **Received** | The admin confirms the money arrived. |
| **Not received** | The admin confirms the money was not sent. Use this name on screen. “Failed” sounds like a system error. |

Pending has two moments. Before the guest confirms they sent the money, it does not reduce the gift, and the reminders below still go out. After they confirm, it is still **Pending**, the gift amount drops, and the admin can audit it. Confirming again must not create a second transfer.

If the guest sent less or more than they entered, only the admin edits the amount on that transfer, in the currency they paid. The guest cannot change it. The admin uses the name, email, and phone on the transfer to confirm with the sender when they need to. They do not mark it **Not received** and ask the guest to send it again. **Not received** is only for money that was not sent.

### Transfer (cart → checkout)

Each time a guest starts a donation, create one transfer with its own reference and ids. A later confirmation must update that same transfer.

Guest enters, before any bank details. Name and email are required. Phone is optional. The form does not submit without a name and an email.

- amount they intend to send
- currency, one of the currencies on the gift (or, for a direct donation, a currency the couple accepts)
- name (required)
- email (required)
- phone, optional (used for WhatsApp if the admin needs to reach them)

Then show the couple’s bank account for that currency. The guest sends the money themselves.

### Reminders and thank-you

If they have not confirmed, email up to **three** reminders, on different days. Stop when they confirm. Each reminder links to confirm **that** transfer.

Confirming from the email opens the website on a success screen with a thank-you note, and we send a thank-you email. This is required for every confirmed donation, including a direct bank donation that is not tied to a gift.

The success screen plays confetti once, when it opens. Use [`canvas-confetti`](https://github.com/catdad/canvas-confetti): a short canvas burst (a few seconds), then remove the canvas. Do not use a DOM or WebGL particle engine. One burst per visit, not a loop. Skip it when `prefers-reduced-motion` is set. The thank-you note and email still show either way.

### Admin audit

Back office lists the transfers with the status above. For each one the admin can:

- change the amount, in the currency the guest paid, when they sent less or more than they entered. Only the admin can do this. The gift’s amounts left update from that. Reach the sender with the contact details on the transfer when the amount needs confirming. Do not make them start again.
- mark **Received**
- mark **Not received**, which puts that share back on the gift
- mark **Received** again later, if the transfer was only delayed
- email them, or message them on WhatsApp when a phone number was given, when the status is **Not received**

### Explicitly out of this build

- Amazon pay-on-a-gift (next, after this). A test Amazon.com wedding list was started on a personal account so group gifting can be checked. Do not treat that list as the couple’s.
- In-app card checkout.
- Scraping or calling Amazon for registry items.

---

## Sep 10, 2026 — new backlog (do not forget)

Logged after you reopened the project. Visual reference for the invitation card: sample “Important communication” artwork (cream / navy / gold, florals, monogram).

Items 2, 5, and 7 below are **superseded by the Sep 27 list** (invitation designs, nav titles for every non-hero block, retailer registry). Do not implement the old versions.

### Pending tasks

1. **Public footer — drop “Built with Ìgbéyàwówa”**  
   Keep `© Ìgbéyàwówa 2026`. Remove the extra “Built with …” line on the wedding site footer (`PublicShell`). Landing page has a similar line — confirm whether that stays.

2. **RSVP + invite email: invitation image (soft copy of the card)**  
   Feel like a physical invite: less body copy, prominent card image.
   - Default: generate a card with canvas (bride + groom names), save as an image, include it in the RSVP page and guest email.
   - Admin can upload a real invitation image; that **replaces** the generated default.
   - Needs a dedicated image section on RSVP (and matching email layout).  
     Use the supplied invitation artwork as the design reference.

3. **Clarify wedding settings `status`**  
   Values today: **Planning**, **Date confirmed**, **Invitations sent**, **Completed**.  
   **What it actually does in code now:**
   - Saved as a field on the wedding row; shown as a badge on admin overview.
   - **Publish date** can bump `planning` → `date_confirmed`.
   - **RSVP closes** when status is `completed` (`isRsvpOpen`).
   - It does **not** send invites, publish the date, or drive most public UI. Date visibility is `date_published_at`; emails are separate.  
     **Open product question:** keep as a manual lifecycle, auto-derive from publish/invites, or remove the control so it is not confusing.

4. **New page block: text content**  
   Fields: **title** + **content** (not “description”). Reusable, not only “Our Story”. There is already a **Story** block (`title` + `body` textarea) with a hardcoded nav label “Story” — this is a new generic text block (multiple times; nav from title).  
   **Editor:** rich text (not a textarea). FCP backoffice has a Lexical editor we can slim down.  
   **Allowed:** headings 4–6, paragraphs, text align, bold, italic, underline, bullets, numbered lists, quote, indent / outdent.  
   **Blocked (clash with site theme):** headings 1–3, media / images, text colour, highlight colour, font family/size. Sanitize on save so paste cannot sneak those in. Public render uses existing wedding typography/tokens only.

5. **Image block nav (title is required)**  
   Use the **block title** as the in-page nav link. Today every image block is labelled **Photos** (`getPublicSectionNav`).
   - Title is **compulsory** (cannot save an image block without one).
   - That title is what appears in the public nav.
   - **Max length** so it fits the nav (working default: **24 characters**; lock the number when implementing). Validate in admin and schema.

6. **Image block lightbox**  
   Clicking the image opens a full-screen preview: keep aspect ratio (`object-contain`, not `object-cover`), max height = viewport.

7. **Registry — especially Amazon gift registry** — **superseded by the Oct 10 bank-transfer spec, then Amazon as a second pay option.** The old “paste a store link only” approach is not the first build.

### Bugs

1. **Guest invitation not reliable** — **fixed (Sep 10).** Drawer now keeps the guest open after save; Email invite uses the form email, saves first, then sends. Save is no longer blocked by native `type="email"` validation (`noValidate` + Zod).
2. **Admin route loader covers the whole page** — **reopened (Sep 27).** Sep 11 change (`shouldReload: false`, outlet spinner) is still showing a full-viewport loader with no sidebar. Sidebar must stay; only the content region loads.

---

## What was pending when the chat stopped (Aug 13)

### 1. Needs your testing (code landed, not signed off)

You asked to ship these while you slept. They exist in the repo. They were **not** re-checked with you after you woke.

| Item                    | What you should verify                                                                                                                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Themed guest emails** | Real Resend HTML uses the wedding theme (light palette on send). Theme picker preview should match.                                                                                                              |
| **Guest invite polish** | Single + bulk email, `invite_emailed_at`, Reply-To, photo-share confirm, clearer errors.                                                                                                                         |
| **Registry**            | Gift links + bank accounts + soft reserve.                                                                                                                                                                       |
| **Date publish**        | Saving a date does **not** email guests. Explicit publish + notify.                                                                                                                                              |
| **Admin chrome**        | Own palette (not public themes), sticky top bar, breadcrumbs, logout in header, Donate **center modal**, Feedback modal, super-admin **Backlog**.                                                                |
| **Public slug**         | `{bride}-{groom}-{year}` at create; UUID suffix if taken; Preview uses stored slug. Local DB must have migrations applied (`pnpm db:reset` or `npx supabase migration up`) or Preview stays missing/`undefined`. |
| **RSVP lock**           | After submit, guest cannot edit until admin unlocks. Duplicate names flagged; `admin_label` if you confirm they are different people.                                                                            |

### 2. Discussed, not built (still open)

- **Plus-one policy types** — you asked to discuss later: no extras / one plus-one / nuclear family only / any extras with a cap. Today it is only a **number** (`plus_ones`).
- **Announcement bar** — admin setting; hide when empty. Requested Aug 10.
- **Pick from Media** in Page Content (hero/image blocks still upload on their own).
- **Real header notifications** — bell is a placeholder.
- **Launch checklist** — production smoke test, Auth OTP templates, Resend domain, env, content freeze.

### 3. Explicitly deferred

| When          | Item                                                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Last v1 phase | Public-site **Motion** animations (discuss after other phases; CSS reveals already exist).                                                                                     |
| v2            | Typography picker.                                                                                                                                                             |
| v2            | Freemium / subscriptions (Donate / PayPal.Me stays for v1).                                                                                                                    |
| v2            | Wedding party block, multi-wedding platform, per-wedding `/{bride}/{groom}` routing, admin suspend, payment/seat limits. Activity logs are in the Sep 27 list, after registry. |

---

## Issues you noticed

Status is from the chat plus a code check on Aug 28. Items marked **fixed in code** still need a pass in the browser if you never re-tested them.

### Public website / hero

- Light-mode hero photo too washed out; `&` hard to read. Overlay was strengthened; **you never confirmed the last tweak.**
- Light vs dark: keep the photo visible in light mode; dark mode was fine.
- Overlay must use the **theme background colour** so text colour stays the same as a no-photo page.
- Celeste dark looked **black instead of navy** after adding a hero image. One pass was actually **Nocturne** selected by mistake; then you still wanted Celeste navy restored when a photo is present.
- Sticky public/landing navbar **darker than body/footer** until scroll. You wanted matching colour at rest, deeper only after scroll. First fix failed; follow-up was in progress.
- Details block with **two items**: grid looked off (text left-aligned is correct; the **block** should be centered).
- Landing **“View a wedding”** felt like leaking a private event. Link was removed from the landing page.

### Admin

- Public theme leaked into admin. Admin should be a **separate console look**, always light, not Celeste/Botanica/etc.
- Scroll felt janky; sticky top bar needed.
- Logout belonged in the top bar; Donate under Preview, not in the nav; Donate = **center modal**, not a page or drawer.
- Two “Feedback” entries: header = send feedback; sidebar (super admin only, last item) = **Backlog**.
- Theme picker: hero + RSVP email **stacked vertically** (not side by side), labelled “Preview / not live”, hero taller than the email mock.
- Preview Light/Dark **did not update**; full page refresh flashed admin into dark mode. Isolation was supposed to be complete.
- **404 flash** when changing admin routes (auth gate). Router was changed toward FCP-style redirect + pending outlet — **re-test.**
- Wedding settings: venue location dropdown **opened on load** without a click. Code now avoids opening on prefill.
- Country dropdown missing chevron; extra country-code field on phone when the country field already shows the code.
- Admins page briefly showed an error before loading.
- Native “Choose file / no file chosen” on uploads (later confirmed after refresh).
- Guests / photos copy too long; merge info + action; use Foundations tooltip; restore photo counts; “Invite guest” instead of “Email guests”.
- Tester (admin) feedback: batch of UI notes from screenshots around Aug 12, 11:12 PM — treat as a QA pass, not all captured as separate tickets.

### Media / albums

- Need delete, multi-select upload, multi-add to an album.
- Per-file upload tiles with progress (not one spinner for the whole batch); failed files visible per tile.
- Empty album showed a library photo as a fake “in album” preview. You wanted a **dotted empty state + Add photos**, plus a real album media manager (add/remove).

### Email / domain

- Resend test mode: can only send to your own address until a domain is verified.
- You registered **igbeyawowa.app**; DNS/Porkbun vs Vercel was in progress.
- Admin invites: need status, resend, templates, emails on accept / suspend / delete (super admin too). Archive deleted admins so the same email can be re-invited; uniqueness only on active `admin_profiles`.

### Local / ops

- Local Preview `localhost:3000/undefined` = missing `public_slug` (often local DB behind remote `db:push`).
- Lint failures appeared more than once after feature drops (last batch was fixed).

---

## Done in that thread (high level)

Phases **1–7** plus later slices: themes, auth, settings, page blocks, public site, guests, RSVP (token, plus-ones as a number, lock/unlock, WhatsApp share + email send as **separate** actions), media library, private photo shares, admin invites/archive, donate, feedback/backlog, themed emails, registry, date publish.

Guest WhatsApp is a **share URL**, not the same as “one Send button that picks email or WhatsApp.” If you still want a single channel picker, that is still open.

---

## Suggested next session

1. You check Nocturne dark, nav titles, and admin sidebar loading.
2. Then e-invitation: four theme-coloured designs (light and dark), preview, and put that image in the invite email.
3. Then the Oct 10 bank-transfer gift registry. Amazon on a gift comes after that.
4. Then footer, text block, lightbox, wedding status.
5. Older smoke-test / UI bugs / announcement bar. Motion still last.

Do not start Motion until you confirm the list above.
