import { describe, it, expect } from 'vitest'
import { calculateScenario } from './calculations'

describe('N SAFEs Calculations', () => {
  const baseInputs = {
    postMoneyVal: 13,
    roundSize: 3,
    investorPortion: 2.75,
    otherPortion: 0.25,
    proRataPercent: 0,
    preRoundFounderOwnership: 0,
    safes: []
  }

  it('should calculate SAFE with cap only', () => {
    const inputs = {
      ...baseInputs,
      safes: [{
        id: 1,
        amount: 1,
        cap: 8,
        discount: 0
      }]
    }
    
    const result = calculateScenario(inputs)
    
    // Pre-money = 13 - 3 = 10M, SAFE cap = 8M, so conversion at 8M
    // SAFE percentage = 1M / 8M = 12.5%
    expect(result.totalSafePercent).toBe(12.5)
    expect(result.safeDetails).toHaveLength(1)
    expect(result.safeDetails[0].conversionPrice).toBe(8)
  })

  it('should calculate SAFE with discount only (uncapped)', () => {
    const inputs = {
      ...baseInputs,
      safes: [{
        id: 1,
        amount: 1,
        cap: 0,
        discount: 20
      }]
    }
    
    const result = calculateScenario(inputs)
    
    // Pre-money = 10M, discount = 20%, so conversion at 10M * 0.8 = 8M
    // SAFE percentage = 1M / 8M = 12.5%
    expect(result.totalSafePercent).toBe(12.5)
    expect(result.safeDetails[0].conversionPrice).toBe(8)
  })

  it('should calculate multiple SAFEs', () => {
    const inputs = {
      ...baseInputs,
      safes: [
        {
          id: 1,
          amount: 1,
          cap: 8,
          discount: 0
        },
        {
          id: 2,
          amount: 0.5,
          cap: 0,
          discount: 20
        }
      ]
    }
    
    const result = calculateScenario(inputs)
    
    // First SAFE: 1M / 8M = 12.5%
    // Second SAFE: 0.5M / 8M = 6.25%
    // Total: 18.75%
    expect(result.totalSafePercent).toBe(18.75)
    expect(result.safeDetails).toHaveLength(2)
    expect(result.totalSafeAmount).toBe(1.5)
  })

  it('should handle empty SAFEs array', () => {
    const inputs = {
      ...baseInputs,
      safes: []
    }
    
    const result = calculateScenario(inputs)
    
    expect(result.totalSafePercent).toBe(0)
    expect(result.safeDetails).toHaveLength(0)
    expect(result.totalSafeAmount).toBe(0)
  })

  it('should ignore SAFEs with zero amount', () => {
    const inputs = {
      ...baseInputs,
      safes: [
        {
          id: 1,
          amount: 0,
          cap: 8,
          discount: 20
        },
        {
          id: 2,
          amount: 1,
          cap: 8,
          discount: 0
        }
      ]
    }
    
    const result = calculateScenario(inputs)
    
    // Only second SAFE should be processed
    expect(result.totalSafePercent).toBe(12.5)
    expect(result.safeDetails).toHaveLength(1)
    expect(result.totalSafeAmount).toBe(1)
  })

  it('should handle SAFE with both cap and discount (cap is better)', () => {
    const inputs = {
      ...baseInputs,
      safes: [{
        id: 1,
        amount: 1,
        cap: 7,
        discount: 20
      }]
    }
    
    const result = calculateScenario(inputs)
    
    // Pre-money = 10M, cap = 7M, discount price = 10M * 0.8 = 8M
    // Should use cap (7M) since it's lower/better for investor
    // SAFE percentage = 1M / 7M = 14.29%
    expect(result.totalSafePercent).toBe(14.29)
    expect(result.safeDetails[0].conversionPrice).toBe(7)
  })
})

describe('Basic Calculations', () => {
  it('should calculate basic scenario without SAFEs', () => {
    const inputs = {
      postMoneyVal: 13,
      roundSize: 3,
      investorPortion: 2.75,
      otherPortion: 0.25,
      proRataPercent: 0,
      preRoundFounderOwnership: 0,
      safes: []
    }
    
    const result = calculateScenario(inputs)
    
    expect(result).toBeTruthy()
    expect(result.postMoneyVal).toBe(13)
    expect(result.preMoneyVal).toBe(10)
    expect(result.roundSize).toBe(3)
    expect(result.investorAmount).toBe(2.75)
    expect(result.otherAmount).toBe(0.25)
    expect(result.totalSafePercent).toBe(0)
  })
})