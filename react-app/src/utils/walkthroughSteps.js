// Walkthrough steps for the guided tour.
// Each step:
//   id           — stable id for testing/debug
//   target       — CSS selector for the spotlight; null = centered card with no spotlight
//   title        — short title shown in tooltip
//   body         — one or two sentences of explanation
//   placement    — 'auto' | 'top' | 'bottom' | 'left' | 'right' | 'center'
//   onEnter      — optional fn(ctx) called when the step becomes active. Use to open
//                  panels (Advanced, Exit Math) so the next step's target is rendered.
//   waitForTarget— if true, the tour briefly retries finding the target after onEnter
//                  (lets a panel open + render before measuring).

export const buildWalkthroughSteps = ({ openAdvanced, openExitMath } = {}) => [
  {
    id: 'welcome',
    target: null,
    title: 'Welcome',
    body: 'This tool models cap tables, dilution, and exits when offering a term sheet. Quick 60-second tour.',
    placement: 'center'
  },
  {
    id: 'company-tabs',
    target: '[data-tour="company-tabs"]',
    title: 'One tab per deal',
    body: 'Each tab is a separate company. Tick the checkboxes to compare two or more side-by-side.',
    placement: 'bottom'
  },
  {
    id: 'core-inputs',
    target: '[data-tour="core-inputs"]',
    title: 'The four inputs that drive everything',
    body: 'Post-money valuation, round size, your firm’s portion, and the rest of the round. Every output updates live.',
    placement: 'right'
  },
  {
    id: 'money-toggle',
    target: '[data-tour="money-toggle"]',
    title: 'Pre-money or post-money — your call',
    body: 'Click to flip between entering post-money (with computed pre-money) or vice versa. Same math either way.',
    placement: 'bottom'
  },
  {
    id: 'base-card',
    target: '[data-tour="base-card"]',
    title: 'The post-round cap table',
    body: 'Your scenario, fully diluted. Click any section header to expand: new round, founders, prior investors, ESOP, SAFEs, warrants. Everything sums to 100%.',
    placement: 'left'
  },
  {
    id: 'advanced-toggle',
    target: '[data-tour="advanced-toggle"]',
    title: 'Model the messy stuff',
    body: 'Open Advanced to add prior investors with pro-rata rights, SAFE conversions, ESOP top-ups, warrants, and 2-step rounds.',
    placement: 'right',
    onEnter: () => openAdvanced && openAdvanced(true),
    waitForTarget: true
  },
  {
    id: 'scenario-controls',
    target: '[data-tour="scenario-controls"]',
    title: 'Sensitivity analysis',
    body: 'Add valuation offsets here — see how the cap table flexes at +20% or −10%. Color-coded by direction and magnitude.',
    placement: 'top',
    allowCenterFallback: true
  },
  {
    id: 'exit-math',
    target: '[data-tour="exit-math-toggle"]',
    title: 'Project returns to exit',
    body: 'Toggle Exit Math to project your ownership through future rounds of dilution and compute MOIC at various exit valuations.',
    placement: 'bottom',
    onEnter: () => openExitMath && openExitMath(true),
    waitForTarget: true
  },
  {
    id: 'permalink',
    target: '[data-tour="permalink-btn"]',
    title: 'Share without a database',
    body: 'Hit the link icon to copy a permalink. The entire scenario is encoded in the URL — share with founders, LPs, or co-investors.',
    placement: 'top'
  }
]

export const TOUR_SEEN_KEY = 'valuationFrameworkTourSeen'
