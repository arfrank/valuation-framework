import { describe, it, expect } from 'vitest'
import { calculateScenario } from './calculations'

describe('SAFE Calculations', () => {
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
    expect(result.safeDetails[0].conversionPrice).toBe(8)
    expect(result.safeDetails[0].percent).toBe(12.5)
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
    expect(result.safeDetails[0].percent).toBe(12.5)
  })

  it('should calculate uncapped SAFE with high discount', () => {
    const inputs = {
      ...baseInputs,
      safes: [{
        id: 1,
        amount: 2,
        cap: 0,
        discount: 50
      }]
    }
    
    const result = calculateScenario(inputs)
    
    // Pre-money = 10M, discount = 50%, so conversion at 10M * 0.5 = 5M
    // SAFE percentage = 2M / 5M = 40%
    expect(result.totalSafePercent).toBe(40)
    expect(result.safeDetails[0].conversionPrice).toBe(5)
    expect(result.safeDetails[0].percent).toBe(40)
  })

  it('should calculate SAFE with both cap and discount (cap is better)', () => {
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
    
    // Pre-money = 10M, discount price = 8M, cap = 7M
    // Should use cap (7M) since it's lower/better for investor
    // SAFE percentage = 1M / 7M = 14.29%
    expect(result.totalSafePercent).toBe(14.29)
    expect(result.safeDetails[0].conversionPrice).toBe(7)
    expect(result.safeDetails[0].percent).toBe(14.29)
  })

  it('should calculate SAFE with both cap and discount (discount is better)', () => {
    const inputs = {
      ...baseInputs,
      safes: [{
        id: 1,
        amount: 1,
        cap: 12,
        discount: 30
      }]
    }
    
    const result = calculateScenario(inputs)
    
    // Pre-money = 10M, discount price = 10M * 0.7 = 7M, cap = 12M
    // Should use discount (7M) since it's lower/better for investor
    // SAFE percentage = 1M / 7M = 14.29%
    expect(result.totalSafePercent).toBe(14.29)
    expect(result.safeDetails[0].conversionPrice).toBe(7)
    expect(result.safeDetails[0].percent).toBe(14.29)
  })

  it('should handle SAFE with no cap or discount', () => {
    const inputs = {
      ...baseInputs,
      safes: [{
        id: 1,
        amount: 1,
        cap: 0,
        discount: 0
      }]
    }
    
    const result = calculateScenario(inputs)
    
    // No cap or discount = invalid SAFE configuration, should be skipped
    expect(result.totalSafePercent).toBe(0)
    expect(result.safeDetails).toHaveLength(0)
  })

  it('should handle multiple SAFEs correctly', () => {
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
    
    // SAFE 1: 1M / 8M = 12.5%
    // SAFE 2: 0.5M / 8M (10M * 0.8) = 6.25%
    // Total: 18.75%
    expect(result.totalSafePercent).toBe(18.75)
    expect(result.totalSafeAmount).toBe(1.5)
    expect(result.safeDetails).toHaveLength(2)
    expect(result.safeDetails[0].percent).toBe(12.5)
    expect(result.safeDetails[1].percent).toBe(6.25)
  })

  it('should include all SAFE data in results', () => {
    const inputs = {
      ...baseInputs,
      safes: [{
        id: 1,
        amount: 1.5,
        cap: 8,
        discount: 25
      }]
    }
    
    const result = calculateScenario(inputs)
    
    expect(result.safes).toHaveLength(1)
    expect(result.safes[0].amount).toBe(1.5)
    expect(result.safes[0].cap).toBe(8)
    expect(result.safes[0].discount).toBe(25)
    expect(result.safeDetails[0].conversionPrice).toBe(7.5) // 10M * 0.75 = 7.5M (discount is better than cap)
    expect(result.totalSafePercent).toBe(20) // 1.5M / 7.5M = 20%
  })

  it('should handle empty safes array', () => {
    const inputs = {
      ...baseInputs,
      safes: []
    }
    
    const result = calculateScenario(inputs)
    
    expect(result.totalSafePercent).toBe(0)
    expect(result.totalSafeAmount).toBe(0)
    expect(result.safeDetails).toHaveLength(0)
  })
})

describe('ESOP Calculations', () => {
  const baseInputs = {
    postMoneyVal: 13,
    roundSize: 3,
    investorPortion: 2.75,
    otherPortion: 0.25,
    proRataPercent: 0,
    preRoundFounderOwnership: 70,
    safes: []
  }

  it('should handle no ESOP changes', () => {
    const inputs = {
      ...baseInputs,
      currentEsopPercent: 10,
      targetEsopPercent: 10,
      esopTiming: 'pre-close'
    }
    
    const result = calculateScenario(inputs)
    
    expect(result.finalEsopPercent).toBe(10)
    expect(result.esopIncrease).toBe(0)
    expect(result.esopIncreasePreClose).toBe(0)
    expect(result.esopIncreasePostClose).toBe(0)
  })

  it('should calculate pre-close ESOP increase correctly', () => {
    const inputs = {
      ...baseInputs,
      currentEsopPercent: 10,
      targetEsopPercent: 15,
      esopTiming: 'pre-close'
    }
    
    const result = calculateScenario(inputs)
    
    expect(result.finalEsopPercent).toBe(15)
    expect(result.esopIncrease).toBe(5)
    expect(result.esopIncreasePreClose).toBe(5)
    expect(result.esopIncreasePostClose).toBe(0)
    
    // Pre-close ESOP should increase founder dilution
    // Total new ownership: round (23.08%) + ESOP increase (5%) = 28.08%
    // Founder retention: 70% * (100% - 28.08%) / 100% = 50.34%
    expect(result.postRoundFounderPercent).toBeCloseTo(50.34, 1)
  })

  it('should calculate post-close ESOP increase correctly', () => {
    const inputs = {
      ...baseInputs,
      currentEsopPercent: 10,
      targetEsopPercent: 15,
      esopTiming: 'post-close'
    }
    
    const result = calculateScenario(inputs)
    
    expect(result.finalEsopPercent).toBe(15)
    expect(result.esopIncrease).toBe(5)
    expect(result.esopIncreasePreClose).toBe(0)
    expect(result.esopIncreasePostClose).toBe(5)
    
    // Post-close ESOP dilutes everyone proportionally
    // Base founder percentage after round: 70% * (100% - 23.08%) / 100% = 53.84%
    // After post-close ESOP: 53.84% * (100% - 5%) / 100% = 51.15%
    expect(result.postRoundFounderPercent).toBeCloseTo(51.15, 1)
  })

  it('should include all ESOP fields in result', () => {
    const inputs = {
      ...baseInputs,
      currentEsopPercent: 8,
      targetEsopPercent: 12,
      esopTiming: 'post-close'
    }
    
    const result = calculateScenario(inputs)
    
    expect(result.currentEsopPercent).toBe(8)
    expect(result.targetEsopPercent).toBe(12)
    expect(result.finalEsopPercent).toBe(12)
    expect(result.esopIncrease).toBe(4)
    expect(result.esopTiming).toBe('post-close')
  })

  it('should handle target ESOP less than current (no increase)', () => {
    const inputs = {
      ...baseInputs,
      currentEsopPercent: 15,
      targetEsopPercent: 10,
      esopTiming: 'pre-close'
    }
    
    const result = calculateScenario(inputs)
    
    expect(result.finalEsopPercent).toBe(15) // Should use current, not target
    expect(result.esopIncrease).toBe(0)
    expect(result.esopIncreasePreClose).toBe(0)
    expect(result.esopIncreasePostClose).toBe(0)
  })
})