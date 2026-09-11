---
name: lint-and-typecheck
description: >-
  After any code edits, run the project's lint:fix then typecheck and fix
  issues before finishing. Use after implementing, refactoring, or generating
  files; when the user mentions lint, lint:fix, eslint, typecheck, tsc, or
  asks to verify there are no issues.
---

# Lint fix and typecheck after edits

After you change application code, **do not finish** until both checks have been run in the repo you edited.

## Commands

Prefer package scripts. In this workspace that is:

```bash
pnpm lint:fix
pnpm typecheck
```

If `lint:fix` is missing, run `pnpm exec eslint . --fix` (or the package's existing eslint fix equivalent), then add `"lint:fix": "eslint . --fix"` to `package.json` when you are already touching that file.

Run them **after the edits**, in the project root (`wedding-website-builder` or whichever package you changed). Do not skip because the change felt small.

## Loop

1. Apply the code changes.
2. Run `pnpm lint:fix`.
3. Run `pnpm typecheck`.
4. If either fails, fix the problems you introduced (or that your change surfaced in files you touched).
5. Re-run the failing command until it passes, or report a pre-existing failure you did not cause with the exact error.

## Do not

- Do not run `pnpm build`, `pnpm dev`, `pnpm start`, `pnpm preview`, or deploy.
- Do not run `pnpm format` / Prettier across the whole repo unless the user asked.
- Do not skip hooks or `--no-verify`.
- Do not treat a red typecheck as done.

## Skip only when

- The turn was discussion-only (no file edits), or you only changed markdown/docs the linter does not cover.
- The user explicitly said not to lint or typecheck this turn.
