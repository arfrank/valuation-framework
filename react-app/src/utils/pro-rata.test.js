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

  it('should return error when pro-rata exceeds other portion', () => {
    const result = calculateScenario({
      ...baseInputs,
      otherPortion: 1, // Only $1M available in "Other"
      proRataPercent: 50 // 50% of $5M = $2.5M, but only $1M available
    })
    
    expect(result.error).toBe(true)
    expect(result.errorMessage).toContain('exceeds available')
    expect(result.proRataAmount).toBe(2.5) // Shows attempted pro-rata amount
    expect(result.otherPortion).toBe(1) // Shows available other portion
  })

  it('should return error for 100% pro-rata when exceeding other portion', () => {
    const result = calculateScenario({
      ...baseInputs,
      proRataPercent: 100 // 100% of round is pro-rata = $5M, but only $2M other available
    })
    
    expect(result.error).toBe(true)
    expect(result.errorMessage).toContain('exceeds available')
    expect(result.proRataAmount).toBe(5) // Shows attempted $5M pro-rata
    expect(result.otherPortion).toBe(2) // Shows available $2M other portion
  })

  it('should return error when pro-rata requested with zero other portion', () => {
    const result = calculateScenario({
      ...baseInputs,
      investorPortion: 5,
      otherPortion: 0, // No "Other" portion
      proRataPercent: 20 // 20% pro-rata but nothing to take from
    })
    
    expect(result.error).toBe(true)
    expect(result.errorMessage).toContain('exceeds available')
    expect(result.proRataAmount).toBe(1) // Shows attempted $1M pro-rata (20% of $5M)
    expect(result.otherPortion).toBe(0) // Shows $0 available
  })

  it('should return error for extreme pro-rata percentage', () => {
    const result = calculateScenario({
      ...baseInputs,
      proRataPercent: 1000 // 1000% pro-rata (extreme) = $50M
    })
    
    expect(result.error).toBe(true)
    expect(result.errorMessage).toContain('exceeds available')
    expect(result.proRataAmount).toBe(50) // Shows attempted $50M pro-rata (1000% of $5M)
    expect(result.otherPortion).toBe(2) // Shows available $2M other portion
  })

  it('should maintain mathematical consistency with valid pro-rata', () => {
    const result = calculateScenario({
      ...baseInputs,
      proRataPercent: 30 // 30% of $5M = $1.5M, which fits in $2M other portion
    })
    
    expect(result.error).toBeFalsy() // Should succeed
    
    // The sum of investor + other + pro-rata amounts should equal round size
    const totalInvestment = result.investorAmount + result.otherAmount + result.proRataAmount
    expect(totalInvestment).toBeCloseTo(result.roundSize, 2)
    
    // The percentages should be calculated correctly
    const expectedProRataPercent = (result.proRataAmount / result.postMoneyVal) * 100
    expect(result.proRataPercent).toBeCloseTo(expectedProRataPercent, 1)
  })
  
  it('should work at the exact boundary of other portion', () => {
    const result = calculateScenario({
      ...baseInputs,
      proRataPercent: 40 // 40% of $5M = $2M, exactly matching other portion
    })
    
    expect(result.error).toBeFalsy() // Should succeed at boundary
    expect(result.proRataAmount).toBe(2) // Exactly $2M pro-rata
    expect(result.otherAmount).toBe(0) // All other portion consumed
  })
})