# Third-party notices

This file documents third-party material included or adapted in this repository.
It does not relicense dependencies that remain separate packages under their own
terms (for example fonts and icons installed via npm).

## Significa Foundations

- **Project:** Foundations (by Significa)
- **Website:** https://foundations.significa.co
- **Source repository:** https://github.com/significa/foundations
- **Upstream license statement:** The Foundations README states that the project
  is licensed under the [GPL-3.0 License](https://www.gnu.org/licenses/gpl-3.0.en.html).
- **Upstream LICENSE file:** As of this notice, the Foundations repository does
  **not** ship a root `LICENSE` / `COPYING` file, and GitHub reports no detected
  license metadata. No SPDX `GPL-3.0-only` vs `GPL-3.0-or-later` grant was found
  in a formal license file or in file headers of the sampled Foundations sources.
  This project therefore **does not assert** “or later” rights from Foundations
  and releases itself as `GPL-3.0-only` (see root `LICENSE` and `package.json`).
- **Authorship:** Significa Foundations components and patterns were created by
  Significa. This repository’s maintainers did **not** author those upstream
  components. Local files may be copied or adapted for this application.

### Known copied / adapted locations in this repository

These paths are identified from in-repo attribution and project documentation.
This list may be incomplete if additional Foundations material was adapted
without a local comment.

| Location | Notes |
| -------- | ----- |
| `src/hooks/use-top-layer.ts` | Explicit comment: “Copied/adapted from Significa Foundations.” |
| `src/components/ui/` | Admin UI primitives documented as Foundations-based (e.g. button, input, field, modal, select, tooltip, and related files in this directory). |
| `src/components/slot.tsx` | Shared slot helper used with the Foundations-style UI layer. |
| `src/lib/utils.ts` | Shared `cva` / `cn` helpers used by those UI primitives. |
| `src/styles/app.css` | Documents a “Foundations @theme baseline” alongside wedding tokens. |

Existing in-source attribution (such as the comment in `use-top-layer.ts`) is
preserved and was not removed by the licensing setup for this release.

### How Foundations is used

Foundations is designed to be copied into a project rather than installed as a
dependency. Portions of that UI stack are retained in this application under the
project’s GPL-3.0-only license terms in `LICENSE`.
