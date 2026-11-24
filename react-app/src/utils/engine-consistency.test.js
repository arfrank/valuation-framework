import { describe, it, expect } from 'vitest'
import { calculateEnhancedScenario } from './multiPartyCalculations'

const base = {
  postMoneyVal: 100,
  roundSize: 20,
  investorPortion: 15,
  otherPortion: 5,
  firmLeadsRound: true,
  investorName: 'LSVP',
  showAdvanced: true,
  priorInvestors: [],
  founders: [{ id: 'f', name: 'Founder', ownershipPercent: 100 }],
  safes: [],
  currentEsopPercent: 0,
  grantedEsopPercent: 0,
  targetEsopPercent: 0,
  esopTiming: 'pre-close',
  warrants: []
}

const twoStep = {
  twoStepEnabled: true,
  postMoneyVal: 20,
  roundSize: 5,
  investorPortion: 4,
  otherPortion: 1,
  step2PostMoney: 40,
  step2Amount: 10,
  step2InvestorPortion: 6,
  step2OtherPortion: 4
}

const sumOf = (rows, key) => (rows || []).reduce((sum, row) => sum + (Number(row[key]) || 0), 0)

// Adds up the rows a reader sees. `unknownOwnership` is deliberately left out:
// the engine defines it as 100 minus everything else, so including it would
// make the total 100 no matter what the rows say.
const displayedRowTotal = (result) => (
  sumOf(result.founders, 'postRoundPercent') +
  sumOf(result.priorInvestors, 'postRoundPercent') +
  result.investorPercent +
  (result.leadPercent || 0) +
  result.otherPercent +
  sumOf(result.safeDetails, 'totalPercent') +
  result.finalEsopPercent +
  (result.finalWarrantsPercent || 0)
)

describe('ownership rows sum to 100% with a fully tracked cap table', () => {
  it('two-step round with a pre-close ESOP top-up', () => {
    // Step 1: $5M at $20M post (25%). Step 2: $10M at $40M post (25%).
    // Round in the final table: 25 × 0.75 + 25 = 43.75.
    // Pool: 10 dilutes to 5.625; top-up X solves 10 × (56.25 − X)/100 + X = 15 → X = 10.4167.
    // Founders: 90 × (56.25 − 10.4167)/100 = 41.25.
    const result = calculateEnhancedScenario({
      ...base,
      ...twoStep,
      founders: [{ id: 'f', name: 'Founder', ownershipPercent: 90 }],
      currentEsopPercent: 10,
      targetEsopPercent: 15,
      esopTiming: 'pre-close'
    })

    expect(result.roundPercent).toBeCloseTo(43.75, 4)
    expect(result.finalEsopPercent).toBeCloseTo(15, 4)
    expect(result.founders[0].postRoundPercent).toBeCloseTo(41.25, 3)
    expect(displayedRowTotal(result)).toBeCloseTo(100, 3)
    expect(result.unknownOwnership).toBeCloseTo(0, 3)
  })

  it('two-step round with a pre-close top-up, a SAFE and warrants', () => {
    const result = calculateEnhancedScenario({
      ...base,
      ...twoStep,
      founders: [{ id: 'f', name: 'Founder', ownershipPercent: 80 }],
      currentEsopPercent: 10,
      targetEsopPercent: 15,
      esopTiming: 'pre-close',
      safes: [{ id: 's', amount: 1, cap: 10, discount: 0 }],
      warrants: [{ id: 'w', name: 'Lender', amount: 1, valuation: 10 }]
    })

    expect(displayedRowTotal(result)).toBeCloseTo(100, 3)
    expect(result.unknownOwnership).toBeCloseTo(0, 3)
  })

  it('post-close ESOP top-up dilutes the SAFE total along with its rows', () => {
    // $5M SAFE at a $50M cap converts to 10%. A 10% post-close pool dilutes
    // everyone by 10%: SAFE 9, round 18, founders (100 − 20 − 10) × 0.9 = 63.
    const result = calculateEnhancedScenario({
      ...base,
      safes: [{ id: 's', amount: 5, cap: 50, discount: 0 }],
      targetEsopPercent: 10,
      esopTiming: 'post-close'
    })

    expect(result.safeDetails[0].totalPercent).toBeCloseTo(9, 4)
    expect(result.totalSafePercent).toBeCloseTo(9, 4)
    expect(result.roundPercent).toBeCloseTo(18, 4)
    expect(result.founders[0].postRoundPercent).toBeCloseTo(63, 4)
    expect(result.finalEsopPercent).toBeCloseTo(10, 4)
    expect(displayedRowTotal(result)).toBeCloseTo(100, 3)
    expect(result.unknownOwnership).toBeCloseTo(0, 3)
  })

  it.each(['pre-close', 'post-close'])(
    'keeps the diluted pool when it is already above the target (%s)',
    (esopTiming) => {
      // A 15% pool diluted by a 20% round is 12%. A 5% target can't shrink it.
      const result = calculateEnhancedScenario({
        ...base,
        founders: [{ id: 'f', name: 'Founder', ownershipPercent: 85 }],
        currentEsopPercent: 15,
        targetEsopPercent: 5,
        esopTiming
      })

      expect(result.esopIncrease).toBe(0)
      expect(result.finalEsopPercent).toBeCloseTo(12, 4)
      expect(result.founders[0].postRoundPercent).toBeCloseTo(68, 4)
      expect(displayedRowTotal(result)).toBeCloseTo(100, 3)
      expect(result.unknownOwnership).toBeCloseTo(0, 3)
    }
  )

  it.each(['pre-close', 'post-close'])(
    'reports the pool actually reached when the target is unreachable (%s)',
    (esopTiming) => {
      // A 90% target can't fit next to a 20% round; the top-up caps at 80.
      const result = calculateEnhancedScenario({ ...base, targetEsopPercent: 90, esopTiming })

      expect(result.finalEsopPercent).toBeCloseTo(80, 4)
      expect(displayedRowTotal(result)).toBeCloseTo(100, 3)
    }
  )
})

describe('firm name matching ignores surrounding whitespace', () => {
  it('attributes a SAFE named "LSVP " to firm "LSVP"', () => {
    const result = calculateEnhancedScenario({
      ...base,
      safes: [{ id: 's', amount: 5, cap: 50, discount: 0, investorName: 'LSVP ', proRata: true }]
    })

    // The SAFE's pro-rata is absorbed by the firm's check, and its ownership
    // counts toward the firm's total. Both follow from the same match.
    expect(result.totalSafeProRataAmount).toBe(0)
    expect(result.combinedInvestor.safePercent).toBeCloseTo(result.safeDetails[0].totalPercent, 4)
    expect(result.combinedInvestor.totalOwnership).toBeCloseTo(
      result.investorPercent + result.safeDetails[0].totalPercent,
      4
    )
  })

  it('combines a prior position whose stored name has a trailing space', () => {
    const result = calculateEnhancedScenario({
      ...base,
      founders: [{ id: 'f', name: 'Founder', ownershipPercent: 90 }],
      priorInvestors: [{ id: 'p', name: 'LSVP ', ownershipPercent: 10, hasProRataRights: true }]
    })

    // 10% prior diluted by the 20% round is 8%; the firm's own pro-rata is not
    // taken out of the Other portion on top of its check.
    expect(result.combinedInvestor.priorDilutedPercent).toBeCloseTo(8, 4)
    expect(result.combinedInvestor.totalOwnership).toBeCloseTo(23, 4)
    expect(result.totalProRataAmount).toBe(0)
  })
})
