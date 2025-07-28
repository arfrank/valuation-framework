import { describe, it, expect } from 'vitest'
import { calculateScenario } from './calculations'

describe('Founder Ownership Calculations', () => {
  const baseInputs = {
    postMoneyVal: 13,
    roundSize: 3,
    investorPortion: 2.75,
    otherPortion: 0.25,
    proRataPercent: 0,
    safes: []
  }

  describe('Zero Founder Ownership Handling', () => {
    it('should handle preRoundFounderOwnership = 0 correctly', () => {
      const inputs = {
        ...baseInputs,
        preRoundFounderOwnership: 0
      }
      
      const result = calculateScenario(inputs)
      
      expect(result.preRoundFounderPercent).toBe(0)
      expect(result.postRoundFounderPercent).toBe(0)
      expect(result.founderDilution).toBe(0)
    })

    it('should handle undefined preRoundFounderOwnership correctly', () => {
      const inputs = {
        ...baseInputs
        // preRoundFounderOwnership is undefined
      }
      
      const result = calculateScenario(inputs)
      
      expect(result.preRoundFounderPercent).toBe(0)
      expect(result.postRoundFounderPercent).toBe(0)
      expect(result.founderDilution).toBe(0)
    })

    it('should handle null preRoundFounderOwnership correctly', () => {
      const inputs = {
        ...baseInputs,
        preRoundFounderOwnership: null
      }
      
      const result = calculateScenario(inputs)
      
      expect(result.preRoundFounderPercent).toBe(0)
      expect(result.postRoundFounderPercent).toBe(0)
      expect(result.founderDilution).toBe(0)
    })
  })

  describe('Non-zero Founder Ownership', () => {
    it('should calculate correctly with 70% founder ownership', () => {
      const inputs = {
        ...baseInputs,
        preRoundFounderOwnership: 70
      }
      
      const result = calculateScenario(inputs)
      
      // Round is 3M / 13M = 23.08% dilution
      // Founders retain 70% * (100% - 23.08%) = 53.84%
      // Dilution = 70% - 53.84% = 16.16%
      
      expect(result.preRoundFounderPercent).toBe(70)
      expect(result.postRoundFounderPercent).toBe(53.84)
      expect(result.founderDilution).toBe(16.16)
    })

    it('should calculate correctly with founder ownership and SAFE', () => {
      const inputs = {
        ...baseInputs,
        preRoundFounderOwnership: 80,
        safes: [
          { id: 1, amount: 1, cap: 8, discount: 0 }
        ]
      }
      
      const result = calculateScenario(inputs)
      
      // Round: 3M / 13M = 23.08%
      // SAFE: 1M / 8M = 12.5%
      // Total dilution: 23.08% + 12.5% = 35.58%
      // Post-round founder: 80% * (100% - 35.58%) = 51.54%
      // Dilution: 80% - 51.54% = 28.46%
      
      expect(result.preRoundFounderPercent).toBe(80)
      expect(result.postRoundFounderPercent).toBe(51.54)
      expect(result.founderDilution).toBe(28.46)
    })

    it('should handle small founder ownership percentages', () => {
      const inputs = {
        ...baseInputs,
        preRoundFounderOwnership: 5
      }
      
      const result = calculateScenario(inputs)
      
      // Round dilution: 23.08%
      // Post-round founder: 5% * (100% - 23.08%) = 3.85%
      // Dilution: 5% - 3.85% = 1.15%
      
      expect(result.preRoundFounderPercent).toBe(5)
      expect(result.postRoundFounderPercent).toBe(3.85)
      expect(result.founderDilution).toBe(1.15)
    })

    it('should handle 100% founder ownership', () => {
      const inputs = {
        ...baseInputs,
        preRoundFounderOwnership: 100
      }
      
      const result = calculateScenario(inputs)
      
      // Round dilution: 23.08%
      // Post-round founder: 100% * (100% - 23.08%) = 76.92%
      // Dilution: 100% - 76.92% = 23.08%
      
      expect(result.preRoundFounderPercent).toBe(100)
      expect(result.postRoundFounderPercent).toBe(76.92)
      expect(result.founderDilution).toBe(23.08)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very large dilution scenarios', () => {
      const inputs = {
        ...baseInputs,
        preRoundFounderOwnership: 50,
        postMoneyVal: 5, // Very low post-money relative to round size
        roundSize: 4
      }
      
      const result = calculateScenario(inputs)
      
      // Round dilution: 4M / 5M = 80%
      // Post-round founder: 50% * (100% - 80%) = 10%
      // Dilution: 50% - 10% = 40%
      
      expect(result.preRoundFounderPercent).toBe(50)
      expect(result.postRoundFounderPercent).toBe(10)
      expect(result.founderDilution).toBe(40)
    })

    it('should handle fractional founder ownership', () => {
      const inputs = {
        ...baseInputs,
        preRoundFounderOwnership: 65.5
      }
      
      const result = calculateScenario(inputs)
      
      // Round dilution: 23.08%
      // Post-round founder: 65.5% * (100% - 23.08%) = 50.37%
      // Dilution: 65.5% - 50.37% = 15.13%
      
      expect(result.preRoundFounderPercent).toBe(65.5)
      expect(result.postRoundFounderPercent).toBe(50.38)
      expect(result.founderDilution).toBe(15.12)
    })
  })

  describe('Comparison with Old Behavior', () => {
    it('should behave differently than the old 70% default', () => {
      const inputsWithZero = {
        ...baseInputs,
        preRoundFounderOwnership: 0
      }
      
      const inputsWithSeventy = {
        ...baseInputs,
        preRoundFounderOwnership: 70
      }
      
      const resultZero = calculateScenario(inputsWithZero)
      const resultSeventy = calculateScenario(inputsWithSeventy)
      
      // Results should be different
      expect(resultZero.preRoundFounderPercent).not.toBe(resultSeventy.preRoundFounderPercent)
      expect(resultZero.postRoundFounderPercent).not.toBe(resultSeventy.postRoundFounderPercent)
      expect(resultZero.founderDilution).not.toBe(resultSeventy.founderDilution)
      
      // Zero should be zero
      expect(resultZero.preRoundFounderPercent).toBe(0)
      expect(resultZero.postRoundFounderPercent).toBe(0)
      expect(resultZero.founderDilution).toBe(0)
      
      // Seventy should be calculated
      expect(resultSeventy.preRoundFounderPercent).toBe(70)
      expect(resultSeventy.postRoundFounderPercent).toBeGreaterThan(0)
      expect(resultSeventy.founderDilution).toBeGreaterThan(0)
    })
  })
})