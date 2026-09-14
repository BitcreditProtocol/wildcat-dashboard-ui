# AGENTS.md

Agent-specific context for changing this repository. What the dashboard is and
how to run it: [README.md](README.md). Code style:
[TYPESCRIPT_CODING_GUIDELINES.md](TYPESCRIPT_CODING_GUIDELINES.md). PR checklist:
[.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md). These are
defaults, not laws: the developer's instructions win, and if a rule here fights
the task at hand, say so and get sign-off before breaking it.

## Project Map

React + TypeScript + Vite single-page app for operating a Wildcat credit mint.
Admin calls go through the generated `@hey-api` client in `src/generated/client/`
via `src/lib/api-client.ts`, which refreshes the Keycloak session
(`src/keycloak.tsx`) and attaches the bearer token; the `/v1/admin/*` routes are
authorised by an external Envoy BFF, not by this app. `src/lib/api.ts` serves
only the public `/v1/info`. Pages live in `src/pages/<feature>/`; shared UI comes
from `@bitcredit/ui-library` first, then `src/components/`.

## Getting Started

README has the commands. Agent delta: use `npm ci`, not `npm install`, because
`package.json` pins `packageManager: npm@11.12.1` and `engines.node >=25 <26`
and `npm ci` installs exactly what `package-lock.json` says, as CI does.
`npm run dev` loads the committed `.env.development`; `src/lib/env.ts` throws at
startup when `VITE_API_BASE_URL` or the three `VITE_KEYCLOAK_*` keys are unset.

## Quality Gates

Full gate: CI (`.github/workflows/ci.yml`) runs all four on every PR and on
pushes to `dev` and `master`, so run them before opening a PR.

    npm run format:check   # biome; `npm run format` fixes
    npm run lint           # eslint, type-aware
    npm test -- --run      # vitest; without --run it enters watch mode and never exits
    npm run build          # tsc -b + vite build; the type check lives here, not in lint

Tests are colocated `*.test.ts(x)` under jsdom (`vitest-setup.ts`). The
`justfile` only wraps Docker (`just build`, `just run`); it is not a gate.

Non-negotiables:
- NEVER push `v*` tags or push directly to `master`: `.github/workflows/deploy.yml`
  deploys them to Cloudflare Pages and `release.yml` publishes a GHCR image.
- Never commit `.env` or tokens. `.env` is gitignored for that reason;
  `.env.development` is committed, so nothing secret belongs in it.

## Generated and Downloaded Files

Do not hand-edit these: the next generation overwrites the edit, and drift hides
real wire changes. Biome and ESLint skip them, so the gate stays silent there.

- `src/generated/client/` — `npm run openapi-ts` from `opt/wildcat/openapi.json`
  (`openapi-ts.config.ts`). For an API change: replace the spec, regenerate, fix
  the callers that `npm run build` flags.
- `src/i18n/source.json` — `npm run i18n-extract` collects every `defaultMessage`
  in `src/` plus the ui-library's `defaultUiMessages`. Copy is authored in code
  and `src/i18n/descriptors.ts`; this JSON is output.
- `src/i18n/<locale>/translation.json` — Crowdin downloads (`crowdin.yml`),
  arriving as "New Crowdin updates" PRs.
- `src/components/ui/` — shadcn additions (see README); edited in place when
  needed, but excluded from format and lint.

## Key Patterns

- Runtime config: `src/lib/env.ts` reads `window.__ENV__` (written to
  `public/config.js` by `docker/entrypoint.d/00-env-config.sh` at container
  start) before `import.meta.env`, so one image serves every environment. A new
  `VITE_*` variable therefore touches `env.ts`, `.env.example`, `docker-compose.yml`,
  `00-env-config.sh` and `deploy.yml`, or the container silently ignores it.
- Quote status, e-bill payment status and redemption are three facts from three
  endpoints; keep them distinct in badges and copy. `Accepted` (holder took the
  offer) and `MintingEnabled` are working states, not completion: request-to-pay
  still lives there (`src/pages/quotes/QuoteActions.tsx`) and value counts as
  redeemed only when `payment_status.paid` (`src/lib/ebill-mint-complete.ts`).
  Derive displayed status in `src/utils/quote-status.ts`, not in components.
