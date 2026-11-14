# Ìgbéyàwówa — product progress

This is the technical source of truth for current delivery status. For a
plain-English product walkthrough and QA scenarios, see
[QA product guide](./qa-product-guide.md).

v1 supports **one wedding per deployment**. Local/demo samples use the
fictional couple **Theo & Ada**.

- Production: [igbeyawowa.app](https://www.igbeyawowa.app/)
- Demo / staging: [demo.igbeyawowa.app](https://demo.igbeyawowa.app)
  (Vercel project `igbeyawowa-demo`, Supabase project `igbeyawowa-demo`,
  Git branch `demo`)

Do not add test data on production.

## Current snapshot — Nov 14, 2026

- Branch: `main`
- Demo / staging: [demo.igbeyawowa.app](https://demo.igbeyawowa.app)
- Production: [igbeyawowa.app](https://www.igbeyawowa.app/)

### Shipped in the application

- Four themed public wedding sites with configurable page blocks, saved-draft
  preview, publishing, SEO metadata, responsive images and videos, and image
  lightboxes.
- Passwordless admin sign-in, onboarding, `super_admin` and `admin` roles,
  invitations, profile management, and account deletion requests.
- Guest management, individual/bulk invitation email, WhatsApp sharing,
  private RSVP links, plus-ones, RSVP lock/unlock, and date publication.
- Private media library, albums, assigned guest access, email shares, personal
  links, QR codes, open tracking, and full-screen viewing.
- Gift registry with multi-currency gift prices, accepted bank accounts, direct
  donations, live FX with a locked contribution rate, guest confirmation,
  reminders, transfer audit, and manually recorded Amazon purchases.
- Activity history, admin notification inbox, optional public announcement bar,
  feedback backlog, support email, privacy page, and cookie page.
- Rich-text content blocks sanitized on save/render without a browser-only DOM
  dependency.
- Comma-separated `PRODUCTION_SUPER_ADMIN_EMAIL` support for multiple bootstrap
  super admins.
- Page content supports Hero, Story, Text, Image, Video, and Details blocks.
  Hero media supports desktop/mobile images or videos; Image and Video remain
  separate responsive block types.

### On `main`; verify after deployment

- Compact searchable currency/amount field in admin and public registry forms.
- Drawer-hosted modal layering so feedback and confirmation dialogs remain
  usable when opened from a side drawer.
- Production HTML sanitization fix that avoids the previous server runtime
  `xhr-sync-worker.js` failure.
- Public mobile section nav auto-centers the active item with edge fades and
  skips yanking the strip while the guest is dragging it.
- WhatsApp guest invites include the same essentials as email (website, date,
  RSVP, optional invitation image and photos link).
- Registry gift UX: Amazon Share/registry/guest-view URLs accepted; clear
  required/optional labels; gift price currencies limited to enabled bank
  account currencies; multi same-currency account chooser on Send money;
  compact live FX equivalent under the amount field.
- Gift contribution currency and phone-country defaults use the visitor's
  location when a matching enabled account exists. Returning to a gift's base
  currency restores its original amount.
- Guest invitation email and WhatsApp copy include all captured guest details,
  including private notes where appropriate.
- Sidebar and Overview use **View website** for the live site. Saved-draft
  **Preview website** is available only from Page content.
- The notification bell links to a paginated Notifications page containing
  both read and unread updates.
- Public section tracking no longer rewrites the URL during natural scrolling,
  and tall sections can become active without viewport jumps.

### Environment verification

| Environment | Code status                                        | Database/migrations                               | Manual QA                                          |
| ----------- | -------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| Local       | Current worktree available                         | Check before testing data-dependent flows         | Required for recent UI changes                     |
| Demo        | [demo.igbeyawowa.app](https://demo.igbeyawowa.app) | Confirm all Nov 9 migrations on `igbeyawowa-demo` | Prefer this URL over legacy `*.vercel.app` aliases |
| Production  | [igbeyawowa.app](https://www.igbeyawowa.app/)      | Do not infer from local/demo state                | Keep free of test data                             |

Relevant migrations include registry contributions/activity, Amazon listings,
admin notifications, `weddings.announcement_text`, and
`20261113030000_hero_video_storage.sql` for MP4/WebM page media. Record the
actual applied migration state here after each deployment rather than assuming
that a successful code deploy applied it.

### Remaining product work

1. **Super-admin import/export** — move a wedding between environments,
   including settings, page content, media references, guests, and registry
   data. Define privacy and conflict rules before implementation.
2. **Wedding status decision** — today status is mostly an admin badge;
   `completed` closes RSVP. Decide whether status stays manual, is derived from
   events, or is removed.

### Optional backlog

- Richer plus-one policy types (today it is a number).
- Pick an existing Media item from Page Content.
- Additional public-site motion, with reduced-motion support.
- Later platform work: typography picker, subscriptions, multi-wedding
  tenancy, per-wedding domains, wedding-party block, admin suspension, and
  payment/seat limits.

### Recent changes

- Nov 14: responsive Image and separate Video blocks; responsive hero media;
  location-aware contribution defaults; gift base-currency reset; more
  prominent gift prices; live-site versus draft-preview action separation;
  complete guest details in email/WhatsApp invites; stable public section
  scrolling.
- Nov 12: Public announcement bar (`weddings.announcement_text`); TanStack
  Query for admin lists, notification bell, contribute FX quotes, and address
  search; FX subscribe + unavailable alert; Amazon optional docs; mobile nav
  auto-center; WhatsApp invite parity; multi-account chooser.
- Nov 9: registry contribution, FX, reminders, Amazon recording, activity log,
  notification inbox, legal pages, image lightbox, and rich-text block.
- Nov 9: compact currency selector, nested modal/drawer fix, server sanitizer
  fix, and multiple production super-admin emails.

---

## Archived specifications and recovery notes

The sections below preserve product decisions and earlier QA observations.
They are **historical context**, not the current delivery status. When an old
statement conflicts with the snapshot above or the current code, use the
snapshot above.

## Oct 10, 2026 — bank-transfer gift registry

Source of truth for the guest and admin money rules. Confirmed in chat. Implement bank transfer before Amazon. The table shape is amended by [Nov 8 — one ledger](#nov-8-2026--one-ledger-then-amazon-and-later-stores): do not create a bank-only transfers table.

Today the registry is gift links, bank accounts, and a soft reserve. Cash is “show the account.” This replaces that guest path with a tracked transfer. Keep the couple’s bank accounts as the details we show. Do not take card payments in the app.

A guest can give in two ways:

- **Toward a gift.** Several people can contribute to the same gift. The same person can contribute to it more than once.
- **Straight to the bank account**, with no gift chosen. That donation does not change any gift’s remaining amount.

Both use the same transfer, confirmation, thank-you, and admin audit. Amazon is a later second option on a gift only: pay on Amazon, or send money this way.

### Gift

Fields: photo, title, an optional link to the product online, and **one** price (amount + currency). The link is so guests can see the gift. It is not how they pay.

Guests pay in a currency that has an enabled bank account (including NGN). Live FX (Frankfurter, with open.er-api fallback) converts their amount into the gift base currency. The rate used for that payment is **locked** on the contribution (`fx_rate`, `amount_base`, `base_currency`, `fx_locked_at`, `fx_source`). Remaining is tracked only in the gift base currency via locked `amount_base` sums. Admin amount edits keep the locked rate and recalculate `amount_base`. A direct donation still has a currency, and it does not change a gift.

Example: gift is 100 USD. Guest pays in NGN at a locked 1346.61 NGN per 1 USD. Sending 67,330.50 NGN locks `amount_base` ≈ 50 USD, so 50 USD remains. Later FX moves do not change that payment.

On the public gift, show the base original and amount left. Amount left changes only after the guest confirms they sent the money, and only for transfers that are not **Not received**. Use the admin-adjusted amount when the admin has changed it. **Not received** puts that share back. Marking it **Received** again takes it off again.

The gift is still open while base remaining is above zero. When the money covers the price, the gift is complete. If the total runs over, that is fine. The page only needs to show that a gift is still short.

### Transfer status

Label every transfer with one of these:

| Status           | When                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| **Pending**      | The guest has started the transfer. It stays pending until the admin settles it.                         |
| **Received**     | The admin confirms the money arrived.                                                                    |
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

- Amazon pay-on-a-gift (next, after this). A test Amazon.com wedding list was started on a personal account so group gifting can be checked. Do not treat that list as the couple’s. The contribution row must already have `channel`, `provider`, and `external_ref` so that slice is an insert, not a new ledger.
- In-app card checkout.
- Scraping or calling Amazon for registry items.
- A plugin framework per store. A new store is a `provider` value and, when it has its own fields, one detail table. It is not a new way to compute amount left.

---

## Nov 8, 2026 — one ledger, then Amazon and later stores

Bank transfer ships first. Amazon ships second. Other stores (Target, a local shop, anything with a link or a later API) must be able to land without a second money model.

**One row changes a gift’s remaining amount: `registry_contributions`.** Bank details do not live on that row. A store name never appears in the remaining-amount function.

Phase 1 schema is in `supabase/migrations/20261108230000_registry_contributions_and_activity_logs.sql` (applied locally). `recordActivity` is in `src/lib/activity/activity.server.ts`. Phase 2 admin gift form is in the registry drawer: photo, optional product link, and a currency/price list. Saving a gift or bank account writes an activity row. Deleting a gift that already has a contribution is blocked on purpose.

**Guest bank path (Nov 9, in code):** public Contribute / Donate drawer → start contribution + confirm email → bank details with reference → `/registry/confirm/$token` thank-you (confetti, thank-you email, `applied_at`). Remaining prices use listed-price ratios.

**Admin transfer audit (Nov 9, in code):** Registry → Transfers tab. Audit drawer: edit amount, mark Received / Not received / back to Pending, mailto + WhatsApp when Not received. Activity rows written on amount/status changes.

**Confirm reminders (Nov 9, in code):** Daily cron `GET/POST /api/cron/registry-reminders` (Bearer `CRON_SECRET`, `vercel.json` at 14:00 UTC). Up to 3 emails, one day apart, stop when `applied_at` is set. Activity `system.reminder_sent`.

**Activity logs (Nov 9, in code):** Admin → Activity (filters: area, actor role, email, date). `recordActivity` / `recordAdminActivity` wired for guests, registry, pages, media/shares, settings, profile, admins, feedback, auth login/logout, and system reminder/thank-you.

**Amazon on a gift (Nov 9, in code):** `registry_item_listings` migration. Admin gift form Amazon link. Public “Buy on Amazon” + bank Contribute. Transfers → Record Amazon (external_store, applied immediately as Received). No Amazon API/webhooks. Apply migration `20261109010000_registry_item_listings.sql`.

### Contribution

| Column                         | Use                                                                                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wedding_id`                   | Always set.                                                                                                                                                                                                               |
| `gift_id`                      | Null for a direct bank donation. Set when the money is toward a gift.                                                                                                                                                     |
| `channel`                      | `bank_transfer` now. `external_store` when Amazon or another platform is the one that took the money. Add a channel only when the flow is actually different.                                                             |
| `provider`                     | Null for the bank. `amazon` later, then the next store’s slug. Free text with an allow-list in app code, so a new store is not a migration.                                                                               |
| `amount`, `currency`           | What counts. Admin edits this amount, in the paid currency.                                                                                                                                                               |
| Payer `name`, `email`, `phone` | Same rules as Oct 10. Phone optional.                                                                                                                                                                                     |
| `status`                       | `pending`, `received`, `not_received`. Same three labels for every channel.                                                                                                                                               |
| `applied_at`                   | When this row starts reducing the gift. Bank: set when the guest confirms they sent the money. External store: set when we accept the purchase (admin entry, or a webhook later). Null means it does not reduce the gift. |
| `external_ref`                 | Nullable. Store order id or listing id when we have one.                                                                                                                                                                  |
| `listing_url`                  | Nullable. The page we sent the guest to.                                                                                                                                                                                  |

A row reduces the gift when `applied_at` is set and `status` is not `not_received`. **Not received** clears that effect. **Received** again puts it back. Overfunding stays allowed. Ratio math from the Oct 10 prices is unchanged and does not read `provider`.

### Bank-only detail

`registry_contribution_bank`, one-to-one with a contribution whose channel is `bank_transfer`:

- bank `account_id`
- public transfer reference
- confirm token
- reminder count and last reminder time

Amazon rows never get a confirm token or a reminder. A later store with its own extra fields gets its own detail table the same way (`registry_contribution_amazon` only if Amazon needs columns the shared row does not have). Until then, `provider` + `external_ref` + `listing_url` is enough.

### What a later store is

A **listing** on the gift (`provider`, `url`, label) is a way out to that store. A listing does not change amount left. Only a contribution does. This build keeps the optional product link on the gift as the browse link. The listings table waits for the Amazon slice.

This build writes `channel = bank_transfer` only. No Amazon API, no webhooks, no per-store plugins.

---

## Nov 8, 2026 — admin activity logs

Append-only record of what people do in the admin and on the guest flows the admin has to answer for. Build it with the registry, not as a later project.

### Row

`activity_logs`:

- `wedding_id` — null only for a platform action that is not about one wedding (super-admin feedback triage).
- `actor_id` — admin user when there is one. Null for a guest or a cron job.
- `actor_email` snapshot and `actor_role`: `admin`, `super_admin`, `guest`, `system`. The email is copied at write time so a removed admin still shows up. Removed admins stay archived for this reason.
- `action` — `area.verb`, for example `guest.invited`, `registry.contribution_received`.
- `entity_type` and `entity_id`
- `summary` — one line for the list.
- `metadata` jsonb — ids and the fields that changed. Never a secret, a session, a full bank account number, or a confirm token. Account numbers in metadata are last four digits only.
- `created_at`

The app does not update or delete these rows.

### What gets a line

Mutations and sends. Not page views, not list loads, not every keystroke.

| Area     | Actions                                                                                                                                             |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guests   | create, update, delete, invite email, WhatsApp share                                                                                                |
| Registry | gift create/update/delete, price change, account create/update/delete, contribution started, guest confirmed, amount edited, received, not received |
| Pages    | draft save, publish, restore version                                                                                                                |
| Media    | upload, delete, album add/remove, share create/revoke                                                                                               |
| Settings | wedding settings save, date publish/unpublish, invitation card regenerated                                                                          |
| Profile  | profile update, account deletion requested                                                                                                          |
| Admins   | invite, resend, cancel, accept, remove                                                                                                              |
| Feedback | submitted (the super-admin trail)                                                                                                                   |
| System   | reminder email sent, thank-you email sent                                                                                                           |

Login and logout: one line each. Skip failed-password noise until we have a real lockout story.

### Who can read it

A wedding admin sees their wedding. A super admin sees every wedding, plus platform rows. The page is a filterable list (area, actor, date), newest first. No export in this slice.

### How it lands in the build

Phase 1 of the registry migration adds `activity_logs` and a server helper `recordActivity`. Registry phases call it on every write. The admin page ships in that same effort. After the guest bank path works, wire the other areas in the table above before calling the registry done. Old actions from before the table exists are not backfilled.

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
   **Editor:** rich text (not a textarea).  
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
2. **Admin route loader covers the whole page** — **fixed (you confirmed Nov 9).** Sidebar stays; only the content region loads.

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
- **Pick from Media** in Page Content (hero/image blocks still upload on their own).
- **Launch checklist** — production smoke test, Auth OTP templates, Resend domain, env, content freeze.

### 3. Explicitly deferred

| When          | Item                                                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Last v1 phase | Public-site **Motion** animations (discuss after other phases; CSS reveals already exist).                                                                                                 |
| v2            | Typography picker.                                                                                                                                                                         |
| v2            | Freemium / subscriptions (Donate / PayPal.Me stays for v1).                                                                                                                                |
| v2            | Wedding party block, multi-wedding platform, per-wedding `/{bride}/{groom}` routing, admin suspend, payment/seat limits. Activity logs moved to the Nov 8 spec and ship with the registry. |

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
- **404 flash** when changing admin routes (auth gate). Router uses redirect + pending outlet — **re-test.**
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

Build from **Features still left to build** in the Sep 27 backlog (top of this file):

1. Super-admin import / export
2. Wedding settings `status` decision

Then optional: plus-one policy types, announcement bar, pick-from-media. Motion last. Have a lawyer review `/privacy` and `/cookies` before you treat them as final for production. Set up `hello@igbeyawowa.app` forwarding (Cloudflare Email Routing or ImprovMX) when ready.
