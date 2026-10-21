# Wedding Website Builder

Whitelabel wedding website + admin, built by **Onemole**.

**v1 (current):** one deploy = one wedding. Couple facts, themes, and page blocks live in Supabase; product chrome is Onemole.

**v2 (planned):** generate and host **multiple** live wedding websites from one platform — see [Future plan](#future-plan).

Built as a single **TanStack Start** (React + TypeScript) application. Production hosting is **Vercel**. Data/auth/storage use **Supabase**; Auth OTP email uses **Resend** (custom SMTP).

> **Product principle:** a wedding date is optional. The site must remain fully usable with `weddingDate = null`. Never invent a placeholder date.

> **Naming:** **Wedding Website Builder** / **Onemole** = product. **Groom** and **bride** names = this wedding (Wedding settings). Do not hardcode the couple into the admin product chrome.

## Stack

- React 19 + TypeScript
- TanStack Start (SSR + server functions) + Nitro (Vercel-compatible)
- Tailwind CSS v4 + Significa Foundations primitives (admin)
- Public themes: Celeste, Botanica, Rosewater, Nocturne (each light + dark)
- Typography: Cormorant Garamond + Inter
- Supabase (Postgres, Auth, Storage) + RLS
- Vitest, ESLint, Prettier, mise (Node 22.22.1 / pnpm 10.28.0)
- GitHub Actions CI (no deploy job — Vercel handles production)

Useful routes:

- `/` — Igbeyawowa landing
- `/$weddingSlug` — public wedding site (e.g. `/lillian-marvelous-2026`)
- `/design` — design showcase
- `/admin/login` — admin sign-in
- `/admin` — protected overview
- `/admin/settings` — wedding settings (groom, bride, date, venue, theme, public URL slug)
- `/admin/pages` — page content blocks (hero, story, image, details)
- `/admin/guests` — guest list, RSVP status, themed invite email / WhatsApp / copy `/rsvp/$token`
- `/admin/registry` — gift items (external links) + cash/bank accounts; soft guest reserve
- `/rsvp/$token` — public guest RSVP form (tokenized; no login)
- `/admin/admins` — invite/resend/cancel/delete admins; deletion requests (super admin only)
- `/admin/invite/$token` — accept admin invite link from email
- `/admin/profile` — name, optional phone; email editable for super admin only
- `/admin/support` — admin → super admin email (hidden for super admin)

## Prerequisites

- [mise](https://mise.jdx.dev/) (recommended — pins Node + pnpm via `mise.toml`)
- Docker Desktop (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npx supabase` works if not installed globally)

Pinned toolchain (see `mise.toml` and `package.json`):

- Node.js `22.22.1`
- pnpm `10.28.0`

## Local setup

```bash
mise install
mise trust  # first time in this repo
pnpm install
cp .env.example .env
# For local Mailpit OTP: also create `.env.local` with keys from `pnpm status`
pnpm supabase:start
pnpm db:reset   # first time / after migration changes
pnpm dev
```

App: [http://localhost:3000](http://localhost:3000)  
Mailpit (local OTP emails): [http://127.0.0.1:54324](http://127.0.0.1:54324)

### Useful pnpm scripts

| Script                | What it runs                                                    |
| --------------------- | --------------------------------------------------------------- |
| `pnpm status`         | `supabase status` (API URL, keys, Mailpit)                      |
| `pnpm supabase:start` | Start local Supabase                                            |
| `pnpm supabase:stop`  | Stop local Supabase                                             |
| `pnpm db:reset`       | Reset **local** DB + apply migrations/seed                      |
| `pnpm db:link`        | Link CLI to cloud project ref from `.env` → `VITE_SUPABASE_URL` |
| `pnpm db:push`        | Link from `.env`, then push migrations to cloud                 |

### Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Whitelabel: launch checklist for a new wedding (v1)

v1 is **one codebase deploy → one couple**. To ship another wedding, you typically clone/fork or re-deploy with a new Supabase project + Vercel project, then walk this list.

Couple-facing copy in the **app** comes from the DB (Wedding settings + page blocks). Several **dashboard** values are still couple-specific and must be updated by hand.

### A. Code / repo (usually once per product; change per couple only if needed)

| What                                       | Where                                                               | Notes                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Product name / tagline                     | `src/lib/constants.ts` (`PRODUCT_*`)                                | Keep as Onemole product branding unless white-labeling the builder itself |
| Production super admin email               | `src/lib/auth/roles.ts` → `PRODUCTION_SUPER_ADMIN_EMAIL`            | Who can bootstrap `/admin` on first login                                 |
| Local OTP email subject                    | `supabase/config.toml` → `[auth.email.template.magic_link].subject` | e.g. `Marvelous & Lillian Wedding`                                        |
| Local OTP email body                       | `supabase/templates/magic_link.html`                                | Keep `{{ .Token }}` — do not replace with a real code                     |
| Seed couple                                | `supabase/seed.sql`                                                 | Local resets only (`db:reset`). Cloud uses **onboarding**, not seed.      |
| Fallback couple (DB down / no wedding yet) | `src/lib/wedding/public-settings.ts` → `FALLBACK_PUBLIC_WEDDING`    | Public site only until onboarding creates a row                           |

### B. Supabase Dashboard (cloud project for this wedding)

| What                         | Where                                                                | Set to                                                                                 |
| ---------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Site URL                     | **Authentication → URL Configuration**                               | Production site origin, e.g. `https://your-site.vercel.app` (include `https://`)       |
| Redirect URLs                | same page                                                            | Same production origin (+ preview URLs if needed)                                      |
| Email provider               | **Authentication → Providers → Email**                               | Enabled                                                                                |
| Custom SMTP                  | **Project Settings → Authentication → SMTP** (or Resend integration) | **Required** to edit Auth email templates on hosted Supabase                           |
| Magic link / OTP **subject** | **Authentication → Emails → Magic link or OTP**                      | Couple wedding title, e.g. `Marvelous & Lillian Wedding`                               |
| Magic link / OTP **body**    | same template                                                        | OTP-only HTML (see below). Must include `{{ .Token }}`                                 |
| Migrations                   | CLI: `pnpm db:push` after `pnpm db:link` (or SQL editor)             | Apply all `supabase/migrations/*` including `page_blocks`, `groom_name` / `bride_name` |
| Wedding row                  | Admin UI after login, or seed                                        | Groom, bride, theme, venue, page blocks                                                |

**OTP email body (hosted template):**

```html
<h2>Your admin sign-in code</h2>
<p>Use this one-time code to sign in:</p>
<p style="font-size: 28px; font-weight: 700; letter-spacing: 0.2em">
  {{ .Token }}
</p>
<p>This code expires in 1 hour and can only be used once.</p>
```

Leave `{{ .Token }}` exactly as written. Subject is where the couple name belongs (Resend/Supabase cannot pull groom/bride from our DB for Auth emails).

### C. Resend

| What               | Where                                                                 | Notes                                                                                  |
| ------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Account + API key  | [resend.com](https://resend.com)                                      | Used as Supabase Auth SMTP password                                                    |
| Sending domain     | Resend → Domains                                                      | Use a domain you control (`example.com`), **not** `*.vercel.app`                       |
| Sender identity    | Supabase SMTP “Sender email”                                          | Must be allowed by Resend (verified domain, or `onboarding@resend.dev` for tests only) |
| SMTP into Supabase | Host `smtp.resend.com`, port `465`, user `resend`, password = API key | Unlocks editable Auth templates                                                        |

Resend does **not** store the OTP subject/body — those live in **Supabase Email Templates**. Resend only delivers whatever Supabase sends.

### D. Vercel

| What     | Where                                      | Notes                                                                                                                           |
| -------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Project  | linked to this GitHub repo                 | One Vercel project per wedding site in v1                                                                                       |
| Env vars | Project → Settings → Environment Variables | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (Sensitive) for **this** wedding’s Supabase project |
| Domain   | Domains                                    | Temporary `*.vercel.app` is fine; custom domain later                                                                           |

Do **not** point production at local Mailpit keys.

### E. After first deploy — in-app

1. Open `/admin/login` → send OTP → enter the code from email (not a magic link). Hosted Supabase often uses **8** digits; local Mailpit uses **6**.
2. Confirm **Wedding settings**: groom, bride, date (or empty), venue, dress code, theme.
3. Confirm **Page content** blocks and public `/`.
4. Invite additional admins from **Admins** if needed.

### Quick “new couple” pass

When reusing this product for another wedding:

1. New Supabase project + push migrations
2. New (or retargeted) Vercel project + env keys
3. Resend SMTP connected on that Supabase project
4. Auth **Site URL** / redirects = that site’s URL
5. Auth email **subject** = `{Groom} & {Bride} Wedding`
6. Auth email **body** = OTP template with `{{ .Token }}`
7. Update `PRODUCTION_SUPER_ADMIN_EMAIL` if a different owner should bootstrap
8. Update local `config.toml` subject + `seed.sql` if you care about local parity
9. Sign in → set groom/bride/content in admin

## Supabase

### Environment variables

| Name                            | Where            | Purpose                                                                                                                 |
| ------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`             | browser + server | Project URL                                                                                                             |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser + server | Publishable key (`sb_publishable_…`)                                                                                    |
| `SUPABASE_SECRET_KEY`           | **server only**  | Secret key (`sb_secret_…`) for privileged ops (first-login admin profile)                                               |
| `RESEND_API_KEY`                | server (required for guest/admin app mail) | App transactional email via Resend SDK: guest RSVP invites, photo-share links, admin invites, support. **Separate** from Auth OTP (that uses Resend as **Supabase custom SMTP**) |
| `RESEND_FROM_EMAIL`             | server optional                            | From identity for app-sent mail (verified domain). Defaults to Resend onboarding sender for tests                                                                                 |
| `APP_URL`                       | server                                     | Public origin for RSVP/photo/admin invite links in emails (defaults to `http://localhost:3000`)                                                                                   |
| `EMAIL_DELIVERY_ENABLED`        | server optional                            | Set `false` to skip outbound app emails (logs instead)                                                                                                                            |

Never put the secret key in a `VITE_` variable. Mark it Sensitive in Vercel.

### Local stack

```bash
npx supabase start
npx supabase db reset   # applies migrations + seed
npx supabase status     # copy URL + keys into .env
```

Local Auth has `enable_signup = false`. Local OTP uses Mailpit + `supabase/templates/magic_link.html` (no Resend required locally).

**Local Mailpit auth** (when `.env.local` points at `127.0.0.1`):

| Email                     | Role        |
| ------------------------- | ----------- |
| `superadmin@supabase.com` | Super admin |
| `admin@supabase.com`      | Admin       |

1. `pnpm supabase:start` then `pnpm db:reset` (first time / after migrations)
2. `pnpm dev` — login badge should say **Local · Mailpit**
3. Sign in with one of the emails above → copy OTP from [Mailpit](http://127.0.0.1:54324)

**Production / cloud auth** (`.env` cloud URL, no local override):

1. Super admin email is hardcoded in `src/lib/auth/roles.ts` (`PRODUCTION_SUPER_ADMIN_EMAIL`)
2. First login creates the **admin profile only** (no fake wedding row). `wedding_id` may be null.
3. **Super admin** may navigate without a wedding (empty states, invite admins) and can **skip** onboarding.
4. **Regular admins** are always redirected to `/admin/onboarding` until a wedding exists — route guards **and** server functions (`requireWeddingSession`) enforce this (client bypass is not enough).
5. Onboarding requires **groom + bride**; date/venue/dress/theme are optional. Completing it creates the wedding and links all profiles with null `wedding_id`.
6. Invite other admins from **Admin → Admins**
7. Enable Email provider + custom SMTP (Resend) + OTP template (see checklist above)

### Security model

- Public self-signup disabled (local config + production setting)
- Admin sign-in is **email + OTP** (6–8 digits; no passwords for admins)
- Admin routes gated in `beforeLoad` via `getAdminSession()`
- Roles: `super_admin` (production hardcoded email) vs `admin`
- Only super admin can invite/remove admins (`/admin/admins`)
- Regular admins can edit wedding settings / content CRUD
- OTP is only sent to authorized emails (super admin or invited)
- Server functions use cookie session (`@supabase/ssr`)
- Privileged ops use `SUPABASE_SECRET_KEY` only on the server
- RLS: authenticated admins can read/update `weddings` / `admin_profiles`
- Storage bucket `photos` is private; admin-only object policies
- `wedding_date` is nullable from the first migration

## Docker (portable runtime)

Production deploys natively on Vercel. The `Dockerfile` is for reproducible Node/Nitro runs:

```bash
docker build -t wedding-website-builder .
docker run --rm -p 3000:3000 wedding-website-builder
```

## Deployment

1. Feature branch → push → GitHub Actions CI
2. Pull request / review
3. Merge to `main`
4. Vercel Git integration deploys production automatically
5. Confirm cloud migrations + Auth/Resend checklist before relying on `/admin`

### Finding error logs

Route/page errors show a **Reference** id on screen (e.g. `err_…`). Use that to find the matching technical log.

| Where | What you’ll see |
| ----- | --------------- |
| **Browser DevTools → Console** | FE `[RouteError] err_…` plus a structured object (code, status, technical message, cause, stack) |
| **Vercel → Project → Logs** | Same `errorId` from SSR/server throws and from FE via `reportClientError`. Search/filter for the Reference id. Logs are JSON lines with `errorId`, `code`, `status`, `message`, `source` (`ssr` / `server` / `client`), `causeMessage`, stacks |
| **Supabase → Logs** | Auth, API, and Postgres platform events. App code that catches Supabase failures also re-logs them to Vercel with a technical message + cause |

Public UI copy stays friendly. Technical detail is only in logs (and never in the user-facing title/body).

### Wedding settings (Phase 4)

Admins edit structured facts at `/admin/settings`:

- Groom and bride names
- Optional wedding date (`null` = date to be announced). Draft dates stay private until **Publish date** sets `date_published_at`
- Status, venue name/location, dress code
- Active public theme (Celeste / Botanica / Rosewater / Nocturne)

### Page content (Phase 4b)

Admins edit ordered home-page blocks at `/admin/pages`:

- Block types: `hero`, `story`, `image`, `details`
- Up/down reorder, add/remove, save whole `page_blocks` JSONB array
- Public `/` renders blocks via `DynamicBlock`
- Image blocks store a path in the private `photos` bucket; signed URLs for admin preview and public render

After pulling migrations: `pnpm db:reset` (local) or `pnpm db:push` (cloud, once linked).

## Project layout

```text
src/
  routes/admin/     # login, overview, settings, pages, admins
  lib/supabase/     # browser / server / admin clients
  lib/auth/         # session server functions
  lib/wedding/      # public settings + updateWedding
  lib/page-blocks/  # page_blocks types, validation, server fns
  components/blocks # public DynamicBlock renderers
  components/ui/    # Foundations primitives (+ toaster)
supabase/
  migrations/       # schema history
  seed.sql          # default wedding row (local)
  templates/        # local Auth email (OTP)
```

## Implementation phases (v1)

| Phase | Focus                                                             |
| ----: | ----------------------------------------------------------------- |
|     1 | Bootstrap, local infra, CI                                        |
|     2 | Design foundation / wedding tokens                                |
|     3 | Supabase schema + admin auth                                      |
|     4 | Wedding settings editing                                          |
|    4b | Page blocks CMS                                                   |
|     5 | Public wedding website polish                                     |
|     6 | Guest list admin                                                  |
|     7 | RSVP                                                              |
|     8 | Guest email (themed Resend invites + photo shares)                 |
|     9 | Registry (gift links + bank accounts + soft reserve)              |
|    10 | Date publish (draft date + publish + guest notify) — current      |
|    11 | Motion / launch polish                                            |

Guest invite, photo-share, and date-announced emails inherit the wedding’s active public theme (light palette for deliverability). Auth OTP templates remain separate (Supabase SMTP).

**Date publish:** saving `wedding_date` alone does not show it publicly. Publish sets `date_published_at` and can email previously invited guests. Until then the public site stays “Date to be announced”.

Do not start the next phase until the previous phase is merged and confirmed.

## Future plan

| Version | Goal                                                                                                                                                                                                                                                                   |
| ------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  **v1** | Single wedding per deploy (this repo). Whitelabel by reconfiguring Supabase / Resend / Vercel / seed + admin content.                                                                                                                                                  |
|  **v2** | Multi-wedding platform: create many live wedding websites from one product (tenancy, per-wedding domains, shared admin/builder, provisioning). Auth email subjects/templates and super-admin bootstrap must become data-driven instead of per-project dashboard edits. Also: activity logs, support tickets inbox, **admin suspend**, payment/seat limits. |

Track v2 explicitly so we do not bolt multi-site onto v1 accidentally. Until then, treat each production wedding as its own Supabase + Vercel surface and use the [launch checklist](#whitelabel-launch-checklist-for-a-new-wedding-v1).

## License

This project is licensed under the **GNU General Public License version 3 only** (`GPL-3.0-only`). See [`LICENSE`](./LICENSE) for the full license text.

Admin UI primitives and related helpers include code **adapted from [Significa Foundations](https://github.com/significa/foundations)** ([foundations.significa.co](https://foundations.significa.co)), which Significa documents as GPL-3.0. See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) for attribution and known file locations. We do not claim authorship of the Significa Foundations components.
