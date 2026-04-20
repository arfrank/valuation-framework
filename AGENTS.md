# AGENTS.md

Instructions for AI coding agents working in this repo. Keep it short, update it when something changes.

## What this repo is

**ValuFrame** — a React + Vite single-page app that helps VCs model term sheets. You enter a post-money valuation and round size, the app computes ownership/dilution for the new investor, founders, and prior investors, and spits out a base case plus alternative scenarios (half round, 2x valuation, etc.). Everything runs client-side with localStorage persistence. Scenarios can be shared via permalinks that encode state into URL params.

Recent additions:
- Multi-party prior investors and founders (each with their own ownership row).
- SAFE conversion math with per-SAFE investor attribution.
- 2-step rounds (round closes in two tranches at different valuations).
- **Exit Math module** (3rd column, toggled from the footer): projects base-case LSVP check forward through N rounds of dilution to an exit valuation and shows MOIC.

## Layout

```
phoenix/
├── react-app/                 # The actual app — do most work here
│   ├── src/
│   │   ├── App.jsx                          # Top-level layout + company state
│   │   ├── App.css                          # Single stylesheet for the whole app
│   │   ├── components/
│   │   │   ├── InputForm.jsx                # Left column: all inputs
│   │   │   ├── ScenarioCard.jsx             # Base case + scenario tiles
│   │   │   ├── PriorInvestorsSection.jsx
│   │   │   ├── FoundersSection.jsx
│   │   │   ├── ExitMathModule.jsx           # 3rd column (toggled in footer)
│   │   │   ├── AppFooter.jsx                # Exit Math toggle lives here
│   │   │   └── CompanyTabs.jsx
│   │   ├── utils/
│   │   │   ├── multiPartyCalculations.js    # ★ Primary calc engine
│   │   │   ├── calculations.js              # Legacy engine (tests only)
│   │   │   ├── exitMath.js                  # Pure exit/MOIC math
│   │   │   ├── dataStructures.js            # createDefaultCompany, migrations
│   │   │   └── permalink.js                 # URL encode/decode (whitelisted fields)
│   │   └── hooks/
│   │       ├── useLocalStorage.js
│   │       └── useNotifications.js
├── .conductor/                # Conductor workspace scripts
│   ├── run.sh                 # Starts vite on $CONDUCTOR_PORT
│   └── setup.sh               # `npm install`
├── CLAUDE.md                  # Claude-specific notes (progress log)
├── AGENTS.md                  # You are here
└── readme.md                  # End-user / README
```

## Running it

```bash
cd react-app
npm install
npm run dev               # http://localhost:5173
npx vitest run            # full test suite (370+ tests)
npm run lint              # eslint
npm run build             # production build
```

From a Conductor workspace, prefer `.conductor/run.sh` — it binds Vite to the workspace's unique `$CONDUCTOR_PORT` so parallel workspaces don't collide.

## Working in Conductor

Conductor runs many agents in parallel, one per workspace. Each workspace is a git worktree.

Env vars you can rely on:
| Var | Meaning |
|---|---|
| `CONDUCTOR_WORKSPACE_NAME` | e.g. `phoenix` |
| `CONDUCTOR_WORKSPACE_PATH` | absolute path to this workspace |
| `CONDUCTOR_ROOT_PATH` | the main repo clone (read-only from here) |
| `CONDUCTOR_DEFAULT_BRANCH` | usually `main` — target for PRs |
| `CONDUCTOR_PORT` | per-workspace port; wired into `.conductor/run.sh` |

Rules of thumb:
- Do all work inside `$CONDUCTOR_WORKSPACE_PATH`. Never touch `$CONDUCTOR_ROOT_PATH`.
- The target branch is `$CONDUCTOR_DEFAULT_BRANCH` (`main`). Open PRs against it.
- If something doesn't make sense in context, the user may have sent the message to the wrong workspace — ask.
- `.context/` is gitignored and is the place to drop scratch files other agents might read.
- Unrelated tasks should go in separate workspaces.

## Code conventions (follow these, they're load-bearing)

- **Single stylesheet** — `App.css` holds everything. No CSS modules, no styled-components. Match existing class naming (`.advanced-section`, `.analytics-row`, `.investor-summary`, `.scenario-card`).
- **Calc engine is `multiPartyCalculations.js`.** `calculations.js` is legacy; only the tests import it. New features plug into the multi-party engine.
- **Scenarios are derived, never stored.** `App.jsx` re-runs `calculateEnhancedScenarios(company)` on every state change. Don't cache scenario results into company state.
- **Company state shape is the source of truth.** Defaults live in `createDefaultCompany()` in `dataStructures.js`. If you add a field, also add it to `migrateLegacyCompany()` so existing localStorage blobs don't break.
- **Permalinks are whitelisted.** `permalink.js` encodes only the fields in `URL_PARAM_MAP`. Anything not in that map will *not* travel through share links — use this on purpose for local-only UI state (e.g. `showExitMath`, `exitMath`) rather than adding a suppression flag.
- **Money is in $M, exit math is in $M.** Percentages are numbers like `21.15` (not `0.2115`). If you need decimals, convert at the boundary.
- **No new frameworks.** React 18 (via 19 peer), Vite, vanilla CSS, Vitest. That's it.

## Testing

- Vitest + @testing-library/react. Tests live next to the source (`foo.js` + `foo.test.js`).
- Calc utilities should have pure-function unit tests with concrete numbers (see `exitMath.test.js`, `calculations.test.js`).
- UI components are tested via render + query + assertion; see `ScenarioCard.test.jsx` for the pattern.
- Run the full suite before committing. The suite is fast (~30s).

## UI changes — verify in a browser

Type checks and unit tests don't prove the UI works. For visual/interaction changes:
1. Start the dev server (`.conductor/run.sh` or `npm run dev`).
2. Load the page, click through the feature, check console for errors.
3. If you can't do this (headless-only environment), say so in the handoff instead of claiming success.

## Git workflow

- Default instruction from the user: **commit and push after completing work** — don't ask.
- Branches per workspace; the current branch is set up to track `origin`.
- PR target is `main`. Use `gh pr create` and follow the commit message style in recent history (short imperative summary, then context).

## Common gotchas

- `vite` defaults to port 5173 — override with `--port` when running multiple workspaces. `.conductor/run.sh` handles this.
- Adding a field to `createDefaultCompany` without updating `migrateLegacyCompany` silently breaks users with old localStorage.
- When a scenario displays LSVP's "total" ownership, prefer `scenario.combinedInvestor.totalOwnership` over `scenario.investorPercent` — the latter is just the new-round slice and ignores pro-rata + SAFE attribution.
- Dollar values throughout the app are in millions; don't accidentally mix $M and $ raw (the Exit Math module's `exitValuation` input is in $M — e.g. `5000` means $5B).
