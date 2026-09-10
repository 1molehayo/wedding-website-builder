# Ìgbéyàwówa — recovered progress (Aug 9–13, 2026)

Snapshot from the recovered chat ([Co creation discussion](a83c655c-b3ac-447b-b0bd-017ee56c5999)). Last agent work: **lint clean** (Aug 13, ~8:12 AM). You were going to test the overnight slice after a nap; that confirmation never happened.

v1 is **one wedding per deploy**. Product: Marvelous & Lillian. Domain direction: `igbeyawowa.app`.

---

## Sep 10, 2026 — new backlog (do not forget)

Logged after you reopened the project. Visual reference for the invitation card: the Marvelous & Lillian “Important communication” artwork (cream / navy / gold, florals, M | L).

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
   Title + paragraph (reusable, not only “Our Story”). There is already a **Story** block (`title` + `body`) with a hardcoded nav label “Story”. Confirm whether this is a new generic `text` block (multiple times, nav from title) or a Story improvement.

5. **Image block nav (title is required)**  
   Use the **block title** as the in-page nav link. Today every image block is labelled **Photos** (`getPublicSectionNav`).  
   - Title is **compulsory** (cannot save an image block without one).  
   - That title is what appears in the public nav.  
   - **Max length** so it fits the nav (working default: **24 characters**; lock the number when implementing). Validate in admin and schema.

6. **Image block lightbox**  
   Clicking the image opens a full-screen preview: keep aspect ratio (`object-contain`, not `object-cover`), max height = viewport.

7. **Registry — especially Amazon gift registry**  
   Registry UI exists (gift links + bank accounts + soft reserve) but **Amazon gift registry was never successfully tested**. Finish/verify that path.

### Bugs

1. **Guest invitation not reliable**  
   Guest content is not persistent. Send / Saved changes looks **disabled**. Adding an email did **not** send the invite. Investigate save vs send, form dirty/disabled state, and Resend.

2. **Admin route loader covers the whole page**  
   Navigating to another admin page shows a loader over **sidebar + content**. Loader should cover **content only**. Sidebar stays visible but **must not be clickable** while loading. (`AdminOutletPending` is outlet-sized in code — check if a parent `RoutePending` / full-shell pending is still wrapping the layout.)

---

## What was pending when the chat stopped (Aug 13)

### 1. Needs your testing (code landed, not signed off)

You asked to ship these while you slept. They exist in the repo. They were **not** re-checked with you after you woke.

| Item | What you should verify |
| ---- | ---------------------- |
| **Themed guest emails** | Real Resend HTML uses the wedding theme (light palette on send). Theme picker preview should match. |
| **Guest invite polish** | Single + bulk email, `invite_emailed_at`, Reply-To, photo-share confirm, clearer errors. |
| **Registry** | Gift links + bank accounts + soft reserve. |
| **Date publish** | Saving a date does **not** email guests. Explicit publish + notify. |
| **Admin chrome** | Own palette (not public themes), sticky top bar, breadcrumbs, logout in header, Donate **center modal**, Feedback modal, super-admin **Backlog**. |
| **Public slug** | `{bride}-{groom}-{year}` at create; UUID suffix if taken; Preview uses stored slug. Local DB must have migrations applied (`pnpm db:reset` or `npx supabase migration up`) or Preview stays missing/`undefined`. |
| **RSVP lock** | After submit, guest cannot edit until admin unlocks. Duplicate names flagged; `admin_label` if you confirm they are different people. |

### 2. Discussed, not built (still open)

- **Plus-one policy types** — you asked to discuss later: no extras / one plus-one / nuclear family only / any extras with a cap. Today it is only a **number** (`plus_ones`).
- **Announcement bar** — admin setting; hide when empty. Requested Aug 10.
- **Pick from Media** in Page Content (hero/image blocks still upload on their own).
- **Real header notifications** — bell is a placeholder.
- **Launch checklist** — production smoke test, Auth OTP templates, Resend domain, env, content freeze.

### 3. Explicitly deferred

| When | Item |
| ---- | ---- |
| Last v1 phase | Public-site **Motion** animations (discuss after other phases; CSS reveals already exist). |
| v2 | Typography picker. |
| v2 | Freemium / subscriptions (Donate / PayPal.Me stays for v1). |
| v2 | Wedding party block, multi-wedding platform, per-wedding `/{bride}/{groom}` routing, activity logs, admin suspend, payment/seat limits. |

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

1. **Fix Sep 10 bugs:** guest invite save/send + disabled button; admin loader overlay (content only, sidebar inert).
2. Footer: remove “Built with Ìgbéyàwówa”; keep © line.
3. Image block: required title (max ~24 chars) as nav + lightbox (`object-contain`, viewport max height).
4. Text content block (title + paragraph).
5. RSVP/email invitation card image (generated default + admin upload replace).
6. Explain or simplify wedding **status**.
7. Registry: test Amazon gift-registry flow.
8. Then older smoke-test / UI bugs / announcement bar. Motion still last.

Do not start Motion until you confirm the list above.
