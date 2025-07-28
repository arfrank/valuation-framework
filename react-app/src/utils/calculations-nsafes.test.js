import { describe, it, expect } from 'vitest'
import { calculateScenario } from './calculations'

describe('N SAFEs Calculations', () => {
  const baseInputs = {
    postMoneyVal: 13,
    roundSize: 3,
    investorPortion: 2.75,
    otherPortion: 0.25,
    proRataPercent: 0,
    preRoundFounderOwnership: 0
  }

  describe('Multiple SAFEs Array Processing', () => {
    it('should calculate multiple SAFEs with different terms', () => {
      const inputs = {
        ...baseInputs,
        safes: [
          { id: 1, amount: 1, cap: 8, discount: 0 },    // Cap-only SAFE
          { id: 2, amount: 0.5, cap: 0, discount: 20 }, // Discount-only SAFE
          { id: 3, amount: 0.75, cap: 6, discount: 30 } // Both cap and discount
        ]
      }
      
      const result = calculateScenario(inputs)
      
      // Pre-money = 13 - 3 = 10M
      expect(result.preMoneyVal).toBe(10)
      
      // Verify individual SAFE calculations
      expect(result.safeDetails).toHaveLength(3)
      
      // SAFE 1: 1M at 8M cap = 12.5%
      expect(result.safeDetails[0].amount).toBe(1)
      expect(result.safeDetails[0].conversionPrice).toBe(8)
      expect(result.safeDetails[0].percent).toBe(12.5)
      
      // SAFE 2: 0.5M at 20% discount (10M * 0.8 = 8M) = 6.25%
      expect(result.safeDetails[1].amount).toBe(0.5)
      expect(result.safeDetails[1].conversionPrice).toBe(8)
      expect(result.safeDetails[1].percent).toBe(6.25)
      
      // SAFE 3: 0.75M, cap=6M vs discount=7M (30% discount), use cap = 12.5%
      expect(result.safeDetails[2].amount).toBe(0.75)
      expect(result.safeDetails[2].conversionPrice).toBe(6)
      expect(result.safeDetails[2].percent).toBe(12.5)
      
      // Total SAFE percentage should be sum: 12.5 + 6.25 + 12.5 = 31.25%
      expect(result.totalSafePercent).toBe(31.25)
      expect(result.totalSafeAmount).toBe(2.25)
    })

    it('should handle empty SAFEs array', () => {
      const inputs = {
        ...baseInputs,
        safes: []
      }
      
      const result = calculateScenario(inputs)
      
      expect(result.safeDetails).toEqual([])
      expect(result.totalSafeAmount).toBe(0)
      expect(result.totalSafePercent).toBe(0)
    })

    it('should filter out SAFEs with zero amount', () => {
      const inputs = {
        ...baseInputs,
        safes: [
          { id: 1, amount: 0, cap: 8, discount: 0 },    // Zero amount - should be ignored
          { id: 2, amount: 1, cap: 8, discount: 0 },    // Valid SAFE
          { id: 3, amount: 0, cap: 0, discount: 20 }    // Zero amount - should be ignored
        ]
      }
      
      const result = calculateScenario(inputs)
      
      expect(result.safeDetails).toHaveLength(1)
      expect(result.safeDetails[0].amount).toBe(1)
      expect(result.totalSafeAmount).toBe(1)
    })

    it('should ignore SAFEs with no cap or discount', () => {
      const inputs = {
        ...baseInputs,
        safes: [
          { id: 1, amount: 1, cap: 0, discount: 0 },    // Invalid - no terms
          { id: 2, amount: 1, cap: 8, discount: 0 }     // Valid - has cap
        ]
      }
      
      const result = calculateScenario(inputs)
      
      expect(result.safeDetails).toHaveLength(1)
      expect(result.safeDetails[0].amount).toBe(1)
      expect(result.safeDetails[0].cap).toBe(8)
    })
  })

  describe('Backward Compatibility with Legacy SAFE', () => {
    it('should process both N SAFEs and legacy SAFE fields', () => {
      const inputs = {
        ...baseInputs,
        // N SAFEs
        safes: [
          { id: 1, amount: 1, cap: 8, discount: 0 }
        ],
        // Legacy SAFE
        safeAmount: 0.5,
        safeCap: 6,
        safeDiscount: 0
      }
      
      const result = calculateScenario(inputs)
      
      // Should have 1 SAFE from array
      expect(result.safeDetails).toHaveLength(1)
      expect(result.safeDetails[0].amount).toBe(1)
      
      // Total should include both N SAFEs and legacy SAFE
      expect(result.totalSafeAmount).toBe(1.5) // 1 + 0.5
      
      // Legacy fields should still be present for backward compatibility
      expect(result.safeAmount).toBe(0.5)
      expect(result.safeCap).toBe(6)
    })

    it('should work with only legacy SAFE fields', () => {
      const inputs = {
        ...baseInputs,
        safeAmount: 1,
        safeCap: 8,
        safeDiscount: 0
      }
      
      const result = calculateScenario(inputs)
      
      expect(result.safeDetails).toEqual([])
      expect(result.safeAmount).toBe(1)
      expect(result.safeCap).toBe(8)
      expect(result.totalSafeAmount).toBe(1)
      expect(result.totalSafePercent).toBe(12.5) // 1M / 8M
    })
  })

  describe('Complex SAFE Scenarios', () => {
    it('should handle large number of SAFEs', () => {
      const safes = []
      for (let i = 1; i <= 10; i++) {
        safes.push({
          id: i,
          amount: 0.1,
          cap: 8,
          discount: 0
        })
      }

      const inputs = {
        ...baseInputs,
        safes: safes
      }
      
      const result = calculateScenario(inputs)
      
      expect(result.safeDetails).toHaveLength(10)
      expect(result.totalSafeAmount).toBe(1) // 10 × 0.1
      expect(result.totalSafePercent).toBe(12.5) // 1M / 8M
    })

    it('should handle SAFEs with very high discounts', () => {
      const inputs = {
        ...baseInputs,
        safes: [
          { id: 1, amount: 1, cap: 0, discount: 80 } // 80% discount
        ]
      }
      
      const result = calculateScenario(inputs)
      
      // Pre-money = 10M, 80% discount = 2M conversion price
      expect(result.safeDetails[0].conversionPrice).toBe(2)
      expect(result.safeDetails[0].percent).toBe(50) // 1M / 2M = 50%
    })

    it('should choose better of cap vs discount for each SAFE', () => {
      const inputs = {
        ...baseInputs,
        safes: [
          { id: 1, amount: 1, cap: 5, discount: 30 },   // Cap better: 5M vs 7M
          { id: 2, amount: 1, cap: 12, discount: 30 }   // Discount better: 7M vs 12M
        ]
      }
      
      const result = calculateScenario(inputs)
      
      // SAFE 1 should use cap (5M)
      expect(result.safeDetails[0].conversionPrice).toBe(5)
      expect(result.safeDetails[0].percent).toBe(20) // 1M / 5M
      
      // SAFE 2 should use discount (7M)
      expect(result.safeDetails[1].conversionPrice).toBe(7)
      expect(result.safeDetails[1].percent).toBe(14.29) // 1M / 7M (rounded)
    })
  })

  describe('Data Structure Validation', () => {
    it('should include all expected fields in result', () => {
      const inputs = {
        ...baseInputs,
        safes: [
          { id: 1, amount: 1, cap: 8, discount: 20 }
        ]
      }
      
      const result = calculateScenario(inputs)
      
      // Check N SAFEs fields
      expect(result).toHaveProperty('safes')
      expect(result).toHaveProperty('safeDetails')
      expect(result).toHaveProperty('totalSafeAmount')
      expect(result).toHaveProperty('totalSafePercent')
      
      // Check legacy fields still exist
      expect(result).toHaveProperty('safeAmount')
      expect(result).toHaveProperty('safeCap')
      expect(result).toHaveProperty('safeDiscount')
      expect(result).toHaveProperty('safeConversionPrice')
      expect(result).toHaveProperty('safePercent')
      
      // Check safeDetails structure
      expect(result.safeDetails[0]).toHaveProperty('id')
      expect(result.safeDetails[0]).toHaveProperty('index')
      expect(result.safeDetails[0]).toHaveProperty('amount')
      expect(result.safeDetails[0]).toHaveProperty('cap')
      expect(result.safeDetails[0]).toHaveProperty('discount')
      expect(result.safeDetails[0]).toHaveProperty('conversionPrice')
      expect(result.safeDetails[0]).toHaveProperty('percent')
    })

    it('should pass through original safes array', () => {
      const originalSafes = [
        { id: 1, amount: 1, cap: 8, discount: 0 },
        { id: 2, amount: 0.5, cap: 0, discount: 20 }
      ]
      
      const inputs = {
        ...baseInputs,
        safes: originalSafes
      }
      
      const result = calculateScenario(inputs)
      
      expect(result.safes).toEqual(originalSafes)
    })
  })
})