import { describe, it, expect } from 'vitest'
import { encodeScenarioToURL, decodeScenarioFromURL } from './permalink'

describe('SAFE Investor Name Permalink', () => {
  it('should encode SAFE with investorName', () => {
    const scenario = {
      postMoneyVal: 250,
      roundSize: 50,
      investorPortion: 35,
      otherPortion: 15,
      investorName: 'LSVP',
      showAdvanced: true,
      safes: [{ id: 1, amount: 2, cap: 10, discount: 0, investorName: 'LSVP' }]
    }
    const url = encodeScenarioToURL(scenario)
    expect(decodeURIComponent(url)).toContain('"n":"LSVP"')
  })

  it('should NOT include n key for empty investorName', () => {
    const scenario = {
      postMoneyVal: 250,
      roundSize: 50,
      investorPortion: 35,
      otherPortion: 15,
      investorName: 'LSVP',
      showAdvanced: true,
      safes: [{ id: 1, amount: 2, cap: 10, discount: 0, investorName: '' }]
    }
    const url = encodeScenarioToURL(scenario)
    expect(url).not.toContain('"n"')
  })

  it('should decode SAFE with investorName', () => {
    const scenario = {
      postMoneyVal: 250,
      roundSize: 50,
      investorPortion: 35,
      otherPortion: 15,
      investorName: 'LSVP',
      showAdvanced: true,
      safes: [{ id: 1, amount: 2, cap: 10, discount: 20, investorName: 'Lead VC' }]
    }
    const url = encodeScenarioToURL(scenario)
    const decoded = decodeScenarioFromURL(url)
    expect(decoded.safes[0].investorName).toBe('Lead VC')
  })

  it('should decode SAFE without investorName to empty string', () => {
    const scenario = {
      postMoneyVal: 250,
      roundSize: 50,
      investorPortion: 35,
      otherPortion: 15,
      investorName: 'LSVP',
      showAdvanced: true,
      safes: [{ id: 1, amount: 2, cap: 10, discount: 0, investorName: '' }]
    }
    const url = encodeScenarioToURL(scenario)
    const decoded = decodeScenarioFromURL(url)
    expect(decoded.safes[0].investorName).toBe('')
  })

  it('should round-trip SAFE investorName correctly', () => {
    const scenario = {
      postMoneyVal: 250,
      roundSize: 50,
      investorPortion: 35,
      otherPortion: 15,
      investorName: 'LSVP',
      showAdvanced: true,
      safes: [
        { id: 1, amount: 2, cap: 10, discount: 0, investorName: 'LSVP' },
        { id: 2, amount: 1, cap: 5, discount: 10, investorName: '' }
      ]
    }
    const url = encodeScenarioToURL(scenario)
    const decoded = decodeScenarioFromURL(url)
    expect(decoded.safes).toHaveLength(2)
    expect(decoded.safes[0].investorName).toBe('LSVP')
    expect(decoded.safes[1].investorName).toBe('')
  })
})
