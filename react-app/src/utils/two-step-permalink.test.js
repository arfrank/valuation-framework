import { describe, it, expect } from 'vitest'
import { encodeScenarioToURL, decodeScenarioFromURL } from './permalink'

describe('Two-Step Round Permalink', () => {
  const baseScenario = {
    postMoneyVal: 400,
    roundSize: 100,
    investorPortion: 75,
    otherPortion: 25,
    investorName: 'Lead VC',
    showAdvanced: false,
    proRataPercent: 0,
    safes: [],
    preRoundFounderOwnership: 0
  }

  const twoStepScenario = {
    ...baseScenario,
    twoStepEnabled: true,
    step2PostMoney: 1000,
    step2Amount: 200,
    step2InvestorPortion: 100,
    step2OtherPortion: 100
  }

  describe('Encoding', () => {
    it('should encode twoStepEnabled as ts=1', () => {
      const encoded = encodeScenarioToURL(twoStepScenario)
      expect(encoded).toMatch(/ts=1/)
    })

    it('should not include ts param when twoStepEnabled is false', () => {
      const encoded = encodeScenarioToURL(baseScenario)
      expect(encoded).not.toMatch(/ts=/)
    })

    it('should encode step 2 fields', () => {
      const encoded = encodeScenarioToURL(twoStepScenario)
      expect(encoded).toMatch(/s2pm=1000/)
      expect(encoded).toMatch(/s2a=200/)
      expect(encoded).toMatch(/s2ip=100/)
      expect(encoded).toMatch(/s2op=100/)
    })

    it('should skip zero-value step 2 fields', () => {
      const scenario = {
        ...baseScenario,
        twoStepEnabled: true,
        step2PostMoney: 0,
        step2Amount: 0,
        step2InvestorPortion: 0,
        step2OtherPortion: 0
      }
      const encoded = encodeScenarioToURL(scenario)
      expect(encoded).toMatch(/ts=1/)
      expect(encoded).not.toMatch(/s2pm=/)
      expect(encoded).not.toMatch(/s2a=/)
      expect(encoded).not.toMatch(/s2ip=/)
      expect(encoded).not.toMatch(/s2op=/)
    })

    it('should encode step 2 fields with decimal values', () => {
      const scenario = {
        ...baseScenario,
        twoStepEnabled: true,
        step2PostMoney: 1000.5,
        step2Amount: 200.75,
        step2InvestorPortion: 100.25,
        step2OtherPortion: 100.5
      }
      const encoded = encodeScenarioToURL(scenario)
      expect(encoded).toMatch(/s2pm=1000\.5/)
      expect(encoded).toMatch(/s2a=200\.75/)
    })
  })

  describe('Decoding', () => {
    it('should decode twoStepEnabled from ts=1', () => {
      const decoded = decodeScenarioFromURL('pmv=400&rs=100&ip=75&op=25&in=Lead+VC&ts=1')
      expect(decoded.twoStepEnabled).toBe(true)
    })

    it('should default twoStepEnabled to false when ts param is absent', () => {
      const decoded = decodeScenarioFromURL('pmv=400&rs=100&ip=75&op=25&in=Lead+VC')
      expect(decoded.twoStepEnabled).toBe(false)
    })

    it('should decode step 2 fields', () => {
      const decoded = decodeScenarioFromURL(
        'pmv=400&rs=100&ip=75&op=25&in=Lead+VC&ts=1&s2pm=1000&s2a=200&s2ip=100&s2op=100'
      )
      expect(decoded.step2PostMoney).toBe(1000)
      expect(decoded.step2Amount).toBe(200)
      expect(decoded.step2InvestorPortion).toBe(100)
      expect(decoded.step2OtherPortion).toBe(100)
    })

    it('should default step 2 fields to 0 when absent', () => {
      const decoded = decodeScenarioFromURL('pmv=400&rs=100&ip=75&op=25&in=Lead+VC')
      expect(decoded.step2PostMoney).toBe(0)
      expect(decoded.step2Amount).toBe(0)
      expect(decoded.step2InvestorPortion).toBe(0)
      expect(decoded.step2OtherPortion).toBe(0)
    })

    it('should handle ts=0 as false', () => {
      const decoded = decodeScenarioFromURL('pmv=400&rs=100&ip=75&op=25&in=Lead+VC&ts=0')
      expect(decoded.twoStepEnabled).toBe(false)
    })
  })

  describe('Round-trip encoding/decoding', () => {
    it('should preserve all two-step data through round-trip', () => {
      const encoded = encodeScenarioToURL(twoStepScenario)
      const decoded = decodeScenarioFromURL(encoded)

      expect(decoded.twoStepEnabled).toBe(true)
      expect(decoded.step2PostMoney).toBe(1000)
      expect(decoded.step2Amount).toBe(200)
      expect(decoded.step2InvestorPortion).toBe(100)
      expect(decoded.step2OtherPortion).toBe(100)
    })

    it('should preserve basic fields alongside two-step fields', () => {
      const encoded = encodeScenarioToURL(twoStepScenario)
      const decoded = decodeScenarioFromURL(encoded)

      expect(decoded.postMoneyVal).toBe(400)
      expect(decoded.roundSize).toBe(100)
      expect(decoded.investorPortion).toBe(75)
      expect(decoded.otherPortion).toBe(25)
      expect(decoded.investorName).toBe('Lead VC')
    })

    it('should preserve disabled two-step (no step 2 params in URL)', () => {
      const encoded = encodeScenarioToURL(baseScenario)
      const decoded = decodeScenarioFromURL(encoded)

      expect(decoded.twoStepEnabled).toBe(false)
      expect(decoded.step2PostMoney).toBe(0)
      expect(decoded.step2Amount).toBe(0)
    })

    it('should round-trip two-step with advanced features', () => {
      const complexScenario = {
        ...twoStepScenario,
        showAdvanced: true,
        priorInvestors: [
          { id: 1, name: 'Seed VC', ownershipPercent: 15, proRataAmount: 0.5, hasProRataRights: true }
        ],
        founders: [
          { id: 2, name: 'CEO', ownershipPercent: 85 }
        ],
        currentEsopPercent: 5,
        targetEsopPercent: 10,
        esopTiming: 'post-close'
      }

      const encoded = encodeScenarioToURL(complexScenario)
      const decoded = decodeScenarioFromURL(encoded)

      // Two-step fields
      expect(decoded.twoStepEnabled).toBe(true)
      expect(decoded.step2PostMoney).toBe(1000)
      expect(decoded.step2Amount).toBe(200)

      // Advanced fields
      expect(decoded.showAdvanced).toBe(true)
      expect(decoded.priorInvestors).toHaveLength(1)
      expect(decoded.priorInvestors[0].name).toBe('Seed VC')
      expect(decoded.founders).toHaveLength(1)
      expect(decoded.founders[0].name).toBe('CEO')
      expect(decoded.currentEsopPercent).toBe(5)
      expect(decoded.targetEsopPercent).toBe(10)
      expect(decoded.esopTiming).toBe('post-close')
    })

    it('should round-trip decimal step 2 values', () => {
      const scenario = {
        ...baseScenario,
        twoStepEnabled: true,
        step2PostMoney: 1500.75,
        step2Amount: 250.5,
        step2InvestorPortion: 125.25,
        step2OtherPortion: 125.25
      }

      const encoded = encodeScenarioToURL(scenario)
      const decoded = decodeScenarioFromURL(encoded)

      expect(decoded.step2PostMoney).toBe(1500.75)
      expect(decoded.step2Amount).toBe(250.5)
      expect(decoded.step2InvestorPortion).toBe(125.25)
      expect(decoded.step2OtherPortion).toBe(125.25)
    })
  })
})
