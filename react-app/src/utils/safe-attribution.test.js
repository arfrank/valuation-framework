import { describe, it, expect } from 'vitest'
import { calculateEnhancedScenarios } from './multiPartyCalculations'

describe('SAFE Attribution to Lead Investor', () => {
  const baseInputs = {
    postMoneyVal: 250,
    roundSize: 50,
    investorPortion: 35,
    otherPortion: 15,
    investorName: 'LSVP',
    showAdvanced: true,
    proRataPercent: 0,
    safes: [],
    priorInvestors: [],
    founders: [],
    currentEsopPercent: 0,
    targetEsopPercent: 0,
    esopTiming: 'pre-close',
    twoStepEnabled: false,
    step2PostMoney: 0,
    step2Amount: 0,
    step2InvestorPortion: 0,
    step2OtherPortion: 0
  }

  it('should pass investorName through safeDetails', () => {
    const inputs = {
      ...baseInputs,
      safes: [
        { id: 1, amount: 2, cap: 0, discount: 20, investorName: 'LSVP' },
        { id: 2, amount: 1, cap: 10, discount: 0, investorName: '' }
      ]
    }
    const scenarios = calculateEnhancedScenarios(inputs)
    const base = scenarios[0]

    expect(base.safeDetails[0].investorName).toBe('LSVP')
    expect(base.safeDetails[1].investorName).toBe('')
  })

  it('should include attributed SAFE in combinedInvestor.safePercent when prior investor matches', () => {
    const inputs = {
      ...baseInputs,
      safes: [{ id: 1, amount: 2, cap: 0, discount: 20, investorName: 'LSVP' }],
      priorInvestors: [
        { id: 10, name: 'LSVP', ownershipPercent: 5, hasProRataRights: false }
      ]
    }
    const scenarios = calculateEnhancedScenarios(inputs)
    const base = scenarios[0]

    expect(base.combinedInvestor).not.toBeNull()
    expect(base.combinedInvestor.safePercent).toBeGreaterThan(0)
    // totalOwnership = round + prior + safe
    expect(base.combinedInvestor.totalOwnership).toBeCloseTo(
      base.combinedInvestor.investorRoundPercent +
      base.combinedInvestor.priorDilutedPercent +
      base.combinedInvestor.safePercent,
      2
    )
  })

  it('should create combinedInvestor even without prior equity if SAFE is attributed', () => {
    const inputs = {
      ...baseInputs,
      safes: [{ id: 1, amount: 2, cap: 0, discount: 20, investorName: 'LSVP' }],
      priorInvestors: []
    }
    const scenarios = calculateEnhancedScenarios(inputs)
    const base = scenarios[0]

    expect(base.combinedInvestor).not.toBeNull()
    expect(base.combinedInvestor.safePercent).toBeGreaterThan(0)
    expect(base.combinedInvestor.priorDilutedPercent).toBe(0)
    expect(base.combinedInvestor.totalOwnership).toBeCloseTo(
      base.combinedInvestor.investorRoundPercent + base.combinedInvestor.safePercent,
      2
    )
  })

  it('should NOT create combinedInvestor for unattributed SAFEs with no prior match', () => {
    const inputs = {
      ...baseInputs,
      safes: [{ id: 1, amount: 2, cap: 0, discount: 20, investorName: '' }],
      priorInvestors: []
    }
    const scenarios = calculateEnhancedScenarios(inputs)
    const base = scenarios[0]

    expect(base.combinedInvestor).toBeNull()
  })

  it('should NOT include unattributed SAFE in combinedInvestor.safePercent', () => {
    const inputs = {
      ...baseInputs,
      safes: [
        { id: 1, amount: 2, cap: 0, discount: 20, investorName: '' },
        { id: 2, amount: 1, cap: 10, discount: 0, investorName: 'Other VC' }
      ],
      priorInvestors: [
        { id: 10, name: 'LSVP', ownershipPercent: 5, hasProRataRights: false }
      ]
    }
    const scenarios = calculateEnhancedScenarios(inputs)
    const base = scenarios[0]

    expect(base.combinedInvestor).not.toBeNull()
    expect(base.combinedInvestor.safePercent).toBe(0)
  })

  it('should aggregate multiple attributed SAFEs', () => {
    const inputs = {
      ...baseInputs,
      safes: [
        { id: 1, amount: 2, cap: 0, discount: 20, investorName: 'LSVP' },
        { id: 2, amount: 1, cap: 10, discount: 0, investorName: 'LSVP' }
      ],
      priorInvestors: []
    }
    const scenarios = calculateEnhancedScenarios(inputs)
    const base = scenarios[0]

    expect(base.combinedInvestor).not.toBeNull()
    // Both SAFEs should be summed
    const expectedSafePercent = base.safeDetails
      .filter(s => s.investorName === 'LSVP')
      .reduce((sum, s) => sum + s.percent, 0)
    expect(base.combinedInvestor.safePercent).toBeCloseTo(expectedSafePercent, 4)
  })

  it('should work with two-step rounds', () => {
    const inputs = {
      ...baseInputs,
      safes: [{ id: 1, amount: 2, cap: 0, discount: 20, investorName: 'LSVP' }],
      priorInvestors: [
        { id: 10, name: 'LSVP', ownershipPercent: 5, hasProRataRights: false }
      ],
      twoStepEnabled: true,
      step2PostMoney: 500,
      step2Amount: 100,
      step2InvestorPortion: 60,
      step2OtherPortion: 40
    }
    const scenarios = calculateEnhancedScenarios(inputs)
    const base = scenarios[0]

    expect(base.twoStepEnabled).toBe(true)
    expect(base.combinedInvestor).not.toBeNull()
    expect(base.combinedInvestor.safePercent).toBeGreaterThan(0)
    // SAFE should be diluted by step 2
    expect(base.combinedInvestor.totalOwnership).toBeCloseTo(
      base.combinedInvestor.investorRoundPercent +
      base.combinedInvestor.priorDilutedPercent +
      base.combinedInvestor.safePercent,
      2
    )
  })

  it('should create combinedInvestor for two-step with attributed SAFE but no prior', () => {
    const inputs = {
      ...baseInputs,
      safes: [{ id: 1, amount: 2, cap: 0, discount: 20, investorName: 'LSVP' }],
      priorInvestors: [],
      twoStepEnabled: true,
      step2PostMoney: 500,
      step2Amount: 100,
      step2InvestorPortion: 60,
      step2OtherPortion: 40
    }
    const scenarios = calculateEnhancedScenarios(inputs)
    const base = scenarios[0]

    expect(base.combinedInvestor).not.toBeNull()
    expect(base.combinedInvestor.safePercent).toBeGreaterThan(0)
    expect(base.combinedInvestor.priorDilutedPercent).toBe(0)
  })
})
