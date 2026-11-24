import { describe, it, expect, vi, afterEach } from 'vitest'
import { encodeScenarioToURL, decodeScenarioFromURL, isValidScenarioData, sharePermalink } from './permalink'

describe('Permalink Edge Cases', () => {
  describe('Encoding/Decoding Robustness', () => {
    const testScenario = {
      postMoneyVal: 13,
      roundSize: 3,
      investorPortion: 2.75,
      otherPortion: 0.25,
      investorName: 'US',
      showAdvanced: true,
      proRataPercent: 15,
      safes: [{
        id: 1,
        amount: 1,
        cap: 8,
        discount: 20
      }],
      preRoundFounderOwnership: 70,
      currentEsopPercent: 10,
      targetEsopPercent: 15,
      esopTiming: 'post-close'
    }

    it('should encode and decode normal scenario correctly', () => {
      const encoded = encodeScenarioToURL(testScenario)
      expect(encoded).toBeTruthy()
      
      const decoded = decodeScenarioFromURL(encoded)
      expect(decoded).toBeTruthy()
      expect(isValidScenarioData(decoded)).toBe(true)
      
      // Check key fields match
      expect(decoded.postMoneyVal).toBe(testScenario.postMoneyVal)
      expect(decoded.investorName).toBe(testScenario.investorName)
      expect(decoded.safes).toHaveLength(testScenario.safes.length)
    })

    it('should handle malformed URL parameters gracefully', () => {
      // Malformed numbers
      const malformed1 = decodeScenarioFromURL('pmv=abc&rs=def')
      expect(malformed1).toBeNull()

      // Invalid JSON SAFEs
      const malformed2 = decodeScenarioFromURL('pmv=13&rs=3&safes=invalid-json')
      expect(malformed2).toBeNull()

      // Missing required fields
      const malformed3 = decodeScenarioFromURL('pmv=13') // Missing required fields
      expect(malformed3).toBeNull()
    })

    it('should handle edge case values', () => {
      const edgeScenario = {
        postMoneyVal: 0.01, // Very small
        roundSize: 0.01,
        investorPortion: 0.005,
        otherPortion: 0.005,
        investorName: 'Test Investor With Spaces & Special Chars!',
        showAdvanced: false,
        proRataPercent: 0,
        safes: [],
        preRoundFounderOwnership: 100, // 100%
        currentEsopPercent: 0,
        targetEsopPercent: 0,
        esopTiming: 'pre-close'
      }

      const encoded = encodeScenarioToURL(edgeScenario)
      const decoded = decodeScenarioFromURL(encoded)
      
      expect(decoded).toBeTruthy()
      expect(decoded.investorName).toBe(edgeScenario.investorName) // Special chars preserved
    })

    it('should handle maximum complexity scenario', () => {
      const maxScenario = {
        postMoneyVal: 999999.99,
        roundSize: 999999.99,
        investorPortion: 500000,
        otherPortion: 499999.99,
        investorName: 'Very Long Investor Name That Could Cause URL Issues',
        showAdvanced: true,
        proRataPercent: 100,
        safes: Array(10).fill(null).map((_, i) => ({
          id: i + 1,
          amount: 1000 + i,
          cap: 5000 + i,
          discount: 10 + i
        })),
        preRoundFounderOwnership: 99.99,
        currentEsopPercent: 50,
        targetEsopPercent: 50,
        esopTiming: 'post-close'
      }

      const encoded = encodeScenarioToURL(maxScenario)
      expect(encoded.length).toBeLessThan(2000) // Reasonable URL length
      
      const decoded = decodeScenarioFromURL(encoded)
      expect(decoded).toBeTruthy()
      expect(decoded.safes).toHaveLength(maxScenario.safes.length)
    })

    it('should auto-enable advanced features when present', () => {
      const scenarioWithAdvancedFeatures = {
        postMoneyVal: 13,
        roundSize: 3,
        investorPortion: 2.75,
        otherPortion: 0.25,
        investorName: 'US',
        // showAdvanced: false, // Not explicitly set
        proRataPercent: 15, // But has advanced features
        safes: [],
        preRoundFounderOwnership: 70,
        currentEsopPercent: 10,
        targetEsopPercent: 0,
        esopTiming: 'pre-close'
      }

      const encoded = encodeScenarioToURL(scenarioWithAdvancedFeatures)
      const decoded = decodeScenarioFromURL(encoded)
      
      // Should auto-enable advanced when features are present
      expect(decoded.showAdvanced).toBe(true)
    })

    it('should preserve default values correctly', () => {
      const minimalScenario = {
        postMoneyVal: 13,
        roundSize: 3,
        investorPortion: 2.75,
        otherPortion: 0.25,
        investorName: 'US'
        // All other fields should use defaults
      }

      const encoded = encodeScenarioToURL(minimalScenario)
      const decoded = decodeScenarioFromURL(encoded)
      
      expect(decoded.showAdvanced).toBe(false)
      expect(decoded.proRataPercent).toBe(0)
      expect(decoded.safes).toEqual([])
      expect(decoded.preRoundFounderOwnership).toBe(0)
      expect(decoded.currentEsopPercent).toBe(0)
      expect(decoded.targetEsopPercent).toBe(0)
      expect(decoded.esopTiming).toBe('pre-close')
    })
  })

  describe('URL Parameter Optimization', () => {
    it('should not include default values in URL to keep it short', () => {
      const scenarioWithDefaults = {
        postMoneyVal: 13,
        roundSize: 3,
        investorPortion: 2.75,
        otherPortion: 0.25,
        investorName: 'US',
        showAdvanced: false, // Default
        proRataPercent: 0, // Default
        safes: [], // Default
        preRoundFounderOwnership: 0, // Default
        currentEsopPercent: 0, // Default
        targetEsopPercent: 0, // Default
        esopTiming: 'pre-close' // Default
      }

      const encoded = encodeScenarioToURL(scenarioWithDefaults)
      
      // Should not include default values
      expect(encoded).not.toContain('adv=')
      expect(encoded).not.toContain('pr=')
      expect(encoded).not.toContain('pf=')
      expect(encoded).not.toContain('ce=')
      expect(encoded).not.toContain('te=')
      expect(encoded).not.toContain('et=')
      expect(encoded).not.toContain('safes=')
    })

    it('should include non-default values in URL', () => {
      const scenarioWithNonDefaults = {
        postMoneyVal: 13,
        roundSize: 3,
        investorPortion: 2.75,
        otherPortion: 0.25,
        investorName: 'US',
        showAdvanced: true, // Non-default
        proRataPercent: 15, // Non-default
        safes: [{ id: 1, amount: 1, cap: 8, discount: 0 }], // Non-default
        preRoundFounderOwnership: 70, // Non-default
        currentEsopPercent: 10, // Non-default
        targetEsopPercent: 15, // Non-default
        esopTiming: 'post-close' // Non-default
      }

      const encoded = encodeScenarioToURL(scenarioWithNonDefaults)
      
      // Should include non-default values
      expect(encoded).toContain('adv=1')
      expect(encoded).toContain('pr=15')
      expect(encoded).toContain('pf=70')
      expect(encoded).toContain('ce=10')
      expect(encoded).toContain('te=15')
      expect(encoded).toContain('et=post-close')
      expect(encoded).toContain('safes=')
    })
  })

  describe('Incomplete and invalid links', () => {
    const required = 'pmv=20&rs=5&ip=4&op=1&in=US'

    it('warns when a row list in the link cannot be parsed', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      // A prior-investor list cut off mid-JSON, as a chat client might do.
      const decoded = decodeScenarioFromURL(`${required}&pi=${encodeURIComponent('[{"n":"Seed","o":2')}`)
      warn.mockRestore()

      expect(decoded).not.toBeNull()
      expect(decoded.priorInvestors).toEqual([])
      expect(decoded.importWarnings).toHaveLength(1)
      expect(decoded.importWarnings[0]).toContain('prior investors')
    })

    it('adds no warning to a link that decodes cleanly', () => {
      const decoded = decodeScenarioFromURL(required)
      expect(decoded).not.toBeNull()
      expect(decoded.importWarnings).toBeUndefined()
    })

    it('rejects a non-finite number', () => {
      expect(isValidScenarioData({
        postMoneyVal: Infinity,
        roundSize: 5,
        investorPortion: 4,
        otherPortion: 1,
        investorName: 'US'
      })).toBe(false)
      expect(decodeScenarioFromURL('pmv=1e400&rs=5&ip=4&op=1&in=US')).toBeNull()
    })
  })

  describe('Native share', () => {
    const scenario = { postMoneyVal: 20, roundSize: 5, investorPortion: 4, otherPortion: 1, investorName: 'US' }
    const originalShare = navigator.share

    afterEach(() => {
      if (originalShare === undefined) {
        delete navigator.share
      } else {
        navigator.share = originalShare
      }
      navigator.clipboard.writeText.mockClear()
    })

    it('reports a dismissed share sheet as cancelled without copying the link', async () => {
      navigator.share = vi.fn(() => Promise.reject(Object.assign(new Error('dismissed'), { name: 'AbortError' })))

      const result = await sharePermalink(scenario)

      expect(result.success).toBe(false)
      expect(result.cancelled).toBe(true)
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled()
    })

    it('falls back to copying when sharing fails for another reason', async () => {
      navigator.share = vi.fn(() => Promise.reject(new Error('not allowed')))

      const result = await sharePermalink(scenario)

      expect(result.success).toBe(true)
      expect(result.fallback).toBe(true)
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1)
    })
  })
})