import { describe, it, expect } from 'vitest'
import { calculateEnhancedScenario, calculateEnhancedScenarios } from './multiPartyCalculations'

describe('Two-Step Round Calculations', () => {
  const baseTwoStepInputs = {
    postMoneyVal: 400,
    roundSize: 100,
    investorPortion: 75,
    otherPortion: 25,
    investorName: 'Lead VC',
    showAdvanced: false,
    twoStepEnabled: true,
    step2PostMoney: 1000,
    step2Amount: 200,
    step2InvestorPortion: 100,
    step2OtherPortion: 100,
    priorInvestors: [],
    founders: [],
    safes: [],
    currentEsopPercent: 0,
    targetEsopPercent: 0,
    esopTiming: 'pre-close'
  }

  describe('Basic two-step math', () => {
    it('should route to two-step calculation when enabled with valid step 2 inputs', () => {
      const result = calculateEnhancedScenario(baseTwoStepInputs)
      expect(result).not.toBeNull()
      expect(result.twoStepEnabled).toBe(true)
      expect(result.step1).toBeDefined()
      expect(result.step2).toBeDefined()
      expect(result.analytics).toBeDefined()
    })

    it('should fall back to single-round when twoStepEnabled is false', () => {
      const result = calculateEnhancedScenario({
        ...baseTwoStepInputs,
        twoStepEnabled: false
      })
      expect(result).not.toBeNull()
      expect(result.twoStepEnabled).toBeUndefined()
      expect(result.step1).toBeUndefined()
      expect(result.step2).toBeUndefined()
    })

    it('should fall back to single-round when step2PostMoney is 0', () => {
      const result = calculateEnhancedScenario({
        ...baseTwoStepInputs,
        step2PostMoney: 0
      })
      expect(result.step1).toBeUndefined()
    })

    it('should fall back to single-round when step2Amount is 0', () => {
      const result = calculateEnhancedScenario({
        ...baseTwoStepInputs,
        step2Amount: 0
      })
      expect(result.step1).toBeUndefined()
    })

    it('should return null for invalid V1 inputs', () => {
      expect(calculateEnhancedScenario({ ...baseTwoStepInputs, postMoneyVal: 0 })).toBeNull()
      expect(calculateEnhancedScenario({ ...baseTwoStepInputs, roundSize: 0 })).toBeNull()
      expect(calculateEnhancedScenario({ ...baseTwoStepInputs, postMoneyVal: 50, roundSize: 100 })).toBeNull()
    })

    it('should fall back to single-round when step2PostMoney is 0 (not null)', () => {
      // When step2PostMoney is 0, routing sends to single-round which succeeds
      const result = calculateEnhancedScenario({ ...baseTwoStepInputs, step2PostMoney: 0 })
      expect(result).not.toBeNull()
      expect(result.step1).toBeUndefined() // Not a two-step result
    })

    it('should calculate step 1 raw ownership as S1/V1', () => {
      const result = calculateEnhancedScenario(baseTwoStepInputs)
      // S1/V1 = 100/400 = 25%
      expect(result.step1.rawPercent).toBeCloseTo(25, 2)
    })

    it('should calculate step 2 ownership as S2/V2', () => {
      const result = calculateEnhancedScenario(baseTwoStepInputs)
      // S2/V2 = 200/1000 = 20%
      expect(result.step2.percent).toBeCloseTo(20, 2)
    })

    it('should dilute step 1 investors by step 2', () => {
      const result = calculateEnhancedScenario(baseTwoStepInputs)
      // Step 1 raw = 25%, diluted by (V2-S2)/V2 = 800/1000 = 0.8
      // Step 1 final = 25% * 0.8 = 20%
      expect(result.step1.finalPercent).toBeCloseTo(20, 2)
    })

    it('should calculate existing shareholders diluted by both steps', () => {
      const result = calculateEnhancedScenario(baseTwoStepInputs)
      // Existing = (V1-S1)/V1 * (V2-S2)/V2 = 300/400 * 800/1000 = 0.75 * 0.8 = 60%
      // Total round = step1 final + step2 = 20% + 20% = 40%
      // Remaining = 100% - 40% = 60%
      expect(result.roundPercent).toBeCloseTo(40, 2)
    })

    it('should have combined round size of S1 + S2', () => {
      const result = calculateEnhancedScenario(baseTwoStepInputs)
      expect(result.roundSize).toBeCloseTo(300, 2) // 100 + 200
    })
  })

  describe('Per-step investor breakdown', () => {
    it('should split step 1 between investor and other', () => {
      const result = calculateEnhancedScenario(baseTwoStepInputs)
      // Step 1 investor = 75/400 * 100 = 18.75%, diluted by 0.8 => 15%
      expect(result.step1.investorPercent).toBeCloseTo(15, 2)
      // Step 1 other = 25/400 * 100 = 6.25%, diluted by 0.8 => 5%
      expect(result.step1.otherPercent).toBeCloseTo(5, 2)
    })

    it('should split step 2 between investor and other', () => {
      const result = calculateEnhancedScenario(baseTwoStepInputs)
      // Step 2 investor = 100/1000 * 100 = 10%
      expect(result.step2.investorPercent).toBeCloseTo(10, 2)
      // Step 2 other = 100/1000 * 100 = 10%
      expect(result.step2.otherPercent).toBeCloseTo(10, 2)
    })

    it('should calculate combined investor ownership', () => {
      const result = calculateEnhancedScenario(baseTwoStepInputs)
      // Lead: step1 diluted (15%) + step2 (10%) = 25%
      expect(result.investorPercent).toBeCloseTo(25, 2)
    })

    it('should store step amounts correctly', () => {
      const result = calculateEnhancedScenario(baseTwoStepInputs)
      expect(result.step1.amount).toBe(100)
      expect(result.step1.investorAmount).toBe(75)
      expect(result.step1.otherAmount).toBe(25)
      expect(result.step2.amount).toBe(200)
      expect(result.step2.investorAmount).toBe(100)
      expect(result.step2.otherAmount).toBe(100)
    })

    it('should store step valuations correctly', () => {
      const result = calculateEnhancedScenario(baseTwoStepInputs)
      expect(result.step1.postMoney).toBe(400)
      expect(result.step1.preMoney).toBe(300) // 400 - 100
      expect(result.step2.postMoney).toBe(1000)
      expect(result.step2.preMoney).toBe(800) // 1000 - 200
    })
  })

  describe('Ownership sums to 100%', () => {
    it('should sum to 100% in basic case', () => {
      const result = calculateEnhancedScenario(baseTwoStepInputs)
      // Round takes 40%, existing keeps 60%
      // Total = roundPercent + unknownOwnership (or founders/prior if none)
      const total = result.roundPercent + result.unknownOwnership
      expect(total).toBeCloseTo(100, 1)
    })

    it('should sum to 100% with founders and prior investors', () => {
      const result = calculateEnhancedScenario({
        ...baseTwoStepInputs,
        showAdvanced: true,
        priorInvestors: [
          { id: 1, name: 'Seed VC', ownershipPercent: 20, hasProRataRights: false }
        ],
        founders: [
          { id: 2, name: 'CEO', ownershipPercent: 80 }
        ]
      })

      const foundersTotal = result.founders.reduce((s, f) => s + f.postRoundPercent, 0)
      const priorTotal = result.priorInvestors.reduce((s, i) => s + i.postRoundPercent, 0)
      const total = result.roundPercent + foundersTotal + priorTotal + (result.unknownOwnership || 0)
      expect(total).toBeCloseTo(100, 0)
    })

    it('should sum to 100% with the Serval-like example', () => {
      // V1=$400M, S1=$100M, V2=$1B, S2=$200M
      const result = calculateEnhancedScenario({
        ...baseTwoStepInputs,
        showAdvanced: true,
        founders: [
          { id: 1, name: 'Founders', ownershipPercent: 100 }
        ]
      })

      const foundersTotal = result.founders.reduce((s, f) => s + f.postRoundPercent, 0)
      const total = result.roundPercent + foundersTotal
      expect(total).toBeCloseTo(100, 0)
    })
  })

  describe('Analytics calculations', () => {
    it('should calculate headline valuation as V2', () => {
      const result = calculateEnhancedScenario(baseTwoStepInputs)
      expect(result.analytics.headlineValuation).toBe(1000)
    })

    it('should calculate instant markup as (V2/V1 - 1) * 100', () => {
      const result = calculateEnhancedScenario(baseTwoStepInputs)
      // (1000/400 - 1) * 100 = 150%
      expect(result.analytics.instantMarkup).toBeCloseTo(150, 1)
    })

    it('should calculate blended post-money', () => {
      const result = calculateEnhancedScenario(baseTwoStepInputs)
      // Blended = totalRound / roundPercent * 100 = 300 / 40% * 100 = $750M
      expect(result.analytics.blendedPostMoney).toBeCloseTo(750, 0)
    })

    it('should calculate lead effective post-money', () => {
      const result = calculateEnhancedScenario(baseTwoStepInputs)
      // Lead total $ = 75 + 100 = 175
      // Lead raw % = 75/400 + 100/1000 = 18.75% + 10% = 28.75%
      // Effective post-money = 175 / 0.2875 ≈ $608.7M
      expect(result.analytics.leadEffectivePostMoney).toBeCloseTo(608.7, 0)
    })

    it('should have blended pre-money = blended post-money - total round', () => {
      const result = calculateEnhancedScenario(baseTwoStepInputs)
      expect(result.analytics.blendedPreMoney).toBeCloseTo(
        result.analytics.blendedPostMoney - result.roundSize, 0
      )
    })
  })

  describe('Integration with SAFEs', () => {
    it('should convert SAFEs at step 1 pre-money and dilute by step 2', () => {
      const result = calculateEnhancedScenario({
        ...baseTwoStepInputs,
        showAdvanced: true,
        safes: [
          { id: 1, amount: 30, cap: 300, discount: 0 } // Converts at cap of $300M (step 1 pre-money)
        ],
        founders: [
          { id: 2, name: 'Founders', ownershipPercent: 100 }
        ]
      })

      expect(result.totalSafeAmount).toBe(30)
      // SAFE converts at $300M cap: 30/300 = 10%
      // Then diluted by step 2: 10% * 0.8 = 8%
      expect(result.totalSafePercent).toBeCloseTo(8, 1)
    })
  })

  describe('Integration with ESOP', () => {
    it('should apply ESOP after both steps', () => {
      const result = calculateEnhancedScenario({
        ...baseTwoStepInputs,
        showAdvanced: true,
        currentEsopPercent: 0,
        targetEsopPercent: 10,
        founders: [
          { id: 1, name: 'Founders', ownershipPercent: 100 }
        ]
      })

      expect(result.finalEsopPercent).toBe(10)
      // With ESOP, total should still be ~100%
      const foundersTotal = result.founders.reduce((s, f) => s + f.postRoundPercent, 0)
      const total = result.roundPercent + foundersTotal + result.finalEsopPercent + (result.unknownOwnership || 0)
      expect(total).toBeCloseTo(100, 0)
    })
  })

  describe('Integration with pro-rata', () => {
    it('should allocate pro-rata from step 2 other portion', () => {
      const result = calculateEnhancedScenario({
        ...baseTwoStepInputs,
        showAdvanced: true,
        priorInvestors: [
          { id: 1, name: 'Seed VC', ownershipPercent: 20, hasProRataRights: true }
        ],
        founders: [
          { id: 2, name: 'Founders', ownershipPercent: 80 }
        ]
      })

      const seedVC = result.priorInvestors.find(i => i.name === 'Seed VC')
      expect(seedVC.proRataAmount).toBeGreaterThan(0)
      // Pro-rata is calculated on step 2 round size
    })

    it('should not give pro-rata to lead investor matching investorName', () => {
      const result = calculateEnhancedScenario({
        ...baseTwoStepInputs,
        showAdvanced: true,
        priorInvestors: [
          { id: 1, name: 'Lead VC', ownershipPercent: 20, hasProRataRights: true }
        ],
        founders: [
          { id: 2, name: 'Founders', ownershipPercent: 80 }
        ]
      })

      const leadVC = result.priorInvestors.find(i => i.name === 'Lead VC')
      expect(leadVC.proRataAmount).toBe(0)
    })
  })

  describe('Combined investor', () => {
    it('should combine lead investor across step 1 + step 2 + prior equity', () => {
      const result = calculateEnhancedScenario({
        ...baseTwoStepInputs,
        showAdvanced: true,
        priorInvestors: [
          { id: 1, name: 'Lead VC', ownershipPercent: 10, hasProRataRights: false }
        ],
        founders: [
          { id: 2, name: 'Founders', ownershipPercent: 90 }
        ]
      })

      expect(result.combinedInvestor).not.toBeNull()
      expect(result.combinedInvestor.name).toBe('Lead VC')
      // Total new investment = step1 investor + step2 investor
      expect(result.combinedInvestor.totalNewInvestment).toBeCloseTo(175, 1) // 75 + 100
      // Total ownership > just the round portions (includes diluted prior equity)
      expect(result.combinedInvestor.totalOwnership).toBeGreaterThan(result.investorPercent)
    })
  })

  describe('Scenario variations', () => {
    it('should generate scenario variations for two-step rounds', () => {
      const scenarios = calculateEnhancedScenarios(baseTwoStepInputs)
      expect(Array.isArray(scenarios)).toBe(true)
      expect(scenarios.length).toBeGreaterThan(1)

      // Base case should have two-step data
      const base = scenarios[0]
      expect(base.twoStepEnabled).toBe(true)
      expect(base.step1).toBeDefined()
      expect(base.step2).toBeDefined()
      expect(base.isBase).toBe(true)
    })

    it('should scale V1 and V2 together in valuation variations', () => {
      const scenarios = calculateEnhancedScenarios(baseTwoStepInputs)
      const base = scenarios[0]
      // Find the 0.5x valuation scenario
      const halfVal = scenarios.find(s => s.title === '0.5x Valuation')
      expect(halfVal).toBeDefined()

      // V1 should be halved
      expect(halfVal.step1.postMoney).toBeCloseTo(base.step1.postMoney * 0.5, 1)
      // V2 should be halved
      expect(halfVal.step2.postMoney).toBeCloseTo(base.step2.postMoney * 0.5, 1)
    })

    it('should scale S1 and S2 together in round size variations', () => {
      const scenarios = calculateEnhancedScenarios(baseTwoStepInputs)
      const base = scenarios[0]
      const halfRound = scenarios.find(s => s.title === 'Half Round Size')
      expect(halfRound).toBeDefined()

      expect(halfRound.step1.amount).toBeCloseTo(base.step1.amount * 0.5, 1)
      expect(halfRound.step2.amount).toBeCloseTo(base.step2.amount * 0.5, 1)
    })

    it('should maintain V1/V2 ratio across variations', () => {
      const scenarios = calculateEnhancedScenarios(baseTwoStepInputs)
      const base = scenarios[0]
      const baseRatio = base.step2.postMoney / base.step1.postMoney

      scenarios.forEach(scenario => {
        if (scenario.step1 && scenario.step2) {
          const ratio = scenario.step2.postMoney / scenario.step1.postMoney
          expect(ratio).toBeCloseTo(baseRatio, 1)
        }
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle V2 = V1 (no markup)', () => {
      const result = calculateEnhancedScenario({
        ...baseTwoStepInputs,
        step2PostMoney: 400 // same as V1
      })
      expect(result).not.toBeNull()
      expect(result.analytics.instantMarkup).toBeCloseTo(0, 1)
    })

    it('should handle very small step 2', () => {
      const result = calculateEnhancedScenario({
        ...baseTwoStepInputs,
        step2Amount: 1,
        step2InvestorPortion: 0.5,
        step2OtherPortion: 0.5
      })
      expect(result).not.toBeNull()
      expect(result.step2.percent).toBeGreaterThan(0)
    })

    it('should handle large V2/V1 ratio', () => {
      const result = calculateEnhancedScenario({
        ...baseTwoStepInputs,
        step2PostMoney: 10000 // 25x markup
      })
      expect(result).not.toBeNull()
      expect(result.analytics.instantMarkup).toBeCloseTo(2400, 0) // (10000/400 - 1) * 100
    })

    it('should handle all step 2 going to investor (no other)', () => {
      const result = calculateEnhancedScenario({
        ...baseTwoStepInputs,
        step2InvestorPortion: 200,
        step2OtherPortion: 0
      })
      expect(result).not.toBeNull()
      expect(result.step2.investorPercent).toBeGreaterThan(0)
    })
  })
})
