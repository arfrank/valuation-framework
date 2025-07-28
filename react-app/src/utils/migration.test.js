import { describe, it, expect } from 'vitest'
import { calculateScenario } from './calculations'
import { encodeScenarioToURL, decodeScenarioFromURL } from './permalink'

describe('N SAFEs Migration and Backward Compatibility', () => {
  const baseInputs = {
    postMoneyVal: 13,
    roundSize: 3,
    investorPortion: 2.75,
    otherPortion: 0.25,
    investorName: 'US',
    proRataPercent: 0,
    preRoundFounderOwnership: 0
  }

  describe('Legacy to N SAFEs Migration', () => {
    it('should handle data with only legacy SAFE fields', () => {
      const legacyData = {
        ...baseInputs,
        safeAmount: 1,
        safeCap: 8,
        safeDiscount: 20,
        safes: [] // Empty array
      }
      
      const result = calculateScenario(legacyData)
      
      // Should work with legacy fields
      expect(result.safeAmount).toBe(1)
      expect(result.safeCap).toBe(8)
      expect(result.safeDiscount).toBe(20)
      expect(result.safePercent).toBe(12.5) // 1M / 8M (discount is better than cap)
      
      // N SAFEs fields should be empty/zero
      expect(result.safeDetails).toEqual([])
      expect(result.totalSafeAmount).toBe(1) // Includes legacy SAFE
      expect(result.totalSafePercent).toBe(12.5)
    })

    it('should handle URL with legacy SAFE parameters', () => {
      const legacyURL = 'pmv=13&rs=3&ip=2.75&op=0.25&in=US&adv=1&sa=1&sc=8&sd=20'
      const decoded = decodeScenarioFromURL(legacyURL)
      
      expect(decoded.safeAmount).toBe(1)
      expect(decoded.safeCap).toBe(8)
      expect(decoded.safeDiscount).toBe(20)
      expect(decoded.safes).toEqual([])
      expect(decoded.showAdvanced).toBe(true)
    })

    it('should migrate data by converting legacy SAFE to N SAFEs format', () => {
      const legacyData = {
        ...baseInputs,
        safeAmount: 1,
        safeCap: 8,
        safeDiscount: 20
      }
      
      // Simulate migration by creating equivalent N SAFEs array
      const migratedData = {
        ...baseInputs,
        safes: [
          {
            id: 1,
            amount: legacyData.safeAmount,
            cap: legacyData.safeCap,
            discount: legacyData.safeDiscount
          }
        ],
        // Clear legacy fields after migration
        safeAmount: 0,
        safeCap: 0,
        safeDiscount: 0
      }
      
      const legacyResult = calculateScenario(legacyData)
      const migratedResult = calculateScenario(migratedData)
      
      // Results should be equivalent
      expect(migratedResult.totalSafeAmount).toBe(legacyResult.safeAmount)
      expect(migratedResult.totalSafePercent).toBe(legacyResult.safePercent)
      expect(migratedResult.safeDetails[0].amount).toBe(1)
      expect(migratedResult.safeDetails[0].cap).toBe(8)
      expect(migratedResult.safeDetails[0].discount).toBe(20)
    })
  })

  describe('Coexistence of Legacy and N SAFEs', () => {
    it('should handle both legacy SAFE and N SAFEs simultaneously', () => {
      const mixedData = {
        ...baseInputs,
        // Legacy SAFE
        safeAmount: 1,
        safeCap: 8,
        safeDiscount: 0,
        // N SAFEs
        safes: [
          { id: 1, amount: 0.5, cap: 6, discount: 0 },
          { id: 2, amount: 0.25, cap: 0, discount: 30 }
        ]
      }
      
      const result = calculateScenario(mixedData)
      
      // Legacy SAFE: 1M / 8M = 12.5%
      // SAFE 1: 0.5M / 6M = 8.33%
      // SAFE 2: 0.25M / 7M (30% discount) = 3.57%
      // Total: 12.5 + 8.33 + 3.57 = 24.4%
      
      expect(result.totalSafeAmount).toBe(1.75) // 1 + 0.5 + 0.25
      expect(result.safeDetails).toHaveLength(2)
      expect(result.safeAmount).toBe(1) // Legacy field preserved
      expect(result.safeCap).toBe(8) // Legacy field preserved
    })

    it('should encode both legacy and N SAFEs in URL', () => {
      const mixedData = {
        ...baseInputs,
        showAdvanced: true,
        safeAmount: 1,
        safeCap: 8,
        safeDiscount: 20,
        safes: [
          { id: 1, amount: 0.5, cap: 6, discount: 0 }
        ]
      }
      
      const encoded = encodeScenarioToURL(mixedData)
      
      expect(encoded).toMatch(/sa=1/)
      expect(encoded).toMatch(/sc=8/)
      expect(encoded).toMatch(/sd=20/)
      expect(encoded).toMatch(/safes=/)
    })

    it('should decode both legacy and N SAFEs from URL', () => {
      const safesJson = JSON.stringify([{ a: 0.5, c: 6, d: 0 }])
      const mixedURL = `pmv=13&rs=3&ip=2.75&op=0.25&in=US&adv=1&sa=1&sc=8&sd=20&safes=${encodeURIComponent(safesJson)}`
      
      const decoded = decodeScenarioFromURL(mixedURL)
      
      expect(decoded.safeAmount).toBe(1)
      expect(decoded.safeCap).toBe(8)
      expect(decoded.safeDiscount).toBe(20)
      expect(decoded.safes).toHaveLength(1)
      expect(decoded.safes[0].amount).toBe(0.5)
      expect(decoded.safes[0].cap).toBe(6)
    })
  })

  describe('N SAFEs to Legacy Compatibility', () => {
    it('should allow reverting from N SAFEs to legacy format', () => {
      const nSafesData = {
        ...baseInputs,
        safes: [
          { id: 1, amount: 1, cap: 8, discount: 20 }
        ]
      }
      
      // Simulate reverting to legacy format
      const revertedData = {
        ...baseInputs,
        safeAmount: nSafesData.safes[0].amount,
        safeCap: nSafesData.safes[0].cap,
        safeDiscount: nSafesData.safes[0].discount,
        safes: []
      }
      
      const nSafesResult = calculateScenario(nSafesData)
      const revertedResult = calculateScenario(revertedData)
      
      // Results should be equivalent
      expect(revertedResult.safeAmount).toBe(nSafesResult.totalSafeAmount)
      expect(revertedResult.safePercent).toBe(nSafesResult.totalSafePercent)
    })

    it('should handle conversion of multiple SAFEs to single legacy SAFE', () => {
      const multipleSafesData = {
        ...baseInputs,
        safes: [
          { id: 1, amount: 0.5, cap: 8, discount: 0 },
          { id: 2, amount: 0.5, cap: 8, discount: 0 }
        ]
      }
      
      // Convert multiple SAFEs to single legacy SAFE (sum amounts)
      const totalAmount = multipleSafesData.safes.reduce((sum, safe) => sum + safe.amount, 0)
      const consolidatedData = {
        ...baseInputs,
        safeAmount: totalAmount,
        safeCap: 8,
        safeDiscount: 0,
        safes: []
      }
      
      const multipleResult = calculateScenario(multipleSafesData)
      const consolidatedResult = calculateScenario(consolidatedData)
      
      // Total amounts should match
      expect(consolidatedResult.safeAmount).toBe(multipleResult.totalSafeAmount)
      expect(consolidatedResult.safePercent).toBe(multipleResult.totalSafePercent)
    })
  })

  describe('Data Validation and Edge Cases', () => {
    it('should handle undefined safes array gracefully', () => {
      const dataWithUndefinedSafes = {
        ...baseInputs,
        safes: undefined,
        safeAmount: 1,
        safeCap: 8,
        safeDiscount: 0
      }
      
      const result = calculateScenario(dataWithUndefinedSafes)
      
      expect(result.safeDetails).toEqual([])
      expect(result.totalSafeAmount).toBe(1) // From legacy SAFE
      expect(result.safeAmount).toBe(1)
    })

    it('should handle null safes array gracefully', () => {
      const dataWithNullSafes = {
        ...baseInputs,
        safes: null,
        safeAmount: 1,
        safeCap: 8,
        safeDiscount: 0
      }
      
      const result = calculateScenario(dataWithNullSafes)
      
      expect(result.safeDetails).toEqual([])
      expect(result.totalSafeAmount).toBe(1) // From legacy SAFE
    })

    it('should maintain data integrity during multiple migrations', () => {
      const originalData = {
        ...baseInputs,
        safeAmount: 1,
        safeCap: 8,
        safeDiscount: 20
      }
      
      // Legacy -> N SAFEs -> Legacy -> N SAFEs
      const step1 = {
        ...originalData,
        safes: [{ id: 1, amount: 1, cap: 8, discount: 20 }],
        safeAmount: 0, safeCap: 0, safeDiscount: 0
      }
      
      const step2 = {
        ...step1,
        safes: [],
        safeAmount: 1, safeCap: 8, safeDiscount: 20
      }
      
      const step3 = {
        ...step2,
        safes: [{ id: 1, amount: 1, cap: 8, discount: 20 }],
        safeAmount: 0, safeCap: 0, safeDiscount: 0
      }
      
      const originalResult = calculateScenario(originalData)
      const finalResult = calculateScenario(step3)
      
      expect(finalResult.totalSafeAmount).toBe(originalResult.safeAmount)
      expect(finalResult.totalSafePercent).toBe(originalResult.safePercent)
    })
  })
})