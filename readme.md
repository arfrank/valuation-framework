# ValuFrame - Valuation Framework

A lightweight, client-side web app for modelling a term sheet: enter a post-money valuation and round size, and see ownership and dilution for the new investor, founders and prior investors, with a base case and alternative scenarios side by side. Everything runs in the browser; nothing is sent to a server.

## Features

### Core
- **Multiple scenarios in tabs** - Add, rename, duplicate and delete scenarios; data persists in the browser's local storage
- **Live calculations** - Results update as you type
- **Post-money or pre-money input** - Enter either; the other is derived
- **Alternative scenarios** - Cards at adjustable valuation offsets around the base case, each of which can be applied back to the inputs
- **Compare mode** - Select two or more tabs to see their base cases next to each other
- **Shareable permalinks** - A scenario's inputs are encoded in the URL; opening the link loads it as a new tab

### Advanced inputs
- **Founders and prior investors** - Any number of rows, each with its own ownership
- **Pro-rata rights** - Calculated per prior investor, with an optional custom allocation
- **SAFEs** - Cap, discount, MFN, fixed-percent (YC-style) and round-price conversion, with per-SAFE investor attribution and pro-rata
- **SAFE rounds** - Model the new round itself as a SAFE
- **Option pool** - Current, granted and target pool, with the top-up taken before or after the close
- **Warrants** - "$X of warrants at a $Y valuation"
- **Two-step rounds** - A round that closes in two tranches at different valuations
- **A separate lead** - Split the round between your firm, a named lead and other investors

### Other tools
- **Exit math** - Project the firm's check through further rounds of dilution to a set of exit valuations and see proceeds and MOIC
- **Cap table import** - Copy a prompt into an LLM along with a cap table or SAFE notes, then paste the JSON it returns
- **Guided walkthrough** - A short tour with an example scenario

## Tech Stack

- **React 19** with function components and hooks
- **Vite** for the dev server and build
- **Plain CSS** in a single stylesheet (`src/App.css`)
- **Vitest** and Testing Library for tests
- **Local Storage API** for persistence

## Getting Started

### Prerequisites
- Node.js 20.19+ or 22.12+ (required by Vite 7)
- npm

### Installation
```bash
git clone https://github.com/arfrank/valuation-framework.git
cd valuation-framework/react-app

npm install
npm run dev
```

The app is served at `http://localhost:5173`.

### Other commands
```bash
npm run build      # production build into dist/
npm run preview    # serve the production build
npm run lint       # eslint
npx vitest run     # run the test suite once
```

## Usage

1. **Enter the round** - Post-money valuation, round size and your firm's portion
2. **Read the base case** - Ownership and dilution appear in the card next to the form
3. **Open Advanced** - Add founders, prior investors, SAFEs, the option pool, warrants or a second step
4. **Explore alternatives** - Adjust the scenario range, and click Apply on any card to adopt it
5. **Share** - Use the link button on the base case to copy a permalink

## Project Structure

```
react-app/
├── src/
│   ├── App.jsx                     # Layout and scenario (company) state
│   ├── App.css                     # The app's single stylesheet
│   ├── components/
│   │   ├── CompanyTabs.jsx           # Scenario tabs, compare selection
│   │   ├── InputForm.jsx             # All inputs
│   │   ├── PriorInvestorsSection.jsx # Prior investors, SAFEs and pro-rata table
│   │   ├── FoundersSection.jsx
│   │   ├── FormInput.jsx             # Shared labelled input
│   │   ├── ScenarioCard.jsx          # Base case and alternative scenario cards
│   │   ├── ScenarioControls.jsx      # Scenario range presets
│   │   ├── ExitMathModule.jsx        # Exit proceeds and MOIC
│   │   ├── ImportModal.jsx           # Cap table / SAFE import
│   │   ├── Walkthrough.jsx           # Guided tour
│   │   ├── Notification.jsx, NotificationContainer.jsx
│   │   └── Logo.jsx
│   ├── hooks/
│   │   ├── useLocalStorage.js
│   │   ├── useNotifications.js
│   │   └── useTimeouts.js
│   └── utils/
│       ├── multiPartyCalculations.js # The calculation engine
│       ├── exitMath.js               # Exit and MOIC math
│       ├── dataStructures.js         # Defaults, migration and validation
│       ├── permalink.js              # URL encoding and decoding
│       ├── importCompany.js, importPrompts.js
│       ├── scenarioOffsets.js
│       ├── exampleScenario.js, walkthroughSteps.js
│       └── socialSharing.js
├── public/                         # Static assets
└── package.json
```

Tests live next to the code they cover (`*.test.js` / `*.test.jsx`). See `AGENTS.md` for conventions when changing the code.

## License

This project is for educational and demonstration purposes.
