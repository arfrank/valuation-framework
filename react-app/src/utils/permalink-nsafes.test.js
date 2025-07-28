import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  encodeScenarioToURL, 
  decodeScenarioFromURL, 
  generatePermalink,
  isValidScenarioData 
} from './permalink'

describe('N SAFEs Permalink Utilities', () => {
  const mockBaseScenario = {
    postMoneyVal: 13,
    roundSize: 3,
    investorPortion: 2.75,
    otherPortion: 0.25,
    investorName: 'US',
    showAdvanced: false,
    proRataPercent: 0,
    safes: [],
    safeAmount: 0,
    safeCap: 0,
    safeDiscount: 0,
    preRoundFounderOwnership: 0
  }

  const mockScenarioWithNSafes = {
    ...mockBaseScenario,
    showAdvanced: true,
    safes: [
      { id: 1, amount: 1, cap: 8, discount: 0 },
      { id: 2, amount: 0.5, cap: 0, discount: 20 },
      { id: 3, amount: 0.75, cap: 6, discount: 30 }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('N SAFEs Encoding', () => {
    it('should encode N SAFEs array to URL parameters', () => {
      const encoded = encodeScenarioToURL(mockScenarioWithNSafes)
      
      expect(encoded).toMatch(/pmv=13/)
      expect(encoded).toMatch(/adv=1/)
      expect(encoded).toMatch(/safes=/)
      
      // Extract and parse the safes parameter
      const safesMatch = encoded.match(/safes=([^&]+)/)
      expect(safesMatch).toBeTruthy()
      
      const safesData = JSON.parse(decodeURIComponent(safesMatch[1]))
      expect(safesData).toHaveLength(3)
      
      // Check first SAFE encoding (amount=a, cap=c, discount=d)
      expect(safesData[0]).toEqual({ a: 1, c: 8, d: 0 })
      expect(safesData[1]).toEqual({ a: 0.5, c: 0, d: 20 })
      expect(safesData[2]).toEqual({ a: 0.75, c: 6, d: 30 })
    })

    it('should not include empty SAFEs array in URL', () => {
      const encoded = encodeScenarioToURL(mockBaseScenario)
      
      expect(encoded).not.toMatch(/safes=/)
    })

    it('should filter out SAFEs with zero amount', () => {
      const scenarioWithZeroSafes = {
        ...mockBaseScenario,
        showAdvanced: true,
        safes: [
          { id: 1, amount: 0, cap: 8, discount: 0 },  // Should be filtered out
          { id: 2, amount: 1, cap: 8, discount: 0 },  // Should be included
          { id: 3, amount: 0, cap: 0, discount: 20 }  // Should be filtered out
        ]
      }
      
      const encoded = encodeScenarioToURL(scenarioWithZeroSafes)
      const safesMatch = encoded.match(/safes=([^&]+)/)
      const safesData = JSON.parse(decodeURIComponent(safesMatch[1]))
      
      expect(safesData).toHaveLength(1)
      expect(safesData[0]).toEqual({ a: 1, c: 8, d: 0 })
    })

    it('should handle SAFEs with missing fields', () => {
      const scenarioWithIncompleteSafes = {
        ...mockBaseScenario,
        showAdvanced: true,
        safes: [
          { id: 1, amount: 1 }, // Missing cap and discount
          { id: 2, amount: 0.5, cap: 8 }, // Missing discount
          { id: 3, amount: 0.75, discount: 20 } // Missing cap
        ]
      }
      
      const encoded = encodeScenarioToURL(scenarioWithIncompleteSafes)
      const safesMatch = encoded.match(/safes=([^&]+)/)
      const safesData = JSON.parse(decodeURIComponent(safesMatch[1]))
      
      expect(safesData).toHaveLength(3)
      expect(safesData[0]).toEqual({ a: 1, c: 0, d: 0 })
      expect(safesData[1]).toEqual({ a: 0.5, c: 8, d: 0 })
      expect(safesData[2]).toEqual({ a: 0.75, c: 0, d: 20 })
    })
  })

  describe('N SAFEs Decoding', () => {
    it('should decode N SAFEs array from URL parameters', () => {
      const safesJson = JSON.stringify([
        { a: 1, c: 8, d: 0 },
        { a: 0.5, c: 0, d: 20 },
        { a: 0.75, c: 6, d: 30 }
      ])
      const urlParams = `pmv=13&rs=3&ip=2.75&op=0.25&in=US&adv=1&safes=${encodeURIComponent(safesJson)}`
      
      const decoded = decodeScenarioFromURL(urlParams)
      
      expect(decoded.safes).toHaveLength(3)
      expect(decoded.safes[0]).toMatchObject({
        amount: 1,
        cap: 8,
        discount: 0
      })
      expect(decoded.safes[1]).toMatchObject({
        amount: 0.5,
        cap: 0,
        discount: 20
      })
      expect(decoded.safes[2]).toMatchObject({
        amount: 0.75,
        cap: 6,
        discount: 30
      })
      
      // Each SAFE should have an ID
      expect(decoded.safes[0]).toHaveProperty('id')
      expect(decoded.safes[1]).toHaveProperty('id')
      expect(decoded.safes[2]).toHaveProperty('id')
    })

    it('should handle invalid JSON in safes parameter', () => {
      const urlParams = 'pmv=13&rs=3&ip=2.75&op=0.25&in=US&safes=invalid-json'
      
      const decoded = decodeScenarioFromURL(urlParams)
      
      expect(decoded.safes).toEqual([])
    })

    it('should handle non-array safes parameter', () => {
      const urlParams = `pmv=13&rs=3&ip=2.75&op=0.25&in=US&safes=${encodeURIComponent('{"not": "array"}')}`
      
      const decoded = decodeScenarioFromURL(urlParams)
      
      expect(decoded.safes).toEqual([])
    })

    it('should set showAdvanced=true when SAFEs are present', () => {
      const safesJson = JSON.stringify([{ a: 1, c: 8, d: 0 }])
      const urlParams = `pmv=13&rs=3&ip=2.75&op=0.25&in=US&safes=${encodeURIComponent(safesJson)}`
      
      const decoded = decodeScenarioFromURL(urlParams)
      
      expect(decoded.showAdvanced).toBe(true)
    })

    it('should respect explicit showAdvanced=false even with SAFEs', () => {
      const safesJson = JSON.stringify([{ a: 1, c: 8, d: 0 }])
      const urlParams = `pmv=13&rs=3&ip=2.75&op=0.25&in=US&adv=0&safes=${encodeURIComponent(safesJson)}`
      
      const decoded = decodeScenarioFromURL(urlParams)
      
      expect(decoded.showAdvanced).toBe(false)
    })
  })

  describe('Roundtrip Encoding/Decoding with N SAFEs', () => {
    it('should maintain N SAFEs data through encode/decode cycle', () => {
      const encoded = encodeScenarioToURL(mockScenarioWithNSafes)
      const decoded = decodeScenarioFromURL(encoded)
      
      expect(decoded.safes).toHaveLength(3)
      expect(decoded.safes[0]).toMatchObject({
        amount: 1,
        cap: 8,
        discount: 0
      })
      expect(decoded.safes[1]).toMatchObject({
        amount: 0.5,
        cap: 0,
        discount: 20
      })
      expect(decoded.safes[2]).toMatchObject({
        amount: 0.75,
        cap: 6,
        discount: 30
      })
    })

    it('should handle mixed N SAFEs and legacy SAFE fields', () => {
      const scenarioWithBoth = {
        ...mockScenarioWithNSafes,
        safeAmount: 1.5,
        safeCap: 10,
        safeDiscount: 15
      }
      
      const encoded = encodeScenarioToURL(scenarioWithBoth)
      const decoded = decodeScenarioFromURL(encoded)
      
      // Both should be preserved
      expect(decoded.safes).toHaveLength(3)
      expect(decoded.safeAmount).toBe(1.5)
      expect(decoded.safeCap).toBe(10)
      expect(decoded.safeDiscount).toBe(15)
    })
  })

  describe('Backward Compatibility', () => {
    it('should still handle legacy SAFE-only scenarios', () => {
      const legacyScenario = {
        ...mockBaseScenario,
        showAdvanced: true,
        safeAmount: 1,
        safeCap: 8,
        safeDiscount: 20
      }
      
      const encoded = encodeScenarioToURL(legacyScenario)
      const decoded = decodeScenarioFromURL(encoded)
      
      expect(decoded.safes).toEqual([])
      expect(decoded.safeAmount).toBe(1)
      expect(decoded.safeCap).toBe(8)
      expect(decoded.safeDiscount).toBe(20)
    })

    it('should not include legacy SAFE fields when zero', () => {
      const encoded = encodeScenarioToURL(mockBaseScenario)
      
      expect(encoded).not.toMatch(/sa=0/)
      expect(encoded).not.toMatch(/sc=0/)
      expect(encoded).not.toMatch(/sd=0/)
    })
  })

  describe('Validation with N SAFEs', () => {
    it('should validate scenarios with N SAFEs', () => {
      expect(isValidScenarioData(mockScenarioWithNSafes)).toBe(true)
    })

    it('should validate scenarios with empty SAFEs array', () => {
      expect(isValidScenarioData(mockBaseScenario)).toBe(true)
    })

    it('should handle scenarios where safes is not an array', () => {
      const invalidScenario = {
        ...mockBaseScenario,
        safes: 'not-an-array'
      }
      
      expect(isValidScenarioData(invalidScenario)).toBe(true) // Should still be valid for required fields
    })
  })

  describe('URL Generation with N SAFEs', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: {
          origin: 'http://localhost:3000',
          pathname: '/',
        },
        writable: true,
      })
    })

    it('should generate permalinks with N SAFEs', () => {
      const permalink = generatePermalink(mockScenarioWithNSafes)
      
      expect(permalink).toMatch(/^http:\/\/localhost:3000\/\?/)
      expect(permalink).toMatch(/safes=/)
      expect(permalink).toMatch(/adv=1/)
    })

    it('should generate clean URLs for scenarios without SAFEs', () => {
      const permalink = generatePermalink(mockBaseScenario)
      
      expect(permalink).toMatch(/^http:\/\/localhost:3000\/\?/)
      expect(permalink).not.toMatch(/safes=/)
      expect(permalink).not.toMatch(/sa=/)
      expect(permalink).not.toMatch(/sc=/)
      expect(permalink).not.toMatch(/sd=/)
    })
  })
})