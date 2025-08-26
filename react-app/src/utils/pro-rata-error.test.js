import { describe, it, expect } from 'vitest'
import { calculateEnhancedScenario } from './multiPartyCalculations'

describe('Pro-Rata Error Handling - Multi-Party', () => {
  it('should return error when total pro-rata exceeds other portion', () => {
    const result = calculateEnhancedScenario({
      postMoneyVal: 100,
      roundSize: 20,
      investorPortion: 18,
      otherPortion: 2, // Only $2M available for other/pro-rata
      investorName: 'LSVP',
      showAdvanced: true,
      priorInvestors: [
        {
          id: 'investor1',
          name: 'Investor 1',
          ownershipPercent: 10, // 10% ownership * $20M round = $2M pro-rata
          hasProRataRights: true
        },
        {
          id: 'investor2',
          name: 'Investor 2',
          ownershipPercent: 5, // 5% ownership * $20M round = $1M pro-rata
          hasProRataRights: true
        }
      ],
      founders: [],
      safes: []
    })
    
    expect(result).toBeTruthy()
    expect(result.error).toBe(true)
    expect(result.errorMessage).toContain('Total pro-rata amount')
    expect(result.errorMessage).toContain('$3.00M') // Total pro-rata attempted
    expect(result.errorMessage).toContain('$2.00M') // Available other portion
    expect(result.proRataAmount).toBe(3) // Shows the total attempted pro-rata
    expect(result.otherPortion).toBe(2) // Shows the available other portion
  })
  
  it('should work when pro-rata exactly matches other portion', () => {
    const result = calculateEnhancedScenario({
      postMoneyVal: 100,
      roundSize: 20,
      investorPortion: 17,
      otherPortion: 3, // Exactly $3M available for pro-rata
      investorName: 'LSVP',
      showAdvanced: true,
      priorInvestors: [
        {
          id: 'investor1',
          name: 'Investor 1',
          ownershipPercent: 10, // 10% ownership * $20M round = $2M pro-rata
          hasProRataRights: true
        },
        {
          id: 'investor2',
          name: 'Investor 2',
          ownershipPercent: 5, // 5% ownership * $20M round = $1M pro-rata
          hasProRataRights: true
        }
      ],
      founders: [],
      safes: []
    })
    
    expect(result).toBeTruthy()
    expect(result.error).toBeFalsy() // Should succeed at exact boundary
    expect(result.otherAmount).toBe(0) // All other portion consumed by pro-rata
  })
  
  it('should work when some investors have no pro-rata rights', () => {
    const result = calculateEnhancedScenario({
      postMoneyVal: 100,
      roundSize: 20,
      investorPortion: 18,
      otherPortion: 2,
      investorName: 'LSVP',
      showAdvanced: true,
      priorInvestors: [
        {
          id: 'investor1',
          name: 'Investor 1',
          ownershipPercent: 10, // 10% ownership * $20M round = $2M pro-rata
          hasProRataRights: true
        },
        {
          id: 'investor2',
          name: 'Investor 2',
          ownershipPercent: 5,
          hasProRataRights: false // No pro-rata rights
        }
      ],
      founders: [],
      safes: []
    })
    
    expect(result).toBeTruthy()
    expect(result.error).toBeFalsy() // Should succeed as only $2M pro-rata needed
    expect(result.otherAmount).toBe(0) // All other portion consumed
  })
  
  it('should return error for zero other portion with pro-rata rights', () => {
    const result = calculateEnhancedScenario({
      postMoneyVal: 100,
      roundSize: 20,
      investorPortion: 20, // Entire round to LSVP
      otherPortion: 0, // No other portion
      investorName: 'LSVP',
      showAdvanced: true,
      priorInvestors: [
        {
          id: 'investor1',
          name: 'Investor 1',
          ownershipPercent: 10,
          hasProRataRights: true
        }
      ],
      founders: [],
      safes: []
    })
    
    expect(result).toBeTruthy()
    expect(result.error).toBe(true)
    expect(result.errorMessage).toContain('exceeds available')
    expect(result.errorMessage).toContain('$2.00M') // Attempted pro-rata
    expect(result.errorMessage).toContain('$0.00M') // Zero available
  })
})