import { describe, it, expect } from 'vitest'
import { calculateScenario } from './calculations'

describe('SAFE Calculations', () => {
  const baseInputs = {
    postMoneyVal: 13,
    roundSize: 3,
    investorPortion: 2.75,
    otherPortion: 0.25,
    proRataPercent: 0,
    preRoundFounderOwnership: 0
  }

  it('should calculate SAFE with cap only', () => {
    const inputs = {
      ...baseInputs,
      safeAmount: 1,
      safeCap: 8,
      safeDiscount: 0
    }
    
    const result = calculateScenario(inputs)
    
    // Pre-money = 13 - 3 = 10M, SAFE cap = 8M, so conversion at 8M
    // SAFE percentage = 1M / 8M = 12.5%
    expect(result.safePercent).toBe(12.5)
    expect(result.safeConversionPrice).toBe(8)
  })

  it('should calculate SAFE with discount only (uncapped)', () => {
    const inputs = {
      ...baseInputs,
      safeAmount: 1,
      safeCap: 0,
      safeDiscount: 20
    }
    
    const result = calculateScenario(inputs)
    
    // Pre-money = 10M, discount = 20%, so conversion at 10M * 0.8 = 8M
    // SAFE percentage = 1M / 8M = 12.5%
    expect(result.safePercent).toBe(12.5)
    expect(result.safeConversionPrice).toBe(8)
  })

  it('should calculate uncapped SAFE with high discount', () => {
    const inputs = {
      ...baseInputs,
      safeAmount: 2,
      safeCap: 0,
      safeDiscount: 50
    }
    
    const result = calculateScenario(inputs)
    
    // Pre-money = 10M, discount = 50%, so conversion at 10M * 0.5 = 5M
    // SAFE percentage = 2M / 5M = 40%
    expect(result.safePercent).toBe(40)
    expect(result.safeConversionPrice).toBe(5)
  })

  it('should calculate SAFE with both cap and discount (cap is better)', () => {
    const inputs = {
      ...baseInputs,
      safeAmount: 1,
      safeCap: 7,
      safeDiscount: 20
    }
    
    const result = calculateScenario(inputs)
    
    // Pre-money = 10M, discount price = 8M, cap = 7M
    // Should use cap (7M) since it's lower/better for investor
    // SAFE percentage = 1M / 7M = 14.29%
    expect(result.safePercent).toBe(14.29)
    expect(result.safeConversionPrice).toBe(7)
  })

  it('should calculate SAFE with both cap and discount (discount is better)', () => {
    const inputs = {
      ...baseInputs,
      safeAmount: 1,
      safeCap: 12,
      safeDiscount: 30
    }
    
    const result = calculateScenario(inputs)
    
    // Pre-money = 10M, discount price = 10M * 0.7 = 7M, cap = 12M
    // Should use discount (7M) since it's lower/better for investor
    // SAFE percentage = 1M / 7M = 14.29%
    expect(result.safePercent).toBe(14.29)
    expect(result.safeConversionPrice).toBe(7)
  })

  it('should handle SAFE with no cap or discount', () => {
    const inputs = {
      ...baseInputs,
      safeAmount: 1,
      safeCap: 0,
      safeDiscount: 0
    }
    
    const result = calculateScenario(inputs)
    
    // No cap or discount = invalid SAFE configuration
    expect(result.safePercent).toBe(0)
    expect(result.safeConversionPrice).toBe(0)
  })

  it('should include all SAFE data in results', () => {
    const inputs = {
      ...baseInputs,
      safeAmount: 1.5,
      safeCap: 8,
      safeDiscount: 25
    }
    
    const result = calculateScenario(inputs)
    
    expect(result.safeAmount).toBe(1.5)
    expect(result.safeCap).toBe(8)
    expect(result.safeDiscount).toBe(25)
    expect(result.safeConversionPrice).toBe(7.5) // 10M * 0.75 = 7.5M (discount is better than cap)
    expect(result.safePercent).toBe(20) // 1.5M / 7.5M = 20%
  })
})