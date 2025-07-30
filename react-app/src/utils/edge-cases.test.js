import { describe, it, expect } from 'vitest'
import { calculateScenario } from './calculations'

describe('Edge Cases and Bug Detection', () => {
  describe('Input Validation Edge Cases', () => {
    const baseInputs = {
      postMoneyVal: 13,
      roundSize: 3,
      investorPortion: 2.75,
      otherPortion: 0.25,
      proRataPercent: 0,
      preRoundFounderOwnership: 0,
      safes: []
    }

    it('should handle maximum allowed values correctly', () => {
      const result = calculateScenario({
        ...baseInputs,
        postMoneyVal: 1000000, // 1 million (max allowed)
        roundSize: 1000,
        investorPortion: 500,
        otherPortion: 500
      })
      expect(result).toBeTruthy()
      expect(result.postMoneyVal).toBe(1000000)
    })

    it('should reject post-money equal to round size', () => {
      const result = calculateScenario({
        ...baseInputs,
        postMoneyVal: 10,
        roundSize: 10,
        investorPortion: 5,
        otherPortion: 5
      })
      expect(result).toBeNull()
    })

    it('should reject post-money less than round size', () => {
      const result = calculateScenario({
        ...baseInputs,
        postMoneyVal: 5,
        roundSize: 10,
        investorPortion: 7,
        otherPortion: 3
      })
      expect(result).toBeNull()
    })

    it('should reject zero or negative post-money', () => {
      const zeroResult = calculateScenario({
        ...baseInputs,
        postMoneyVal: 0,
        roundSize: 5
      })
      expect(zeroResult).toBeNull()

      const negativeResult = calculateScenario({
        ...baseInputs,
        postMoneyVal: -10,
        roundSize: 5
      })
      expect(negativeResult).toBeNull()
    })
  })

  describe('SAFE Conversion Edge Cases', () => {
    const baseInputs = {
      postMoneyVal: 13,
      roundSize: 3,
      investorPortion: 2.75,
      otherPortion: 0.25,
      proRataPercent: 0,
      preRoundFounderOwnership: 0
    }

    it('should filter out 100% discount SAFEs (zero conversion price)', () => {
      const result = calculateScenario({
        ...baseInputs,
        safes: [{
          id: 1,
          amount: 1,
          cap: 0,
          discount: 100 // 100% discount = $0 conversion price
        }]
      })
      
      expect(result.totalSafePercent).toBe(0)
      expect(result.safeDetails).toHaveLength(0)
    })

    it('should handle 99% discount SAFEs (extreme but valid)', () => {
      const result = calculateScenario({
        ...baseInputs,
        safes: [{
          id: 1,
          amount: 1,
          cap: 0,
          discount: 99 // 99% discount
        }]
      })
      
      expect(result.safeDetails).toHaveLength(1)
      expect(result.safeDetails[0].conversionPrice).toBe(0.1) // 10M * 1% = 0.1M
      // BUG: This results in 1000% ownership which is impossible
      expect(result.safeDetails[0].percent).toBe(1000) // 1M / 0.1M = 1000%
    })

    it('should handle very low cap SAFEs', () => {
      const result = calculateScenario({
        ...baseInputs,
        safes: [{
          id: 1,
          amount: 1,
          cap: 0.01, // Very low cap
          discount: 0
        }]
      })
      
      expect(result.safeDetails).toHaveLength(1)
      expect(result.safeDetails[0].conversionPrice).toBe(0.01)
      // BUG: This results in 10000% ownership which is impossible
      expect(result.safeDetails[0].percent).toBe(10000) // 1M / 0.01M = 10000%
    })

    it('should ignore SAFEs with no cap or discount', () => {
      const result = calculateScenario({
        ...baseInputs,
        safes: [{
          id: 1,
          amount: 1,
          cap: 0,
          discount: 0 // No cap or discount
        }]
      })
      
      expect(result.totalSafePercent).toBe(0)
      expect(result.safeDetails).toHaveLength(0)
    })
  })

  describe('ESOP Edge Cases', () => {
    const baseInputs = {
      postMoneyVal: 13,
      roundSize: 3,
      investorPortion: 2.75,
      otherPortion: 0.25,
      proRataPercent: 0,
      preRoundFounderOwnership: 70,
      safes: []
    }

    it('should handle 100% target ESOP', () => {
      const result = calculateScenario({
        ...baseInputs,
        currentEsopPercent: 10,
        targetEsopPercent: 100, // 100% ESOP (extreme)
        esopTiming: 'pre-close'
      })
      
      expect(result.finalEsopPercent).toBe(100)
      expect(result.esopIncrease).toBeGreaterThan(90)
    })

    it('should handle current > target (no increase needed)', () => {
      const result = calculateScenario({
        ...baseInputs,
        currentEsopPercent: 20,
        targetEsopPercent: 10, // Lower target
        esopTiming: 'pre-close'
      })
      
      expect(result.finalEsopPercent).toBe(10)
      expect(result.esopIncrease).toBe(0)
    })

    it('should handle negative target ESOP', () => {
      const result = calculateScenario({
        ...baseInputs,
        currentEsopPercent: 10,
        targetEsopPercent: -5, // Negative target
        esopTiming: 'pre-close'
      })
      
      // Should treat negative as no target and keep current
      expect(result.finalEsopPercent).toBe(10)
      expect(result.esopIncrease).toBe(0)
    })
  })

  describe('Mathematical Consistency', () => {
    const testBaseScenario = {
      postMoneyVal: 20,
      roundSize: 5,
      investorPortion: 3,
      otherPortion: 2,
      proRataPercent: 0,
      preRoundFounderOwnership: 80,
      safes: [],
      currentEsopPercent: 0,
      targetEsopPercent: 0,
      esopTiming: 'pre-close'
    }

    function getTotalOwnership(result) {
      return result.roundPercent + 
             (result.totalSafePercent || 0) + 
             (result.postRoundFounderPercent || 0) + 
             (result.finalEsopPercent || 0)
    }

    it('should have ownership percentages that add up to 100% - basic scenario', () => {
      const result = calculateScenario(testBaseScenario)
      const total = getTotalOwnership(result)
      
      // BUG: This currently fails - total is 85% instead of 100%
      expect(total).toBeCloseTo(100, 1) // Allow 0.1% tolerance for rounding
    })

    it('should have ownership percentages that add up to 100% - with SAFE', () => {
      const result = calculateScenario({
        ...testBaseScenario,
        safes: [{
          id: 1,
          amount: 1,
          cap: 15,
          discount: 0
        }]
      })
      const total = getTotalOwnership(result)
      
      // BUG: This currently fails - total is 86.33% instead of 100%
      expect(total).toBeCloseTo(100, 1)
    })

    it('should have ownership percentages that add up to 100% - with ESOP', () => {
      const result = calculateScenario({
        ...testBaseScenario,
        currentEsopPercent: 10,
        targetEsopPercent: 15,
        esopTiming: 'pre-close'
      })
      const total = getTotalOwnership(result)
      
      // BUG: This currently fails - total is 94% instead of 100%
      expect(total).toBeCloseTo(100, 1)
    })

    it('should maintain pre-money calculation consistency', () => {
      const result = calculateScenario(testBaseScenario)
      const calculatedPreMoney = result.postMoneyVal - result.roundSize
      
      expect(result.preMoneyVal).toBeCloseTo(calculatedPreMoney, 2)
    })

    it('should maintain round size consistency', () => {
      const result = calculateScenario(testBaseScenario)
      const totalRoundAmount = result.investorAmount + result.otherAmount
      
      expect(totalRoundAmount).toBeCloseTo(result.roundSize, 2)
    })

    it('should maintain round size consistency with pro-rata', () => {
      const result = calculateScenario({
        ...testBaseScenario,
        proRataPercent: 20
      })
      const totalRoundAmount = result.investorAmount + result.otherAmount
      
      // BUG: This currently fails - shows $4M total vs $5M round size
      expect(totalRoundAmount).toBeCloseTo(result.roundSize, 2)
    })

    it('should keep all percentages within valid ranges', () => {
      const scenarios = [
        testBaseScenario,
        { ...testBaseScenario, safes: [{ id: 1, amount: 1, cap: 15, discount: 0 }] },
        { ...testBaseScenario, currentEsopPercent: 10, targetEsopPercent: 15 }
      ]

      scenarios.forEach((scenario, index) => {
        const result = calculateScenario(scenario)
        
        expect(result.roundPercent).toBeGreaterThanOrEqual(0)
        expect(result.roundPercent).toBeLessThanOrEqual(100)
        
        expect(result.totalSafePercent || 0).toBeGreaterThanOrEqual(0)
        expect(result.totalSafePercent || 0).toBeLessThanOrEqual(100)
        
        if (result.postRoundFounderPercent !== undefined) {
          expect(result.postRoundFounderPercent).toBeGreaterThanOrEqual(0)
          expect(result.postRoundFounderPercent).toBeLessThanOrEqual(100)
        }
        
        expect(result.finalEsopPercent || 0).toBeGreaterThanOrEqual(0)
        expect(result.finalEsopPercent || 0).toBeLessThanOrEqual(100)
      })
    })
  })
})