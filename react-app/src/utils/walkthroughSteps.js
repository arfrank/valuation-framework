// Walkthrough steps for the guided tour.
// Each step:
//   id           — stable id for testing/debug
//   target       — CSS selector for the spotlight; null = centered card with no spotlight
//   title        — short title shown in tooltip
//   body         — one or two sentences of explanation
//   placement    — 'auto' | 'top' | 'bottom' | 'left' | 'right' | 'center'
//   onEnter      — optional fn called when the step becomes active. Use to open
//                  panels (Advanced, Exit Math, compare mode) so the next step's
//                  target is rendered.
//   waitForTarget— if true, the tour briefly retries finding the target after
//                  onEnter (lets a panel open + render before measuring).

export const buildWalkthroughSteps = ({ openAdvanced, openExitMath, enterCompare } = {}) => [
  {
    id: 'welcome',
    target: null,
    title: 'Welcome',
    body: 'This tool models cap tables, dilution, and exits when offering a term sheet. We loaded a populated example so you can see every feature in action — your other scenarios are untouched.',
    placement: 'center'
  },
  {
    id: 'company-tabs',
    target: '[data-tour="company-tabs"]',
    title: 'One tab per scenario',
    body: 'Each tab is a separate scenario — different company, different round structure, or just a what-if. Use the checkboxes to compare two or more side-by-side.',
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
    id: 'prior-investors',
    target: '[data-tour="prior-investors"]',
    title: 'Prior investors with pro-rata',
    body: 'Existing holders are sorted by Fully-Diluted Ownership (FDO). Tick pro-rata to let them buy in proportional to their stake, or override the allocation in $M directly.',
    placement: 'right',
    onEnter: () => openAdvanced && openAdvanced(true),
    waitForTarget: true,
    allowCenterFallback: true
  },
  {
    id: 'safes',
    target: '[data-tour="safes-section"]',
    title: 'SAFEs convert at this round',
    body: 'Add SAFE notes with cap and discount — they convert into the round at whichever is more favorable to the holder. Pro-rata works here too.',
    placement: 'right',
    onEnter: () => openAdvanced && openAdvanced(true),
    waitForTarget: true,
    allowCenterFallback: true
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
    id: 'compare-mode',
    target: '[data-tour="compare-view"]',
    title: 'Compare scenarios side-by-side',
    body: 'We just ticked two example scenarios so the cap tables render side-by-side. In your own data, tick any two tabs to compare them.',
    placement: 'top',
    onEnter: () => enterCompare && enterCompare(),
    waitForTarget: true,
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
