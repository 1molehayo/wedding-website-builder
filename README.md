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
- `/$weddingSlug` — public wedding site (e.g. `/ada-theo-2026`)
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

## Development Environments

This repo supports **two independent local environments** in one clone. They use different env files, ports, and Docker/Supabase stacks so credentials and data never mix.

|                          | Regular Development Environment                      | Demo Development Environment                                    |
| ------------------------ | ---------------------------------------------------- | --------------------------------------------------------------- |
| Start app                | `pnpm dev` → [localhost:3000](http://localhost:3000) | `pnpm dev:demo` → [localhost:3001](http://localhost:3001)       |
| Env file (intended)      | `.env.local`                                         | **Only** `.env.demo` (never reads `.env` / `.env.local`)        |
| Example template         | `.env.example`                                       | `.env.demo.example`                                             |
| Local Supabase           | `pnpm supabase:start` (ports 54321+)                 | `pnpm supabase:demo:start` (ports 54331+, workdir `demo-stack`) |
| Mailpit                  | [127.0.0.1:54324](http://127.0.0.1:54324)            | [127.0.0.1:54334](http://127.0.0.1:54334)                       |
| Stop stack               | `pnpm supabase:stop`                                 | `pnpm supabase:demo:stop`                                       |
| Inspect env (no secrets) | `pnpm env:check`                                     | `pnpm env:check:demo`                                           |
| Deployment               | Production / regular Vercel project                  | Separate **Demo Deployment** (own Vercel + Supabase project)    |

The **Demo Development Environment** is a safe, isolated setup for testing. It does not share databases or credentials with regular development. Sample wedding rows are **opt-in** (see workflows below).

### Two local data workflows

**Fresh onboarding (default after reset)** — migrations only; no wedding row.

1. Reset the chosen local stack (`pnpm db:reset` or `pnpm db:demo:reset`).
2. Start the app (`pnpm dev` or `pnpm dev:demo`).
3. Sign in as super admin (local Mailpit: `superadmin@supabase.com`).
4. Dashboard shows that no wedding exists → **Set up wedding**.
5. Onboarding creates the wedding, default page blocks, and links admin profiles.
6. Invite additional admins from **Admins** as needed.

**Seeded development (explicit)** — fictional Theo & Ada sample for quick feature work.

```bash
# Regular local stack (:54321)
pnpm db:seed

# Demo local stack (:54331)
pnpm db:demo:seed
```

Seed scripts refuse cloud URLs, refuse the wrong local port, and **do not overwrite** an existing wedding (`INSERT … WHERE NOT EXISTS`). After seeding, login opens the wedding dashboard and onboarding is skipped.

`pnpm dev` / `pnpm dev:demo` never delete or seed data.

### Regular Development Environment

Intended config file: **`.env.local`**. Vite still also loads root **`.env`** if present (legacy / production-oriented keys may live there); `.env.local` overrides overlapping keys. Do not put demo credentials in either file.

```bash
cp .env.example .env.local    # preferred for day-to-day local/Mailpit keys
# Existing `.env` is left as-is if you already use it — Vite merges both
pnpm supabase:start
pnpm db:reset                 # migrations only (no automatic wedding seed)
# optional: pnpm db:seed      # fictional sample wedding
pnpm dev
```

### Demo Development Environment

```bash
cp .env.demo.example .env.demo
pnpm supabase:demo:start
pnpm supabase:demo:status     # copy URL + keys into `.env.demo` (API :54331)
pnpm db:demo:reset            # migrations only (no automatic wedding seed)
# optional: pnpm db:demo:seed # fictional sample wedding
pnpm dev:demo                 # starts demo stack if needed, then app on :3001
```

`pnpm dev:demo` loads **only** `.env.demo`, disables Vite’s default `.env` loading (`--mode demo` + `envDir: false`), strips inherited app credential keys, and fails if required demo vars are missing. It never reads `.env` or `.env.local`. External email defaults to `EMAIL_DELIVERY_ENABLED=false`.

Both stacks can run at once (different Docker `project_id` + ports). Schema/seed are shared via symlinks (`demo-stack/supabase/migrations` and `seed.sql` → `supabase/…`). Auth email templates are a real copy under `demo-stack/supabase/templates` (Supabase rejects symlink targets outside the workdir). **Data volumes are separate**.

### Cloud / Demo Deployment

- The regular Vercel project keeps its existing Supabase env vars.
- A **Demo Deployment** should use a separate Vercel project and a separate Supabase project. Prefer setting `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (required for the browser bundle). Server code also accepts `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` from a Vercel–Supabase integration. Always set `SUPABASE_SECRET_KEY` and `PRODUCTION_SUPER_ADMIN_EMAIL` as server-only. Do **not** put secrets in `VITE_*` vars. Ignore `POSTGRES_*` for the app (we use the Supabase JS client, not direct Postgres).

### Demo Database commands (safe targeting)

| Script                               | Target                                         |
| ------------------------------------ | ---------------------------------------------- |
| `pnpm db:demo:reset`                 | Demo local stack only (`--workdir demo-stack`) |
| `pnpm db:demo:seed`                  | Demo local only (refuses non-`:54331` URLs)    |
| `pnpm db:demo:link` / `db:demo:push` | Demo cloud from `.env.demo` only               |

Regular `pnpm db:link` / `db:push` still read `.env` and must not be used for the Demo Database.

### Limitations

- First-time demo setup requires creating `.env.demo` and starting Docker.
- Cloud migration/push is manual (`pnpm db:demo:push`) — not run automatically.
- Pushing a non-`main` branch to GitHub can trigger **preview** deploys on the regular Vercel project unless you use a separate Demo Deployment project or ignore that branch.
- Regular `pnpm dev` still loads `.env` (if present) in addition to `.env.local` — that is current Vite behavior and was left unchanged so existing setups keep working.

## Local setup

```bash
mise install
mise trust  # first time in this repo
pnpm install
cp .env.example .env
# For local Mailpit OTP: also create `.env.local` with keys from `pnpm status`
pnpm supabase:start
pnpm db:reset   # first time / after migration changes (migrations only)
# optional: pnpm db:seed
pnpm dev
```

App: [http://localhost:3000](http://localhost:3000)  
Mailpit (local OTP emails): [http://127.0.0.1:54324](http://127.0.0.1:54324)

### Useful pnpm scripts

| Script                       | What it runs                                                    |
| ---------------------------- | --------------------------------------------------------------- |
| `pnpm status`                | `supabase status` (API URL, keys, Mailpit)                      |
| `pnpm supabase:start`        | Start local Supabase                                            |
| `pnpm supabase:stop`         | Stop local Supabase                                             |
| `pnpm supabase:demo:*`       | Demo local stack (start / stop / status)                        |
| `pnpm db:reset`              | Reset Regular local DB + migrations (**no** auto-seed)          |
| `pnpm db:seed`               | Opt-in fictional wedding on Regular local (:54321) only         |
| `pnpm db:link`               | Link CLI to cloud project ref from `.env` → `VITE_SUPABASE_URL` |
| `pnpm db:push`               | Link from `.env`, then push migrations to cloud                 |
| `pnpm db:demo:reset`         | Reset Demo local DB + migrations (**no** auto-seed)             |
| `pnpm db:demo:seed`          | Opt-in fictional wedding on Demo local (:54331) only            |
| `pnpm db:demo:link` / `push` | Demo cloud from `.env.demo` only                                |
| `pnpm env:check`             | Summarize regular env (hosts/lengths only)                      |
| `pnpm env:check:demo`        | Summarize demo env; fail if required keys missing               |

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

| What                                       | Where                                                                | Notes                                                                               |
| ------------------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Product name / tagline                     | `src/lib/constants.ts` (`PRODUCT_*`)                                 | Keep as Onemole product branding unless white-labeling the builder itself           |
| Production super admin email               | Env `PRODUCTION_SUPER_ADMIN_EMAIL` (server-only; see `.env.example`) | Who can bootstrap `/admin` on first cloud login. Set in Vercel before deploy.       |
| Admin OTP email subject                    | App (`adminOtpEmailSubject`)                                         | No wedding → product name (`Ìgbéyàwówa`); wedding set → `{Groom} & {Bride} Wedding` |
| Admin OTP email body                       | App template (`adminOtpEmailHtml`)                                   | Delivered via Resend (cloud) or Mailpit (local); not GoTrue’s static subject        |
| Sample couple (opt-in)                     | `supabase/seed.sql` via `pnpm db:seed` / `db:demo:seed`              | Not applied on reset. Cloud uses **onboarding**, not seed.                          |
| Fallback couple (DB down / no wedding yet) | `src/lib/wedding/public-settings.ts` → `FALLBACK_PUBLIC_WEDDING`     | Public site only until onboarding creates a row                                     |

### B. Supabase Dashboard (cloud project for this wedding)

| What                       | Where                                                                | Set to                                                                                              |
| -------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Site URL                   | **Authentication → URL Configuration**                               | Production site origin, e.g. `https://your-site.vercel.app` (include `https://`)                    |
| Redirect URLs              | same page                                                            | Same production origin (+ preview URLs if needed)                                                   |
| Email provider             | **Authentication → Providers → Email**                               | Enabled                                                                                             |
| Custom SMTP                | **Project Settings → Authentication → SMTP** (or Resend integration) | **Required** to edit Auth email templates on hosted Supabase                                        |
| Magic link / OTP templates | Optional dashboard fallback only                                     | App sends admin OTP (dynamic subject). Keep a neutral product subject if Auth still has a template. |
| Migrations                 | CLI: `pnpm db:push` after `pnpm db:link` (or SQL editor)             | Apply all `supabase/migrations/*` including `page_blocks`, `groom_name` / `bride_name`              |
| Wedding row                | Admin UI after login, or seed                                        | Groom, bride, theme, venue, page blocks                                                             |

**OTP email body (hosted template):**

```html
<h2>Your admin sign-in code</h2>
<p>Use this one-time code to sign in:</p>
<p style="font-size: 28px; font-weight: 700; letter-spacing: 0.2em">
  {{ .Token }}
</p>
<p>This code expires in 1 hour and can only be used once.</p>
```

Admin sign-in codes are generated with the Supabase Admin API and emailed by the app: subject is the product name until a wedding exists, then `{Groom} & {Bride} Wedding` from the database. Hosted Auth email templates are only a fallback if something still goes through GoTrue.

### C. Resend

| What               | Where                                                                 | Notes                                                                                  |
| ------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Account + API key  | [resend.com](https://resend.com)                                      | Used as Supabase Auth SMTP password                                                    |
| Sending domain     | Resend → Domains                                                      | Use a domain you control (`example.com`), **not** `*.vercel.app`                       |
| Sender identity    | Supabase SMTP “Sender email”                                          | Must be allowed by Resend (verified domain, or `onboarding@resend.dev` for tests only) |
| SMTP into Supabase | Host `smtp.resend.com`, port `465`, user `resend`, password = API key | Unlocks editable Auth templates                                                        |

Admin OTP uses the Resend SDK directly (same API key). Guest/admin transactional mail also uses Resend. Local OTP is injected into Mailpit when `RESEND_API_KEY` is unset.

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
5. `RESEND_API_KEY` (+ optional `RESEND_FROM_EMAIL`) so the app can send admin OTP and other mail
6. Confirm login OTP subject: product name before onboarding, couple names after
7. Set server-only `PRODUCTION_SUPER_ADMIN_EMAIL` to the owner who should bootstrap `/admin`
8. Update local `config.toml` subject + `seed.sql` if you care about local parity
9. Sign in → set groom/bride/content in admin

## Supabase

### Environment variables

| Name                            | Where                                      | Purpose                                                                                                                                                                                  |
| ------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`             | browser + server                           | Project URL                                                                                                                                                                              |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser + server                           | Publishable key (`sb_publishable_…`)                                                                                                                                                     |
| `SUPABASE_SECRET_KEY`           | **server only**                            | Secret key (`sb_secret_…`) for privileged ops (first-login admin profile)                                                                                                                |
| `PRODUCTION_SUPER_ADMIN_EMAIL`  | **server only**                            | Email allowed to bootstrap as `super_admin` on first **cloud** login. Required in production/Vercel. Not used for local Mailpit (`superadmin@supabase.com`). Never use a `VITE_` prefix. |
| `RESEND_API_KEY`                | server (required for guest/admin app mail) | App transactional email via Resend SDK: guest RSVP invites, photo-share links, admin invites, support. **Separate** from Auth OTP (that uses Resend as **Supabase custom SMTP**)         |
| `RESEND_FROM_EMAIL`             | server optional                            | From identity for app-sent mail (verified domain). Defaults to Resend onboarding sender for tests                                                                                        |
| `APP_URL`                       | server                                     | Public origin for RSVP/photo/admin invite links in emails (defaults to `http://localhost:3000`)                                                                                          |
| `EMAIL_DELIVERY_ENABLED`        | server optional                            | Set `false` to skip outbound app emails (logs instead)                                                                                                                                   |

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

1. Set `PRODUCTION_SUPER_ADMIN_EMAIL` (server-only) to the owner inbox before first cloud login
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
- Roles: `super_admin` (matches `PRODUCTION_SUPER_ADMIN_EMAIL` in cloud, or local Mailpit test email) vs `admin`
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

| Where                          | What you’ll see                                                                                                                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Browser DevTools → Console** | FE `[RouteError] err_…` plus a structured object (code, status, technical message, cause, stack)                                                                                                                                               |
| **Vercel → Project → Logs**    | Same `errorId` from SSR/server throws and from FE via `reportClientError`. Search/filter for the Reference id. Logs are JSON lines with `errorId`, `code`, `status`, `message`, `source` (`ssr` / `server` / `client`), `causeMessage`, stacks |
| **Supabase → Logs**            | Auth, API, and Postgres platform events. App code that catches Supabase failures also re-logs them to Vercel with a technical message + cause                                                                                                  |

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

| Phase | Focus                                                        |
| ----: | ------------------------------------------------------------ |
|     1 | Bootstrap, local infra, CI                                   |
|     2 | Design foundation / wedding tokens                           |
|     3 | Supabase schema + admin auth                                 |
|     4 | Wedding settings editing                                     |
|    4b | Page blocks CMS                                              |
|     5 | Public wedding website polish                                |
|     6 | Guest list admin                                             |
|     7 | RSVP                                                         |
|     8 | Guest email (themed Resend invites + photo shares)           |
|     9 | Registry (gift links + bank accounts + soft reserve)         |
|    10 | Date publish (draft date + publish + guest notify) — current |
|    11 | Motion / launch polish                                       |

Guest invite, photo-share, and date-announced emails inherit the wedding’s active public theme (light palette for deliverability). Auth OTP templates remain separate (Supabase SMTP).

**Date publish:** saving `wedding_date` alone does not show it publicly. Publish sets `date_published_at` and can email previously invited guests. Until then the public site stays “Date to be announced”.

Do not start the next phase until the previous phase is merged and confirmed.

## Future plan

| Version | Goal                                                                                                                                                                                                                                                                                                                                                       |
| ------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  **v1** | Single wedding per deploy (this repo). Whitelabel by reconfiguring Supabase / Resend / Vercel / seed + admin content.                                                                                                                                                                                                                                      |
|  **v2** | Multi-wedding platform: create many live wedding websites from one product (tenancy, per-wedding domains, shared admin/builder, provisioning). Auth email subjects/templates and super-admin bootstrap must become data-driven instead of per-project dashboard edits. Also: activity logs, support tickets inbox, **admin suspend**, payment/seat limits. |

Track v2 explicitly so we do not bolt multi-site onto v1 accidentally. Until then, treat each production wedding as its own Supabase + Vercel surface and use the [launch checklist](#whitelabel-launch-checklist-for-a-new-wedding-v1).

## License

This project is licensed under the **GNU General Public License version 3 only** (`GPL-3.0-only`). See [`LICENSE`](./LICENSE) for the full license text.

Admin UI primitives and related helpers include code **adapted from [Significa Foundations](https://github.com/significa/foundations)** ([foundations.significa.co](https://foundations.significa.co)), which Significa documents as GPL-3.0. See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) for attribution and known file locations. We do not claim authorship of the Significa Foundations components.
