import {
  createPriorInvestor,
  createFounder,
  createWarrant
} from './dataStructures'
import { buildScenarioOffsets } from './scenarioOffsets'

const safeId = (suffix) => `safe-${Date.now()}-${suffix}-${Math.random().toString(36).slice(2, 8)}`

// A rich, presentation-ready Series B scenario that exercises almost every
// feature the app supports: prior investors with pro-rata, multiple founders,
// SAFE notes (capped + uncapped), an ESOP top-up, a venture-debt warrant, and
// scenario-sensitivity offsets. Pre-round ownership is tuned to ~92% so a
// small "Unknown/Other" remainder appears (a useful teaching moment).
export function createExampleScenario(name = 'Example: Series B') {
  return {
    name,
    postMoneyVal: 80,
    roundSize: 20,
    investorPortion: 14,
    otherPortion: 6,
    investorName: 'LSVP',
    showAdvanced: true,
    percentPrecision: 2,

    twoStepEnabled: false,
    step2PostMoney: 0,
    step2Amount: 0,
    step2InvestorPortion: 0,
    step2OtherPortion: 0,

    showExitMath: false,
    exitMath: {
      exitValuations: [200, 500, 1000, 2500, 5000],
      numRounds: 3,
      uniformDilution: 20,
      perRoundOverrides: []
    },

    priorInvestors: [
      createPriorInvestor('Seed Lead', 18, true),
      createPriorInvestor('Pre-seed Angel', 4, false),
      createPriorInvestor('Strategic Angel', 2.5, false)
    ],
    founders: [
      createFounder('CEO', 28),
      createFounder('CTO', 22),
      createFounder('VP Engineering', 8)
    ],

    safes: [
      {
        id: safeId('bridge'),
        investorName: 'Bridge Round',
        amount: 2,
        cap: 40,
        discount: 20,
        proRata: true,
        proRataOverride: null
      },
      {
        id: safeId('accel'),
        investorName: 'Accelerator',
        amount: 0.5,
        cap: 25,
        discount: 0,
        proRata: false,
        proRataOverride: null
      }
    ],

    currentEsopPercent: 8,
    grantedEsopPercent: 5,
    targetEsopPercent: 12,
    esopTiming: 'pre-close',

    warrants: [
      createWarrant('Venture Debt', 1, 50)
    ],

    scenarioOffsets: buildScenarioOffsets(20),

    // Legacy fields kept for migration compatibility
    proRataPercent: 0,
    preRoundFounderOwnership: 0
  }
}

// A second variant for compare-mode demos: same cap table at a 20% higher post-money.
export function createExampleCompareVariant(name = 'Example: stretched valuation') {
  const base = createExampleScenario(name)
  return {
    ...base,
    postMoneyVal: 96,
    investorPortion: 16,
    otherPortion: 4
  }
}

export const EXAMPLE_PRIMARY_NAME = 'Example: Series B'
export const EXAMPLE_VARIANT_NAME = 'Example: stretched valuation'
