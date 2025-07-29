import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  encodeScenarioToURL, 
  decodeScenarioFromURL, 
  generatePermalink, 
  copyPermalinkToClipboard,
  isValidScenarioData 
} from './permalink'

describe('Permalink Utilities', () => {
  const mockScenario = {
    postMoneyVal: 13,
    roundSize: 3,
    investorPortion: 2.75,
    otherPortion: 0.25,
    investorName: 'US',
    showAdvanced: false,
    proRataPercent: 0,
    safes: [],
    preRoundFounderOwnership: 0
  }

  const mockAdvancedScenario = {
    ...mockScenario,
    showAdvanced: true,
    proRataPercent: 25,
    safes: [
      {
        id: 1,
        amount: 1.5,
        cap: 10,
        discount: 20
      }
    ],
    preRoundFounderOwnership: 65
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('encodeScenarioToURL', () => {
    it('should encode basic scenario data to URL parameters', () => {
      const encoded = encodeScenarioToURL(mockScenario)
      expect(encoded).toMatch(/pmv=13/)
      expect(encoded).toMatch(/rs=3/)
      expect(encoded).toMatch(/ip=2\.75/)
      expect(encoded).toMatch(/op=0\.25/)
      expect(encoded).toMatch(/in=US/)
      expect(encoded).not.toMatch(/safes=/) // No SAFEs should not be included
    })

    it('should encode advanced scenario data when showAdvanced is true', () => {
      const encoded = encodeScenarioToURL(mockAdvancedScenario)
      expect(encoded).toMatch(/pmv=13/)
      expect(encoded).toMatch(/adv=1/) // showAdvanced parameter
      expect(encoded).toMatch(/safes=/) // SAFEs array should be included
      expect(encoded).toMatch(/pr=25/)
      expect(encoded).toMatch(/pf=65/)
    })

    it('should encode N SAFEs array correctly', () => {
      const scenarioWithMultipleSafes = {
        ...mockScenario,
        safes: [
          { id: 1, amount: 1, cap: 8, discount: 0 },
          { id: 2, amount: 0.5, cap: 0, discount: 20 }
        ]
      }
      const encoded = encodeScenarioToURL(scenarioWithMultipleSafes)
      expect(encoded).toMatch(/safes=/)
      
      // Decode the safes parameter to verify structure
      const params = new URLSearchParams(encoded)
      const safesParam = params.get('safes')
      const safesData = JSON.parse(safesParam)
      expect(safesData).toHaveLength(2)
      expect(safesData[0]).toEqual({ a: 1, c: 8, d: 0 })
      expect(safesData[1]).toEqual({ a: 0.5, c: 0, d: 20 })
    })

    it('should handle special characters in investor name', () => {
      const scenarioWithSpecialName = { ...mockScenario, investorName: 'US & Partners' }
      const encoded = encodeScenarioToURL(scenarioWithSpecialName)
      expect(encoded).toMatch(/in=US\+%26\+Partners/)
    })

    it('should omit zero values for optional fields', () => {
      const encoded = encodeScenarioToURL(mockScenario)
      expect(encoded).not.toMatch(/pr=0/)
      expect(encoded).not.toMatch(/pf=0/)
      expect(encoded).not.toMatch(/adv=0/) // Don't include showAdvanced when false
      expect(encoded).not.toMatch(/safes=/) // Don't include empty safes array
    })

    it('should include showAdvanced when explicitly true', () => {
      const scenarioWithAdvanced = { ...mockScenario, showAdvanced: true }
      const encoded = encodeScenarioToURL(scenarioWithAdvanced)
      expect(encoded).toMatch(/adv=1/)
    })

    it('should filter out SAFEs with zero amount', () => {
      const scenarioWithZeroSafe = {
        ...mockScenario,
        safes: [
          { id: 1, amount: 1, cap: 8, discount: 0 },
          { id: 2, amount: 0, cap: 10, discount: 20 } // This should be filtered out
        ]
      }
      const encoded = encodeScenarioToURL(scenarioWithZeroSafe)
      const params = new URLSearchParams(encoded)
      const safesParam = params.get('safes')
      const safesData = JSON.parse(safesParam)
      expect(safesData).toHaveLength(1) // Only the non-zero SAFE should remain
      expect(safesData[0]).toEqual({ a: 1, c: 8, d: 0 })
    })
  })

  describe('decodeScenarioFromURL', () => {
    it('should decode basic URL parameters to scenario data', () => {
      const urlParams = 'pmv=13&rs=3&ip=2.75&op=0.25&in=US'
      const decoded = decodeScenarioFromURL(urlParams)
      
      expect(decoded.postMoneyVal).toBe(13)
      expect(decoded.roundSize).toBe(3)
      expect(decoded.investorPortion).toBe(2.75)
      expect(decoded.otherPortion).toBe(0.25)
      expect(decoded.investorName).toBe('US')
      expect(decoded.proRataPercent).toBe(0)
      expect(decoded.preRoundFounderOwnership).toBe(0)
      expect(decoded.safes).toEqual([])
    })

    it('should decode advanced scenario parameters', () => {
      const safesJson = JSON.stringify([{ a: 1.5, c: 10, d: 20 }])
      const urlParams = `pmv=13&rs=3&ip=2.75&op=0.25&in=US&adv=1&pr=25&safes=${encodeURIComponent(safesJson)}&pf=65`
      const decoded = decodeScenarioFromURL(urlParams)
      
      expect(decoded.showAdvanced).toBe(true)
      expect(decoded.proRataPercent).toBe(25)
      expect(decoded.preRoundFounderOwnership).toBe(65)
      expect(decoded.safes).toHaveLength(1)
      expect(decoded.safes[0].amount).toBe(1.5)
      expect(decoded.safes[0].cap).toBe(10)
      expect(decoded.safes[0].discount).toBe(20)
      expect(decoded.safes[0].id).toBeDefined()
    })

    it('should decode multiple SAFEs correctly', () => {
      const safesJson = JSON.stringify([
        { a: 1, c: 8, d: 0 },
        { a: 0.5, c: 0, d: 20 }
      ])
      const urlParams = `pmv=13&rs=3&ip=2.75&op=0.25&in=US&safes=${encodeURIComponent(safesJson)}`
      const decoded = decodeScenarioFromURL(urlParams)
      
      expect(decoded.safes).toHaveLength(2)
      expect(decoded.safes[0].amount).toBe(1)
      expect(decoded.safes[0].cap).toBe(8)
      expect(decoded.safes[0].discount).toBe(0)
      expect(decoded.safes[1].amount).toBe(0.5)
      expect(decoded.safes[1].cap).toBe(0)
      expect(decoded.safes[1].discount).toBe(20)
    })

    it('should handle URL encoded special characters', () => {
      const urlParams = 'pmv=13&rs=3&ip=2.75&op=0.25&in=US+%26+Partners'
      const decoded = decodeScenarioFromURL(urlParams)
      
      expect(decoded.investorName).toBe('US & Partners')
    })

    it('should return null for invalid URL parameters', () => {
      expect(decodeScenarioFromURL('')).toBe(null)
      expect(decodeScenarioFromURL('invalid=data')).toBe(null)
      expect(decodeScenarioFromURL('pmv=abc&rs=3')).toBe(null)
    })

    it('should return null for missing required parameters', () => {
      expect(decodeScenarioFromURL('pmv=13&rs=3')).toBe(null) // missing ip, op, in
      expect(decodeScenarioFromURL('pmv=13&ip=2.75&op=0.25&in=US')).toBe(null) // missing rs
    })

    it('should use default values for optional parameters', () => {
      const urlParams = 'pmv=13&rs=3&ip=2.75&op=0.25&in=US'
      const decoded = decodeScenarioFromURL(urlParams)
      
      expect(decoded.proRataPercent).toBe(0)
      expect(decoded.safes).toEqual([])
      expect(decoded.preRoundFounderOwnership).toBe(0)
      expect(decoded.showAdvanced).toBe(false)
    })

    it('should handle malformed SAFEs JSON gracefully', () => {
      const urlParams = 'pmv=13&rs=3&ip=2.75&op=0.25&in=US&safes=invalid-json'
      const decoded = decodeScenarioFromURL(urlParams)
      
      expect(decoded.safes).toEqual([])
      expect(decoded.showAdvanced).toBe(false) // Should not auto-enable advanced mode for malformed SAFEs
    })

    it('should auto-enable advanced mode when SAFEs are present', () => {
      const safesJson = JSON.stringify([{ a: 1, c: 8, d: 0 }])
      const urlParams = `pmv=13&rs=3&ip=2.75&op=0.25&in=US&safes=${encodeURIComponent(safesJson)}`
      const decoded = decodeScenarioFromURL(urlParams)
      
      expect(decoded.showAdvanced).toBe(true) // Should auto-enable when SAFEs present
    })

    it('should respect explicit showAdvanced setting', () => {
      // When showAdvanced is explicitly set to false, it should remain false even with advanced features
      const urlParams = 'pmv=13&rs=3&ip=2.75&op=0.25&in=US&adv=0&pr=25'
      const decoded = decodeScenarioFromURL(urlParams)
      
      expect(decoded.showAdvanced).toBe(false)
      expect(decoded.proRataPercent).toBe(25)
    })
  })

  describe('generatePermalink', () => {
    beforeEach(() => {
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: {
          origin: 'http://localhost:3000',
          pathname: '/',
        },
        writable: true,
      })
    })

    it('should generate a complete permalink URL', () => {
      const permalink = generatePermalink(mockScenario)
      expect(permalink).toMatch(/^http:\/\/localhost:3000\/\?/)
      expect(permalink).toMatch(/pmv=13/)
      expect(permalink).toMatch(/rs=3/)
      expect(permalink).toMatch(/ip=2\.75/)
    })

    it('should handle scenarios with advanced features', () => {
      const permalink = generatePermalink(mockAdvancedScenario)
      expect(permalink).toMatch(/safes=/)
      expect(permalink).toMatch(/pr=25/)
    })
  })

  describe('copyPermalinkToClipboard', () => {
    it('should copy permalink to clipboard successfully', async () => {
      const mockWriteText = vi.fn(() => Promise.resolve())
      Object.assign(navigator, {
        clipboard: { writeText: mockWriteText }
      })

      const result = await copyPermalinkToClipboard(mockScenario)
      
      expect(result.success).toBe(true)
      expect(mockWriteText).toHaveBeenCalledOnce()
      expect(mockWriteText).toHaveBeenCalledWith(expect.stringMatching(/^http:\/\/localhost:3000\/\?/))
    })

    it('should handle clipboard API errors gracefully', async () => {
      Object.assign(navigator, {
        clipboard: { 
          writeText: vi.fn(() => Promise.reject(new Error('Clipboard access denied')))
        }
      })

      const result = await copyPermalinkToClipboard(mockScenario)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Clipboard access denied')
    })

    it('should handle missing clipboard API', async () => {
      const originalClipboard = navigator.clipboard
      delete navigator.clipboard

      const result = await copyPermalinkToClipboard(mockScenario)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Clipboard API not available')

      // Restore clipboard
      navigator.clipboard = originalClipboard
    })
  })

  describe('isValidScenarioData', () => {
    it('should validate complete scenario data', () => {
      expect(isValidScenarioData(mockScenario)).toBe(true)
      expect(isValidScenarioData(mockAdvancedScenario)).toBe(true)
    })

    it('should reject invalid scenario data', () => {
      expect(isValidScenarioData(null)).toBe(false)
      expect(isValidScenarioData({})).toBe(false)
      expect(isValidScenarioData({ postMoneyVal: 'invalid' })).toBe(false)
      expect(isValidScenarioData({ ...mockScenario, postMoneyVal: -1 })).toBe(false)
      expect(isValidScenarioData({ ...mockScenario, roundSize: 0 })).toBe(false)
    })

    it('should reject scenario with missing required fields', () => {
      const { postMoneyVal, ...incomplete } = mockScenario
      expect(isValidScenarioData(incomplete)).toBe(false)

      const { investorName, ...noInvestor } = mockScenario
      expect(isValidScenarioData(noInvestor)).toBe(false)
    })
  })

  describe('Roundtrip encoding/decoding', () => {
    it('should maintain data integrity through encode/decode cycle', () => {
      const encoded = encodeScenarioToURL(mockScenario)
      const decoded = decodeScenarioFromURL(encoded)
      
      expect(decoded.postMoneyVal).toBe(mockScenario.postMoneyVal)
      expect(decoded.roundSize).toBe(mockScenario.roundSize)
      expect(decoded.investorPortion).toBe(mockScenario.investorPortion)
      expect(decoded.otherPortion).toBe(mockScenario.otherPortion)
      expect(decoded.investorName).toBe(mockScenario.investorName)
    })

    it('should maintain advanced scenario data through roundtrip', () => {
      const encoded = encodeScenarioToURL(mockAdvancedScenario)
      const decoded = decodeScenarioFromURL(encoded)
      
      expect(decoded.safes).toHaveLength(1)
      expect(decoded.safes[0].amount).toBe(mockAdvancedScenario.safes[0].amount)
      expect(decoded.safes[0].cap).toBe(mockAdvancedScenario.safes[0].cap)
      expect(decoded.safes[0].discount).toBe(mockAdvancedScenario.safes[0].discount)
      expect(decoded.proRataPercent).toBe(mockAdvancedScenario.proRataPercent)
      expect(decoded.preRoundFounderOwnership).toBe(mockAdvancedScenario.preRoundFounderOwnership)
      expect(decoded.showAdvanced).toBe(true)
    })

    it('should maintain multiple SAFEs through roundtrip', () => {
      const scenarioWithMultipleSafes = {
        ...mockScenario,
        safes: [
          { id: 1, amount: 1, cap: 8, discount: 0 },
          { id: 2, amount: 0.5, cap: 0, discount: 20 }
        ]
      }
      
      const encoded = encodeScenarioToURL(scenarioWithMultipleSafes)
      const decoded = decodeScenarioFromURL(encoded)
      
      expect(decoded.safes).toHaveLength(2)
      expect(decoded.safes[0].amount).toBe(1)
      expect(decoded.safes[0].cap).toBe(8)
      expect(decoded.safes[0].discount).toBe(0)
      expect(decoded.safes[1].amount).toBe(0.5)
      expect(decoded.safes[1].cap).toBe(0)
      expect(decoded.safes[1].discount).toBe(20)
    })
  })
})