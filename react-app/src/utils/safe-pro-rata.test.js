import { describe, it, expect } from 'vitest'
import { calculateEnhancedScenario, calculateEnhancedScenarios } from './multiPartyCalculations'

const baseInputs = {
  postMoneyVal: 100,
  roundSize: 20,
  investorPortion: 15,
  otherPortion: 5,
  investorName: 'LSVP',
  showAdvanced: true,
  safes: [],
  priorInvestors: [],
  founders: [{ id: 99, name: 'Founders', ownershipPercent: 80 }],
  currentEsopPercent: 0,
  targetEsopPercent: 0,
  esopTiming: 'pre-close',
  twoStepEnabled: false,
  step2PostMoney: 0,
  step2Amount: 0,
  step2InvestorPortion: 0,
  step2OtherPortion: 0
}

describe('SAFE Pro-Rata', () => {
  it('does not change results when no SAFE has proRata enabled', () => {
    const result = calculateEnhancedScenario({
      ...baseInputs,
      safes: [
        { id: 1, amount: 2, cap: 10, discount: 0, investorName: 'Acme', proRata: false }
      ]
    })
    expect(result.totalSafeProRataAmount).toBe(0)
    expect(result.otherAmount).toBeCloseTo(5, 2)
  })

  it('deducts SAFE pro-rata from "Other" portion and attributes to the SAFE row', () => {
    // SAFE converts to 25% of company ($2M / $8M cap). Pro-rata = 25% * $20M = $5M,
    // but only $5M available in Other. At boundary.
    const result = calculateEnhancedScenario({
      ...baseInputs,
      safes: [
        { id: 1, amount: 2, cap: 8, discount: 0, investorName: 'Acme', proRata: true }
      ]
    })
    expect(result.error).toBeFalsy()
    expect(result.totalSafeProRataAmount).toBeCloseTo(5, 2)
    expect(result.otherAmount).toBeCloseTo(0, 2) // fully consumed
    const safe = result.safeDetails[0]
    expect(safe.proRata).toBe(true)
    expect(safe.proRataAmount).toBeCloseTo(5, 2)
    expect(safe.proRataPercent).toBeCloseTo(5, 2) // $5M / $100M
  })

  it('errors when prior + SAFE pro-rata combined exceed Other portion', () => {
    const result = calculateEnhancedScenario({
      ...baseInputs,
      otherPortion: 2, // Only $2M other
      investorPortion: 18,
      safes: [
        { id: 1, amount: 1, cap: 10, discount: 0, investorName: 'Acme', proRata: true } // 10% → $2M pro-rata
      ],
      priorInvestors: [
        { id: 10, name: 'Seed Co', ownershipPercent: 10, hasProRataRights: true, proRataOverride: null } // 10% × $20M = $2M
      ],
      founders: [{ id: 99, name: 'Founders', ownershipPercent: 70 }]
    })
    expect(result.error).toBe(true)
    expect(result.errorMessage).toMatch(/exceeds available/)
  })

  it('respects proRataOverride on a SAFE', () => {
    const result = calculateEnhancedScenario({
      ...baseInputs,
      safes: [
        { id: 1, amount: 2, cap: 8, discount: 0, investorName: 'Acme', proRata: true, proRataOverride: 1 }
      ]
    })
    expect(result.error).toBeFalsy()
    expect(result.totalSafeProRataAmount).toBeCloseTo(1, 2)
    expect(result.otherAmount).toBeCloseTo(4, 2)
    expect(result.safeDetails[0].proRataAmount).toBeCloseTo(1, 2)
  })

  it('skips pro-rata for SAFE matching the lead investor name (handled via lead portion)', () => {
    const result = calculateEnhancedScenario({
      ...baseInputs,
      safes: [
        { id: 1, amount: 2, cap: 8, discount: 0, investorName: 'LSVP', proRata: true }
      ]
    })
    expect(result.error).toBeFalsy()
    expect(result.totalSafeProRataAmount).toBe(0)
    expect(result.otherAmount).toBeCloseTo(5, 2) // Other untouched
    expect(result.safeDetails[0].proRataAmount).toBe(0)
  })

  it('keeps total ownership close to 100% with SAFE pro-rata enabled', () => {
    const result = calculateEnhancedScenario({
      ...baseInputs,
      safes: [
        { id: 1, amount: 2, cap: 8, discount: 0, investorName: 'Acme', proRata: true, proRataOverride: 2 }
      ]
    })
    expect(result.error).toBeFalsy()
    expect(result.totalOwnership + result.unknownOwnership).toBeCloseTo(100, 1)
  })

  it('persists SAFE pro-rata fields in permalink round-trip', async () => {
    const { encodeScenarioToURL, decodeScenarioFromURL } = await import('./permalink')
    const encoded = encodeScenarioToURL({
      ...baseInputs,
      safes: [
        { id: 1, amount: 2, cap: 8, discount: 0, investorName: 'Acme', proRata: true, proRataOverride: 1.5 }
      ]
    })
    const decoded = decodeScenarioFromURL(encoded)
    expect(decoded.safes).toHaveLength(1)
    expect(decoded.safes[0].proRata).toBe(true)
    expect(decoded.safes[0].proRataOverride).toBe(1.5)
  })
})

describe('SAFE Pro-Rata in Two-Step Round', () => {
  it('draws SAFE pro-rata from step 2 Other portion', () => {
    const scenarios = calculateEnhancedScenarios({
      ...baseInputs,
      twoStepEnabled: true,
      postMoneyVal: 50,
      roundSize: 10,
      investorPortion: 8,
      otherPortion: 2,
      step2PostMoney: 150,
      step2Amount: 30,
      step2InvestorPortion: 20,
      step2OtherPortion: 10,
      safes: [
        { id: 1, amount: 1, cap: 10, discount: 0, investorName: 'Acme', proRata: true }
        // Converts at $10M on $40M pre-money → ~10% pre-round, pro-rata on $30M step-2 = $3M (of $10M other)
      ]
    })
    const base = scenarios[0]
    expect(base.error).toBeFalsy()
    expect(base.totalSafeProRataAmount).toBeGreaterThan(0)
    expect(base.safeDetails[0].proRataAmount).toBeGreaterThan(0)
  })
})