- Prefer `@bitcredit/ui-library` components (`Button`, `Text`, `Card`, `toast`,
  `cn`) over new local ones; the library's messages also feed `source.json`.
- Quote pages poll via React Query; a new query needs a `refetchInterval` that
  stops on terminal states (`src/hooks/use-quote-list.ts` is the model).

## Common Gotchas

1. **`TYPESCRIPT_CODING_GUIDELINES.md` drifts from this repo's tooling** — it
   says Prettier, 100-column lines and Playwright; here the formatter is Biome
   at 140 columns (`biome.json`) and there is no Playwright. Config wins.
2. **Root `en/` and `de/` are stray Crowdin download artifacts (#280)**, not
   the app's translations — `src/i18n/messages.ts` loads only `src/i18n/`.

Add to this list when a wall costs real time; cite the issue or commit so the
entry can be pruned once the sharp edge is gone.

## Glossary

Three endpoints, three facts (Key Patterns). Copy and badges must keep them apart.

- **quote status** — the offer's stage; it proves neither payment nor redemption.
- **`Accepted`** — the holder took the offer; payment and redemption may still be pending.
- **`MintingEnabled`** — minting is permitted; still not payment or redemption.
- **e-bill payment status** — `payment_status.paid` from its own endpoint; it does not
  move the quote.
- **redeemed** — the mint-completion check in `src/lib/ebill-mint-complete.ts` passed.

## Hit every surface

Before calling UI work done, say which of these applied:

- **Generated client** regenerated from the spec; stale types pass every gate.
- **`source.json`** re-extracted; a missed `defaultMessage` never reaches Crowdin.
- **Runtime config**: a new `VITE_*` variable touches all five places in Key Patterns, or
  the container silently ignores it.
- **Components**: ui-library first, then `src/components/`; local copies drift.

## Plans and work artifacts

- Plans, research notes and scratch files stay outside the worktree or gitignored; the
  merged PR is the implementation record. Do not add a second checklist or PR summary to
  the repo.

## Working Agreements

Organisation-wide rules (branch protection, reviews, labels, Dependabot) live in the
[contributing guide](https://github.com/BitcreditProtocol/.github/blob/master/CONTRIBUTING.md).
This section is the per-task delta.

- Open pull requests against `dev`. Branch from it too: basing work on another branch
  conflicts in exactly the files other people are changing.
- Never open, mark ready or merge a PR, and never push a tag, unless the developer
  explicitly asks. Each is visible to the whole team, and a tag also starts a release.
- Commit small and often. Each commit is self-contained, passes the gate above and is
  reviewable on its own; the subject says why, not just what. Reviewers only catch
  mistakes in changes they can hold in their head.
- Titles: conventional-commit style in plain language, e.g. `fix(quotes): accepted quotes
  no longer display as paid`. Mark breaking changes with the `breaking` label, not a `!`
  in the title; release notes are built from labels (see
  [`.github/release.yml`](.github/release.yml)), so also label `bug`, `enhancement`,
  `documentation` or `dependencies`.
- Body: the problem in a sentence or two, then how it was fixed, then how it was verified.
  The [PR template](.github/PULL_REQUEST_TEMPLATE.md) asks exactly that. End with the
  model and harness that did the work.
- Evidence: UI changes carry before/after screenshots; motion or timing carries a short
  video; logic changes carry the test that failed before and passes now. Upload evidence
  to the PR on GitHub; never commit PR-only screenshots or assets.
- One concern per PR. If the description needs an "also", split it.
- Babysitting a PR: poll checks and comments newer than the last push; verify each bot
  finding against the source, fix the real ones, dismiss false positives with a written
  reason. No status check is required to merge, so a red check may predate your change:
  confirm that before blaming it, and say so in the PR. Stay quiet when nothing is new;
  stop when checks are green on the latest commit.
- `master` is promoted from `dev` by PR and is what deploys; CI, the nightly image and
  Dependabot run on `dev`. Title a promotion PR by what it ships, not by the branch name,
  because that title becomes the release-notes line.

