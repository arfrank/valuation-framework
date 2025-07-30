import { describe, it, expect } from 'vitest'
import { calculateScenario } from './calculations'

describe('Pro-Rata Calculations', () => {
  const baseInputs = {
    postMoneyVal: 13,
    roundSize: 5,
    investorPortion: 3,
    otherPortion: 2,
    preRoundFounderOwnership: 0,
    safes: []
  }

  it('should calculate normal pro-rata scenario correctly', () => {
    const result = calculateScenario({
      ...baseInputs,
      proRataPercent: 20 // 20% of round is pro-rata
    })
    
    expect(result).toBeTruthy()
    expect(result.proRataAmount).toBe(1) // 20% of $5M round = $1M, limited by $2M other
    expect(result.proRataPercent).toBeCloseTo(7.69, 1) // $1M / $13M post-money
    expect(result.otherAmount).toBe(1) // $2M - $1M pro-rata = $1M remaining
  })

  it('should limit pro-rata when exceeding other portion', () => {
    const result = calculateScenario({
      ...baseInputs,
      otherPortion: 1, // Only $1M available in "Other"
      proRataPercent: 50 // 50% of $5M = $2.5M, but only $1M available
    })
    
    expect(result.proRataAmount).toBe(1) // Limited to available other portion
    expect(result.otherAmount).toBe(0) // All other portion consumed by pro-rata
  })

  it('should handle 100% pro-rata scenario', () => {
    const result = calculateScenario({
      ...baseInputs,
      proRataPercent: 100 // 100% of round is pro-rata
    })
    
    expect(result.proRataAmount).toBe(2) // Limited to $2M other portion
    expect(result.otherAmount).toBe(0) // All other portion consumed
  })

  it('should handle pro-rata with zero other portion', () => {
    const result = calculateScenario({
      ...baseInputs,
      investorPortion: 5,
      otherPortion: 0, // No "Other" portion
      proRataPercent: 20 // 20% pro-rata but nothing to take from
    })
    
    expect(result.proRataAmount).toBe(0) // No other portion to take from
    expect(result.otherAmount).toBe(0) // Stays zero
  })

  it('should handle extreme pro-rata percentage', () => {
    const result = calculateScenario({
      ...baseInputs,
      proRataPercent: 1000 // 1000% pro-rata (extreme)
    })
    
    expect(result.proRataAmount).toBe(2) // Limited to available other portion
    expect(result.otherAmount).toBe(0) // All other portion consumed
  })

  it('should maintain mathematical consistency with pro-rata', () => {
    const result = calculateScenario({
      ...baseInputs,
      proRataPercent: 30
    })
    
    // The sum of investor + other + pro-rata amounts should equal round size
    const totalInvestment = result.investorAmount + result.otherAmount + result.proRataAmount
    expect(totalInvestment).toBeCloseTo(result.roundSize, 2)
    
    // The percentages should be calculated correctly
    const expectedProRataPercent = (result.proRataAmount / result.postMoneyVal) * 100
    expect(result.proRataPercent).toBeCloseTo(expectedProRataPercent, 1)
  })
})