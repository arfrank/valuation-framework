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
    // $5M SAFE at a $50M cap owns 10% before the round and 8% after the 20%
    // round; founders keep 100 × 0.9 × 0.8 = 72. A 10% post-close pool then
    // dilutes everyone by 10%: SAFE 7.2, round 18, founders 64.8.
    const result = calculateEnhancedScenario({
      ...base,
      safes: [{ id: 's', amount: 5, cap: 50, discount: 0 }],
      targetEsopPercent: 10,
      esopTiming: 'post-close'
    })

    expect(result.safeDetails[0].totalPercent).toBeCloseTo(7.2, 4)
    expect(result.totalSafePercent).toBeCloseTo(7.2, 4)
    expect(result.roundPercent).toBeCloseTo(18, 4)
    expect(result.founders[0].postRoundPercent).toBeCloseTo(64.8, 4)
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

describe('converted SAFEs are diluted by a priced round', () => {
  // Base: $20M at $100M post (20%), founders 100%.
  it('gives a SAFE converting at the round price the same ownership as new money', () => {
    // $5M of new money buys 5/100 = 5%. A $5M SAFE converting at the round
    // price pays the same price per share, so it must end up with the same 5%.
    const result = calculateEnhancedScenario({
      ...base,
      safes: [{ id: 's', amount: 5, conversionType: 'round-price' }]
    })

    expect(result.otherPercent).toBeCloseTo(5, 4) // $5M of new money
    expect(result.safeDetails[0].totalPercent).toBeCloseTo(5, 4)
    expect(result.founders[0].postRoundPercent).toBeCloseTo(75, 4)
    expect(displayedRowTotal(result)).toBeCloseTo(100, 3)
  })

  it('dilutes a capped SAFE: amount / cap before the round, times (1 − round%) after', () => {
    // $5M at a $50M cap is 10% pre-round and 8% after the 20% round.
    const result = calculateEnhancedScenario({
      ...base,
      safes: [{ id: 's', amount: 5, cap: 50, discount: 0 }]
    })

    expect(result.safeDetails[0].preRoundPercent).toBeCloseTo(10, 4)
    expect(result.safeDetails[0].percent).toBeCloseTo(8, 4)
    expect(result.totalSafePercent).toBeCloseTo(8, 4)
    expect(result.founders[0].postRoundPercent).toBeCloseTo(72, 4)
    expect(displayedRowTotal(result)).toBeCloseTo(100, 3)
  })

  it('dilutes a fixed-percent (YC-style) SAFE the same way', () => {
    // 7% of the pre-round company is 5.6% after a 20% round.
    const result = calculateEnhancedScenario({
      ...base,
      safes: [{ id: 's', amount: 0.125, conversionType: 'fixed-percent', fixedOwnershipPercent: 7 }]
    })

    expect(result.totalSafePercent).toBeCloseTo(5.6, 4)
    expect(result.founders[0].postRoundPercent).toBeCloseTo(74.4, 4)
  })

  it('keeps SAFE pro-rata on the pre-round percentage', () => {
    // 10% pre-round entitles the holder to 10% of the $20M round = $2M.
    const result = calculateEnhancedScenario({
      ...base,
      safes: [{ id: 's', amount: 5, cap: 50, discount: 0, proRata: true }]
    })

    expect(result.totalSafeProRataAmount).toBeCloseTo(2, 4)
    expect(result.safeDetails[0].totalPercent).toBeCloseTo(10, 4) // 8% converted + 2% bought
  })

  it('dilutes through both steps of a two-step round', () => {
    // $1M at a $10M cap is 10% pre-round. Step 1 is 25%, step 2 is 25%:
    // 10 × 0.75 × 0.75 = 5.625. Founders: 100 × 0.9 × 0.75 × 0.75 = 50.625.
    const result = calculateEnhancedScenario({
      ...base,
      ...twoStep,
      safes: [{ id: 's', amount: 1, cap: 10, discount: 0 }]
    })

    expect(result.totalSafePercent).toBeCloseTo(5.625, 4)
    expect(result.founders[0].postRoundPercent).toBeCloseTo(50.625, 4)
    expect(displayedRowTotal(result)).toBeCloseTo(100, 3)
  })

  it('leaves earlier SAFEs undiluted when the round itself is a SAFE', () => {
    const result = calculateEnhancedScenario({
      ...base,
      roundInstrument: 'safe',
      safes: [{ id: 's', amount: 5, cap: 50, discount: 0 }]
    })

    expect(result.totalSafePercent).toBeCloseTo(10, 4)
    expect(result.founders[0].postRoundPercent).toBeCloseTo(70, 4)
  })
})

describe('firm name matching ignores letter case', () => {
  it('combines a prior position entered as "lsvp" with firm "LSVP"', () => {
    const result = calculateEnhancedScenario({
      ...base,
      founders: [{ id: 'f', name: 'Founder', ownershipPercent: 90 }],
      priorInvestors: [{ id: 'p', name: 'lsvp', ownershipPercent: 10, hasProRataRights: true }]
    })

    // 10% prior diluted by the 20% round is 8%, on top of the 15% bought now.
    expect(result.combinedInvestor.priorDilutedPercent).toBeCloseTo(8, 4)
    expect(result.combinedInvestor.totalOwnership).toBeCloseTo(23, 4)
    // The firm's own pro-rata is part of its check, not taken from Other.
    expect(result.totalProRataAmount).toBe(0)
    expect(result.otherPercent).toBeCloseTo(5, 4)
  })

  it('attributes a SAFE entered as "lsvp" to firm "LSVP"', () => {
    const result = calculateEnhancedScenario({
      ...base,
      safes: [{ id: 's', amount: 5, cap: 50, discount: 0, investorName: 'lsvp' }]
    })

    expect(result.combinedInvestor.safePercent).toBeCloseTo(8, 4)
    expect(result.combinedInvestor.totalOwnership).toBeCloseTo(23, 4)
  })

  it('still treats different names as different parties', () => {
    const result = calculateEnhancedScenario({
      ...base,
      founders: [{ id: 'f', name: 'Founder', ownershipPercent: 90 }],
      priorInvestors: [{ id: 'p', name: 'LSVP II', ownershipPercent: 10, hasProRataRights: false }]
    })

    expect(result.combinedInvestor.priorDilutedPercent).toBe(0)
    expect(result.combinedInvestor.totalOwnership).toBeCloseTo(15, 4)
  })
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
