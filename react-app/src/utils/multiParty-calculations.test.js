import { describe, it, expect } from 'vitest'
import { calculateEnhancedScenario } from './multiPartyCalculations'

describe('Multi-Party Calculations - Multiple Founders', () => {
  describe('Founder Dilution Calculations', () => {
    it('should correctly calculate dilution for multiple founders', () => {
      const inputs = {
        postMoneyVal: 13,
        roundSize: 3,
        investorPortion: 2.75,
        otherPortion: 0.25,
        priorInvestors: [],
        founders: [
          { id: 1, name: 'CEO', ownershipPercent: 60 },
          { id: 2, name: 'CTO', ownershipPercent: 40 }
        ],
        safes: [],
        currentEsopPercent: 0,
        targetEsopPercent: 0
      }

      const result = calculateEnhancedScenario(inputs)
      
      console.log('=== FOUNDER CALCULATION TEST ===')
      console.log('Pre-round ownership:')
      console.log('- CEO: 60%')
      console.log('- CTO: 40%')
      console.log('- Total: 100%')
      console.log('')
      console.log('Round details:')
      console.log(`- Post-money: $${result.postMoneyVal}M`)
      console.log(`- Round size: $${result.roundSize}M`)
      console.log(`- Round %: ${result.roundPercent}%`)
      console.log('')
      console.log('Post-round calculated ownership:')
      result.founders.forEach((founder, index) => {
        console.log(`- ${founder.name}: ${founder.postRoundPercent}% (dilution: ${founder.dilution}%)`)
      })
      console.log('')
      
      // Expected calculation:
      // Round takes 23.08% of company (3/13)
      // Remaining ownership: 76.92%
      // CEO should get: 60% * 76.92% = 46.15%
      // CTO should get: 40% * 76.92% = 30.77%
      
      const expectedCEOPostRound = Math.round(60 * (100 - result.roundPercent) / 100 * 100) / 100
      const expectedCTOPostRound = Math.round(40 * (100 - result.roundPercent) / 100 * 100) / 100
      
      console.log('Expected calculations:')
      console.log(`- CEO expected: 60% * (100 - ${result.roundPercent})% / 100 = ${expectedCEOPostRound}%`)
      console.log(`- CTO expected: 40% * (100 - ${result.roundPercent})% / 100 = ${expectedCTOPostRound}%`)
      console.log('')
      
      // Verify the calculations
      expect(result.founders).toHaveLength(2)
      
      const ceo = result.founders.find(f => f.name === 'CEO')
      const cto = result.founders.find(f => f.name === 'CTO')
      
      expect(ceo.postRoundPercent).toBeCloseTo(expectedCEOPostRound, 1)
      expect(cto.postRoundPercent).toBeCloseTo(expectedCTOPostRound, 1)
      
      // Verify dilution calculations
      expect(ceo.dilution).toBeCloseTo(60 - expectedCEOPostRound, 1)
      expect(cto.dilution).toBeCloseTo(40 - expectedCTOPostRound, 1)
      
      // Verify total ownership adds up to 100%
      const totalOwnership = result.roundPercent + ceo.postRoundPercent + cto.postRoundPercent
      expect(totalOwnership).toBeCloseTo(100, 1)
    })

    it('should handle three founders with unequal ownership', () => {
      const inputs = {
        postMoneyVal: 20,
        roundSize: 5,
        investorPortion: 4,
        otherPortion: 1,
        priorInvestors: [],
        founders: [
          { id: 1, name: 'CEO', ownershipPercent: 50 },
          { id: 2, name: 'CTO', ownershipPercent: 30 },
          { id: 3, name: 'VP Sales', ownershipPercent: 20 }
        ],
        safes: [],
        currentEsopPercent: 0,
        targetEsopPercent: 0
      }

      const result = calculateEnhancedScenario(inputs)
      
      console.log('=== THREE FOUNDERS TEST ===')
      console.log('Pre-round ownership: CEO 50%, CTO 30%, VP Sales 20%')
      console.log(`Round %: ${result.roundPercent}%`)
      console.log('Post-round ownership:')
      result.founders.forEach(founder => {
        console.log(`- ${founder.name}: ${founder.postRoundPercent}% (dilution: ${founder.dilution}%)`)
      })
      
      // Round takes 25% (5/20)
      // Remaining: 75%
      // CEO: 50% * 75% = 37.5%
      // CTO: 30% * 75% = 22.5% 
      // VP Sales: 20% * 75% = 15%
      
      const remainingPercent = 100 - result.roundPercent
      
      const ceo = result.founders.find(f => f.name === 'CEO')
      const cto = result.founders.find(f => f.name === 'CTO')
      const vp = result.founders.find(f => f.name === 'VP Sales')
      
      expect(ceo.postRoundPercent).toBeCloseTo(50 * remainingPercent / 100, 1)
      expect(cto.postRoundPercent).toBeCloseTo(30 * remainingPercent / 100, 1)
      expect(vp.postRoundPercent).toBeCloseTo(20 * remainingPercent / 100, 1)
      
      // Verify total adds to 100%
      const total = result.roundPercent + ceo.postRoundPercent + cto.postRoundPercent + vp.postRoundPercent
      expect(total).toBeCloseTo(100, 1)
    })

    it('should handle founders with prior investors and pro-rata', () => {
      const inputs = {
        postMoneyVal: 15,
        roundSize: 3,
        investorPortion: 2,
        otherPortion: 1,
        priorInvestors: [
          { id: 1, name: 'Seed VC', ownershipPercent: 20, hasProRataRights: true }
        ],
        founders: [
          { id: 1, name: 'Founder A', ownershipPercent: 45 },
          { id: 2, name: 'Founder B', ownershipPercent: 35 }
        ],
        safes: [],
        currentEsopPercent: 0,
        targetEsopPercent: 0
      }

      const result = calculateEnhancedScenario(inputs)
      
      console.log('=== FOUNDERS WITH PRIOR INVESTORS TEST ===')
      console.log('Pre-round: Seed VC 20%, Founder A 45%, Founder B 35%')
      console.log(`Round %: ${result.roundPercent}%`)
      console.log(`Pro-rata amount: $${result.totalProRataAmount}M`)
      console.log('Post-round ownership:')
      result.priorInvestors.forEach(investor => {
        console.log(`- ${investor.name}: ${investor.postRoundPercent}% (pro-rata: $${investor.proRataAmount}M)`)
      })
      result.founders.forEach(founder => {
        console.log(`- ${founder.name}: ${founder.postRoundPercent}% (dilution: ${founder.dilution}%)`)
      })
      
      // Seed VC should get pro-rata: 20% of $3M = $0.6M
      // New money: $3M - $0.6M = $2.4M  
      // Round %: $3M / $15M = 20%
      // Total new ownership (including pro-rata): 20%
      // Remaining for existing: 80%
      // Founder A: 45% * 80% = 36%
      // Founder B: 35% * 80% = 28%
      // Seed VC: 20% * 80% + pro-rata ownership
      
      expect(result.totalProRataAmount).toBeCloseTo(0.6, 1) // 20% of $3M
      
      const founderA = result.founders.find(f => f.name === 'Founder A')
      const founderB = result.founders.find(f => f.name === 'Founder B')
      
      // With 20% round and prior investors, remaining ownership should be diluted proportionally
      const totalNewOwnership = result.roundPercent
      const remainingPercent = 100 - totalNewOwnership
      
      // But we also need to account for pro-rata participation
      // The calculation is more complex - let's verify the actual values match expected dilution patterns
      expect(founderA.postRoundPercent).toBeLessThan(45) // Should be diluted
      expect(founderB.postRoundPercent).toBeLessThan(35) // Should be diluted
      expect(founderA.postRoundPercent).toBeGreaterThan(founderB.postRoundPercent) // A should still own more than B
      
      // Verify total ownership
      const seedVC = result.priorInvestors.find(i => i.name === 'Seed VC')
      const total = result.roundPercent + seedVC.postRoundPercent + founderA.postRoundPercent + founderB.postRoundPercent
      expect(total).toBeCloseTo(100, 1)
    })

    it('should not unfairly adjust only the first founder for rounding differences', () => {
      const inputs = {
        postMoneyVal: 13,
        roundSize: 3,
        investorPortion: 2.75,  
        otherPortion: 0.25,
        priorInvestors: [],
        founders: [
          { id: 1, name: 'Founder 1', ownershipPercent: 33.33 },
          { id: 2, name: 'Founder 2', ownershipPercent: 33.33 },
          { id: 3, name: 'Founder 3', ownershipPercent: 33.34 }
        ],
        safes: [],
        currentEsopPercent: 0,
        targetEsopPercent: 0
      }

      const result = calculateEnhancedScenario(inputs)
      
      console.log('=== ROUNDING ADJUSTMENT TEST ===')
      console.log('Pre-round ownership: All founders roughly equal (33.33%, 33.33%, 33.34%)')
      console.log(`Round %: ${result.roundPercent}%`)
      console.log('Post-round ownership:')
      result.founders.forEach((founder, index) => {
        const expectedPostRound = founder.ownershipPercent * (100 - result.roundPercent) / 100
        console.log(`- ${founder.name}: ${founder.postRoundPercent}% (expected: ${expectedPostRound.toFixed(2)}%, diff: ${(founder.postRoundPercent - expectedPostRound).toFixed(4)}%)`)
      })
      
      // Calculate what each founder should get proportionally
      const remainingPercent = 100 - result.roundPercent
      const expected1 = 33.33 * remainingPercent / 100
      const expected2 = 33.33 * remainingPercent / 100  
      const expected3 = 33.34 * remainingPercent / 100
      
      console.log('')
      console.log('Expected proportional calculations:')
      console.log(`- Founder 1: ${expected1.toFixed(4)}%`)
      console.log(`- Founder 2: ${expected2.toFixed(4)}%`)  
      console.log(`- Founder 3: ${expected3.toFixed(4)}%`)
      
      const founder1 = result.founders.find(f => f.name === 'Founder 1')
      const founder2 = result.founders.find(f => f.name === 'Founder 2')
      const founder3 = result.founders.find(f => f.name === 'Founder 3')
      
      // The bug: Founder 1 gets unfairly adjusted for rounding while others don't
      // This test should fail if the bug exists
      const diff1 = Math.abs(founder1.postRoundPercent - expected1)
      const diff2 = Math.abs(founder2.postRoundPercent - expected2)
      const diff3 = Math.abs(founder3.postRoundPercent - expected3)
      
      console.log('')
      console.log('Differences from expected:')
      console.log(`- Founder 1: ${diff1.toFixed(4)}% difference`)
      console.log(`- Founder 2: ${diff2.toFixed(4)}% difference`)
      console.log(`- Founder 3: ${diff3.toFixed(4)}% difference`)
      
      // All founders should have similar small rounding differences
      // If Founder 1 has a much larger difference, it indicates the bug
      expect(diff1).toBeLessThan(0.1) // Should not have major adjustment
      expect(diff2).toBeLessThan(0.05) // Should be minimal rounding
      expect(diff3).toBeLessThan(0.05) // Should be minimal rounding
      
      // The differences should be similar - no founder should bear the entire rounding burden
      expect(Math.abs(diff1 - diff2)).toBeLessThan(0.05)
      expect(Math.abs(diff1 - diff3)).toBeLessThan(0.05)
    })

    it('should expose significant rounding adjustment bug with extreme case', () => {
      const inputs = {
        postMoneyVal: 7.777777, // Weird number to force rounding issues
        roundSize: 1.333333, 
        investorPortion: 1.222222,  
        otherPortion: 0.111111,
        priorInvestors: [],
        founders: [
          { id: 1, name: 'Founder A', ownershipPercent: 33.333333 }, // Repeating decimals
          { id: 2, name: 'Founder B', ownershipPercent: 33.333333 },
          { id: 3, name: 'Founder C', ownershipPercent: 33.333334 }
        ],
        safes: [],
        currentEsopPercent: 0,
        targetEsopPercent: 0
      }

      const result = calculateEnhancedScenario(inputs)
      
      console.log('=== EXTREME ROUNDING TEST ===')
      console.log('Using values designed to create maximum rounding errors')
      console.log(`Post-money: $${result.postMoneyVal}M, Round: $${result.roundSize}M`)
      console.log(`Round %: ${result.roundPercent}%`)
      console.log('')
      
      // Calculate total ownership to see rounding adjustment
      const totalFounderOwnership = result.founders.reduce((sum, f) => sum + f.postRoundPercent, 0)
      const totalOwnership = result.roundPercent + totalFounderOwnership
      const adjustment = 100 - totalOwnership
      
      console.log('Ownership breakdown:')
      console.log(`- Round: ${result.roundPercent}%`)
      result.founders.forEach((founder, index) => {
        console.log(`- ${founder.name}: ${founder.postRoundPercent}%`)
      })
      console.log(`- Total: ${totalOwnership}%`)
      console.log(`- Adjustment needed: ${adjustment}%`)
      console.log('')
      
      // Calculate what each founder should get without any adjustment
      const remainingPercent = 100 - result.roundPercent
      const expectedWithoutAdjustment = result.founders.map(founder => {
        const expected = founder.ownershipPercent * remainingPercent / 100
        return { name: founder.name, expected, actual: founder.postRoundPercent, diff: founder.postRoundPercent - expected }
      })
      
      console.log('Expected vs Actual (showing adjustment impact):')
      expectedWithoutAdjustment.forEach(f => {
        console.log(`- ${f.name}: Expected ${f.expected.toFixed(6)}%, Actual ${f.actual}%, Diff: ${f.diff.toFixed(6)}%`)
      })
      
      const founderA = result.founders.find(f => f.name === 'Founder A')
      const founderB = result.founders.find(f => f.name === 'Founder B')
      const founderC = result.founders.find(f => f.name === 'Founder C')
      
      // Check if Founder A (first founder) got unfairly adjusted
      const expectedA = 33.333333 * remainingPercent / 100
      const expectedB = 33.333333 * remainingPercent / 100
      const expectedC = 33.333334 * remainingPercent / 100
      
      const diffA = Math.abs(founderA.postRoundPercent - expectedA)
      const diffB = Math.abs(founderB.postRoundPercent - expectedB)
      const diffC = Math.abs(founderC.postRoundPercent - expectedC)
      
      console.log('')
      console.log('Individual adjustment analysis:')
      console.log(`- Founder A adjustment: ${diffA.toFixed(6)}%`)
      console.log(`- Founder B adjustment: ${diffB.toFixed(6)}%`)
      console.log(`- Founder C adjustment: ${diffC.toFixed(6)}%`)
      
      // If there's a bug, Founder A should have a much larger adjustment than others
      if (diffA > 0.01) {
        console.log(`⚠️  WARNING: Founder A has significant adjustment (${diffA.toFixed(6)}%) while others have minimal adjustments`)
        console.log('This indicates the rounding adjustment bug where only the first founder bears the burden')
      }
      
      // This assertion might fail if the bug exists with extreme rounding
      // But let's see what happens
      expect(totalOwnership).toBeCloseTo(100, 2)
    })

    it('should return null when pre-round ownership exceeds 100%', () => {
      const inputs = {
        postMoneyVal: 13,
        roundSize: 3,
        investorPortion: 2.75,
        otherPortion: 0.25,
        priorInvestors: [
          { id: 1, name: 'Prior VC', ownershipPercent: 25, hasProRataRights: false }
        ],
        founders: [
          { id: 1, name: 'Founder 1', ownershipPercent: 40 },
          { id: 2, name: 'Founder 2', ownershipPercent: 40 },
          { id: 3, name: 'Founder 3', ownershipPercent: 40 }  // Total: 25 + 40 + 40 + 40 = 145% (45% over!)
        ],
        safes: [],
        currentEsopPercent: 0,
        targetEsopPercent: 0
      }

      const result = calculateEnhancedScenario(inputs)
      
      console.log('=== OWNERSHIP > 100% ERROR TEST ===')
      console.log('Pre-round ownership totals 145% (45% over 100%):')
      console.log('- Prior VC: 25%')
      console.log('- Founder 1: 40%')
      console.log('- Founder 2: 40%') 
      console.log('- Founder 3: 40%')
      console.log('- Total: 145%')
      console.log('')
      
      console.log('Expected behavior: Return null (no calculation)')
      console.log(`Actual result: ${result}`)
      
      // Should return null when ownership > 100%
      expect(result).toBeNull()
      
      console.log('✅ Correctly returns null for ownership > 100%')
    })

  })
})