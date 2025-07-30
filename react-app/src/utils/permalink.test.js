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
      const { postMoneyVal: _postMoneyVal, ...incomplete } = mockScenario
      expect(isValidScenarioData(incomplete)).toBe(false)

      const { investorName: _investorName, ...noInvestor } = mockScenario
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

  describe('Multi-Party Features', () => {
    const multiPartyScenario = {
      ...mockScenario,
      showAdvanced: true,
      priorInvestors: [
        {
          id: 1,
          name: 'Seed VC',
          ownershipPercent: 15,
          proRataAmount: 0.5,
          postRoundPercent: 11.5,
          dilution: 3.5
        },
        {
          id: 2,
          name: 'Angel Group',
          ownershipPercent: 10,
          proRataAmount: 0,
          postRoundPercent: 7.7,
          dilution: 2.3
        }
      ],
      founders: [
        {
          id: 1,
          name: 'CEO',
          ownershipPercent: 50,
          postRoundPercent: 38.46,
          dilution: 11.54
        },
        {
          id: 2,
          name: 'CTO',
          ownershipPercent: 30,
          postRoundPercent: 23.08,
          dilution: 6.92
        }
      ]
    }

    describe('encodeScenarioToURL with multi-party', () => {
      it('should encode prior investors array to URL', () => {
        const encoded = encodeScenarioToURL(multiPartyScenario)
        expect(encoded).toMatch(/pi=/)
        
        // Decode the parameter to verify structure
        const params = new URLSearchParams(encoded)
        const piParam = params.get('pi')
        const piData = JSON.parse(piParam)
        
        expect(piData).toHaveLength(2)
        expect(piData[0]).toEqual({ n: 'Seed VC', o: 15, p: 0.5 })
        expect(piData[1]).toEqual({ n: 'Angel Group', o: 10, p: 0 })
      })

      it('should encode founders array to URL', () => {
        const encoded = encodeScenarioToURL(multiPartyScenario)
        expect(encoded).toMatch(/f=/)
        
        // Decode the parameter to verify structure
        const params = new URLSearchParams(encoded)
        const foundersParam = params.get('f')
        const foundersData = JSON.parse(foundersParam)
        
        expect(foundersData).toHaveLength(2)
        expect(foundersData[0]).toEqual({ n: 'CEO', o: 50 })
        expect(foundersData[1]).toEqual({ n: 'CTO', o: 30 })
      })

      it('should only include investors with ownership > 0', () => {
        const scenarioWithZeroOwnership = {
          ...multiPartyScenario,
          priorInvestors: [
            { id: 1, name: 'Valid Investor', ownershipPercent: 15, proRataAmount: 0.5 },
            { id: 2, name: 'Zero Investor', ownershipPercent: 0, proRataAmount: 0 }
          ]
        }
        
        const encoded = encodeScenarioToURL(scenarioWithZeroOwnership)
        const params = new URLSearchParams(encoded)
        const piData = JSON.parse(params.get('pi'))
        
        expect(piData).toHaveLength(1)
        expect(piData[0].n).toBe('Valid Investor')
      })

      it('should only include founders with ownership > 0', () => {
        const scenarioWithZeroFounder = {
          ...multiPartyScenario,
          founders: [
            { id: 1, name: 'Valid Founder', ownershipPercent: 50 },
            { id: 2, name: 'Zero Founder', ownershipPercent: 0 }
          ]
        }
        
        const encoded = encodeScenarioToURL(scenarioWithZeroFounder)
        const params = new URLSearchParams(encoded)
        const foundersData = JSON.parse(params.get('f'))
        
        expect(foundersData).toHaveLength(1)
        expect(foundersData[0].n).toBe('Valid Founder')
      })

      it('should not include empty arrays', () => {
        const scenarioWithEmptyArrays = {
          ...mockScenario,
          priorInvestors: [],
          founders: []
        }
        
        const encoded = encodeScenarioToURL(scenarioWithEmptyArrays)
        expect(encoded).not.toMatch(/pi=/)
        expect(encoded).not.toMatch(/f=/)
      })
    })

    describe('decodeScenarioFromURL with multi-party', () => {
      it('should decode prior investors from URL', () => {
        const encoded = encodeScenarioToURL(multiPartyScenario)
        const decoded = decodeScenarioFromURL(encoded)
        
        expect(decoded.priorInvestors).toHaveLength(2)
        expect(decoded.priorInvestors[0].name).toBe('Seed VC')
        expect(decoded.priorInvestors[0].ownershipPercent).toBe(15)
        expect(decoded.priorInvestors[0].proRataAmount).toBe(0.5)
        expect(decoded.priorInvestors[0]).toHaveProperty('id')
        expect(decoded.priorInvestors[0].postRoundPercent).toBe(0) // Should be 0, calculated later
        expect(decoded.priorInvestors[0].dilution).toBe(0) // Should be 0, calculated later
        
        expect(decoded.priorInvestors[1].name).toBe('Angel Group')
        expect(decoded.priorInvestors[1].ownershipPercent).toBe(10)
        expect(decoded.priorInvestors[1].proRataAmount).toBe(0)
      })

      it('should decode founders from URL', () => {
        const encoded = encodeScenarioToURL(multiPartyScenario)
        const decoded = decodeScenarioFromURL(encoded)
        
        expect(decoded.founders).toHaveLength(2)
        expect(decoded.founders[0].name).toBe('CEO')
        expect(decoded.founders[0].ownershipPercent).toBe(50)
        expect(decoded.founders[0]).toHaveProperty('id')
        expect(decoded.founders[0].postRoundPercent).toBe(0) // Should be 0, calculated later
        expect(decoded.founders[0].dilution).toBe(0) // Should be 0, calculated later
        
        expect(decoded.founders[1].name).toBe('CTO')
        expect(decoded.founders[1].ownershipPercent).toBe(30)
      })

      it('should auto-enable showAdvanced when multi-party arrays present', () => {
        const scenarioWithoutAdvancedFlag = {
          ...mockScenario,
          // Note: showAdvanced is false, but we have multi-party data
          priorInvestors: [{ id: 1, name: 'Investor', ownershipPercent: 15, proRataAmount: 0 }]
        }
        
        const encoded = encodeScenarioToURL(scenarioWithoutAdvancedFlag)
        // Remove explicit showAdvanced flag from URL
        const cleanEncoded = encoded.replace(/&?adv=1/, '')
        
        const decoded = decodeScenarioFromURL(cleanEncoded)
        expect(decoded.showAdvanced).toBe(true) // Should be auto-enabled
      })

      it('should handle malformed prior investors JSON gracefully', () => {
        const malformedUrl = 'pmv=13&rs=3&ip=2.75&op=0.25&in=US&pi=invalid-json'
        const decoded = decodeScenarioFromURL(malformedUrl)
        
        expect(decoded.priorInvestors).toEqual([])
        expect(decoded.showAdvanced).toBe(false)
      })

      it('should handle malformed founders JSON gracefully', () => {
        const malformedUrl = 'pmv=13&rs=3&ip=2.75&op=0.25&in=US&f=invalid-json'
        const decoded = decodeScenarioFromURL(malformedUrl)
        
        expect(decoded.founders).toEqual([])
        expect(decoded.showAdvanced).toBe(false)
      })

      it('should generate unique IDs for decoded arrays', () => {
        const encoded = encodeScenarioToURL(multiPartyScenario)
        const decoded = decodeScenarioFromURL(encoded)
        
        // Check that all entities have unique IDs
        const allIds = [
          ...decoded.priorInvestors.map(pi => pi.id),
          ...decoded.founders.map(f => f.id)
        ]
        
        const uniqueIds = new Set(allIds)
        expect(uniqueIds.size).toBe(allIds.length) // All IDs should be unique
      })

      it('should provide default names for unnamed entities', () => {
        const scenarioWithUnnamedEntities = {
          ...mockScenario,
          priorInvestors: [{ ownershipPercent: 15, proRataAmount: 0.5 }],
          founders: [{ ownershipPercent: 50 }]
        }
        
        const encoded = encodeScenarioToURL(scenarioWithUnnamedEntities)
        const decoded = decodeScenarioFromURL(encoded)
        
        expect(decoded.priorInvestors[0].name).toBe('Investor 1')
        expect(decoded.founders[0].name).toBe('Founder 1')
      })
    })

    describe('Complex multi-party scenarios', () => {
      it('should handle full scenario with SAFEs, multi-party, and ESOP', () => {
        const complexScenario = {
          ...multiPartyScenario,
          safes: [
            { id: 1, amount: 1, cap: 10, discount: 0 },
            { id: 2, amount: 0.5, cap: 0, discount: 20 }
          ],
          currentEsopPercent: 10,
          targetEsopPercent: 15,
          esopTiming: 'post-close'
        }
        
        const encoded = encodeScenarioToURL(complexScenario)
        const decoded = decodeScenarioFromURL(encoded)
        
        // Verify all components are preserved
        expect(decoded.priorInvestors).toHaveLength(2)
        expect(decoded.founders).toHaveLength(2)
        expect(decoded.safes).toHaveLength(2)
        expect(decoded.currentEsopPercent).toBe(10)
        expect(decoded.targetEsopPercent).toBe(15)
        expect(decoded.esopTiming).toBe('post-close')
        expect(decoded.showAdvanced).toBe(true)
      })

      it('should create compact URLs by excluding default values', () => {
        const scenarioWithDefaults = {
          ...mockScenario,
          priorInvestors: [{ id: 1, name: 'Investor', ownershipPercent: 15, proRataAmount: 0 }],
          currentEsopPercent: 0, // Default value, should be excluded
          targetEsopPercent: 0,  // Default value, should be excluded
          esopTiming: 'pre-close' // Default value, should be excluded
        }
        
        const encoded = encodeScenarioToURL(scenarioWithDefaults)
        expect(encoded).not.toMatch(/ce=0/)
        expect(encoded).not.toMatch(/te=0/)
        expect(encoded).not.toMatch(/et=pre-close/)
        expect(encoded).toMatch(/pi=/) // Should include prior investors
      })

      it('should round-trip complex scenarios without data loss', () => {
        const complexScenario = {
          postMoneyVal: 15.75,
          roundSize: 4.25,
          investorPortion: 3.1,
          otherPortion: 1.15,
          investorName: 'Lead Investor',
          showAdvanced: true,
          priorInvestors: [
            { id: 1, name: 'Seed Fund', ownershipPercent: 12.5, proRataAmount: 0.75 },
            { id: 2, name: 'Strategic', ownershipPercent: 8.25, proRataAmount: 0 }
          ],
          founders: [
            { id: 1, name: 'CEO & Founder', ownershipPercent: 55 },
            { id: 2, name: 'Co-founder', ownershipPercent: 25 }
          ],
          safes: [
            { id: 1, amount: 2, cap: 12, discount: 0 }
          ],
          currentEsopPercent: 7.5,
          targetEsopPercent: 12.5,
          esopTiming: 'post-close'
        }
        
        const encoded = encodeScenarioToURL(complexScenario)
        const decoded = decodeScenarioFromURL(encoded)
        
        // Verify core fields
        expect(decoded.postMoneyVal).toBe(15.75)
        expect(decoded.roundSize).toBe(4.25)
        expect(decoded.investorName).toBe('Lead Investor')
        
        // Verify multi-party data
        expect(decoded.priorInvestors[0].name).toBe('Seed Fund')
        expect(decoded.priorInvestors[0].ownershipPercent).toBe(12.5)
        expect(decoded.priorInvestors[0].proRataAmount).toBe(0.75)
        
        expect(decoded.founders[0].name).toBe('CEO & Founder')
        expect(decoded.founders[0].ownershipPercent).toBe(55)
        
        // Verify other advanced features
        expect(decoded.safes[0].amount).toBe(2)
        expect(decoded.currentEsopPercent).toBe(7.5)
        expect(decoded.targetEsopPercent).toBe(12.5)
        expect(decoded.esopTiming).toBe('post-close')
      })
    })

    describe('End-to-end multi-party permalink integration', () => {
      it('should handle complete round-trip of complex multi-party scenario', () => {
        const complexScenario = {
          postMoneyVal: 15,
          roundSize: 4,
          investorPortion: 3,
          otherPortion: 1,
          investorName: 'Lead VC',
          showAdvanced: true,
          priorInvestors: [
            {
              id: 1,
              name: 'Seed Fund',
              ownershipPercent: 15,
              proRataAmount: 0.5,
              postRoundPercent: 12.5,
              dilution: 2.5
            },
            {
              id: 2,
              name: 'Angel Group',
              ownershipPercent: 10,
              proRataAmount: 0,
              postRoundPercent: 7.69,
              dilution: 2.31
            }
          ],
          founders: [
            {
              id: 1,
              name: 'CEO',
              ownershipPercent: 50,
              postRoundPercent: 38.46,
              dilution: 11.54
            },
            {
              id: 2,
              name: 'CTO',
              ownershipPercent: 25,
              postRoundPercent: 19.23,
              dilution: 5.77
            }
          ],
          safes: [
            {
              id: 1,
              amount: 1,
              cap: 10,
              discount: 0
            }
          ],
          currentEsopPercent: 5,
          targetEsopPercent: 10,
          esopTiming: 'pre-close'
        }

        // Encode to URL
        const encodedURL = encodeScenarioToURL(complexScenario)
        
        // Verify URL contains multi-party parameters
        expect(encodedURL).toMatch(/pi=/) // Prior investors
        expect(encodedURL).toMatch(/f=/)  // Founders
        expect(encodedURL).toMatch(/safes=/) // SAFEs
        
        // Decode back from URL
        const decodedScenario = decodeScenarioFromURL(encodedURL)
        
        // Verify structure integrity
        expect(decodedScenario.priorInvestors).toHaveLength(2)
        expect(decodedScenario.founders).toHaveLength(2)
        expect(decodedScenario.safes).toHaveLength(1)
        
        // Verify prior investors data
        expect(decodedScenario.priorInvestors[0].name).toBe('Seed Fund')
        expect(decodedScenario.priorInvestors[0].ownershipPercent).toBe(15)
        expect(decodedScenario.priorInvestors[0].proRataAmount).toBe(0.5)
        expect(decodedScenario.priorInvestors[1].name).toBe('Angel Group')
        expect(decodedScenario.priorInvestors[1].ownershipPercent).toBe(10)
        expect(decodedScenario.priorInvestors[1].proRataAmount).toBe(0)
        
        // Verify founders data
        expect(decodedScenario.founders[0].name).toBe('CEO')
        expect(decodedScenario.founders[0].ownershipPercent).toBe(50)
        expect(decodedScenario.founders[1].name).toBe('CTO')
        expect(decodedScenario.founders[1].ownershipPercent).toBe(25)
        
        // Verify basic scenario data
        expect(decodedScenario.postMoneyVal).toBe(15)
        expect(decodedScenario.investorName).toBe('Lead VC')
        expect(decodedScenario.showAdvanced).toBe(true)
        
        // Verify ESOP data
        expect(decodedScenario.currentEsopPercent).toBe(5)
        expect(decodedScenario.targetEsopPercent).toBe(10)
        expect(decodedScenario.esopTiming).toBe('pre-close')
      })
    })
  })
})