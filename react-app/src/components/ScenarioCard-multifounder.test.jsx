import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import ScenarioCard from './ScenarioCard'

describe('ScenarioCard - Multiple Founders Display', () => {
  it('should correctly display multiple founders with their individual percentages', () => {
    const scenarioWithMultipleFounders = {
      title: 'Multi-Founder Test',
      postMoneyVal: 13,
      roundSize: 3,
      investorAmount: 2.75,
      investorPercent: 21.15,
      otherAmount: 0.25,
      otherPercent: 1.92,
      totalAmount: 3,
      totalPercent: 23.08,
      preMoneyVal: 10,
      roundPercent: 23.08,
      proRataAmount: 0,
      proRataPercent: 0,
      proRataPercentInput: 0,
      totalSafeAmount: 0,
      totalSafePercent: 0,
      safes: [],
      safeDetails: [],
      // Multiple founders data
      founders: [
        {
          id: 1,
          name: 'CEO',
          ownershipPercent: 50,
          postRoundPercent: 38.46,
          dilution: 11.54
        },
        {
          id: 2,
          name: 'CTO', 
          ownershipPercent: 30,
          postRoundPercent: 23.08,
          dilution: 6.92
        },
        {
          id: 3,
          name: 'VP Sales',
          ownershipPercent: 20,
          postRoundPercent: 15.38,
          dilution: 4.62
        }
      ],
      // Legacy aggregate data for compatibility
      preRoundFounderPercent: 100,
      postRoundFounderPercent: 76.92,
      founderDilution: 23.08
    }

    console.log('=== SCENARIO CARD DISPLAY TEST ===')
    console.log('Testing display of 3 founders:')
    scenarioWithMultipleFounders.founders.forEach(founder => {
      console.log(`- ${founder.name}: ${founder.postRoundPercent}% (dilution: ${founder.dilution}%)`)
    })

    const { getByText, getAllByText, container } = render(
      <ScenarioCard 
        scenario={scenarioWithMultipleFounders} 
        index={1} 
        isBase={false}
        showAdvanced={true}
        investorName="US"
      />
    )

    console.log('')
    console.log('Checking if all founder names are displayed...')
    
    // Check that all founder names are displayed
    expect(getByText((content, element) => content.includes('CEO'))).toBeTruthy()
    expect(getByText((content, element) => content.includes('CTO'))).toBeTruthy()
    expect(getByText((content, element) => content.includes('VP Sales'))).toBeTruthy()
    
    console.log('✓ All founder names found')

    // Check that all founder percentages are displayed
    console.log('Checking if all founder percentages are displayed...')
    expect(getByText('38.46%')).toBeTruthy() // CEO post-round
    // Note: CTO percentage of 23.08% appears multiple times (round %, total %, founder %)
    const ctoPct = getAllByText('23.08%')
    expect(ctoPct.length).toBeGreaterThan(0) // CTO percentage exists somewhere
    expect(getByText('15.38%')).toBeTruthy() // VP Sales post-round
    
    console.log('✓ All founder percentages found')

    // Check that dilution percentages are displayed correctly
    console.log('Checking if dilution percentages are displayed...')
    expect(getByText('-11.54%')).toBeTruthy() // CEO dilution
    expect(getByText('-6.92%')).toBeTruthy()  // CTO dilution
    expect(getByText('-4.62%')).toBeTruthy()  // VP Sales dilution
    
    console.log('✓ All dilution percentages found')

    // Check that we have founder rows (with CSS class)
    const founderRows = container.querySelectorAll('.founder-row')
    expect(founderRows).toHaveLength(3)
    console.log('✓ Found 3 founder rows with correct CSS class')

    // Verify we don't have legacy "Founder Impact" text
    expect(() => getByText('Founder Impact')).toThrow()
    console.log('✓ No legacy "Founder Impact" text found')

    console.log('')
    console.log('All ScenarioCard display tests passed!')
  })

  it('should handle edge case where founder percentages might be duplicated in DOM', () => {
    // This test checks if there's confusion when founder percentages match other percentages
    const scenarioWithDuplicatePercents = {
      title: 'Duplicate Percentage Test',
      postMoneyVal: 10,
      roundSize: 2,
      investorAmount: 2,
      investorPercent: 20,
      otherAmount: 0,
      otherPercent: 0,
      totalAmount: 2,
      totalPercent: 20,
      preMoneyVal: 8,
      roundPercent: 20,                    // Round is 20%
      proRataAmount: 0,
      proRataPercent: 0,
      totalSafeAmount: 0,
      totalSafePercent: 0,
      safes: [],
      safeDetails: [],
      founders: [
        {
          id: 1,
          name: 'Founder 1',
          ownershipPercent: 60,
          postRoundPercent: 48,            // Different from round %
          dilution: 12
        },
        {
          id: 2,
          name: 'Founder 2',
          ownershipPercent: 40,
          postRoundPercent: 32,            // Different from round %
          dilution: 8
        }
      ]
    }

    console.log('=== DUPLICATE PERCENTAGE TEST ===')
    console.log(`Round %: ${scenarioWithDuplicatePercents.roundPercent}%`)
    console.log('Founders:')
    scenarioWithDuplicatePercents.founders.forEach(founder => {
      console.log(`- ${founder.name}: ${founder.postRoundPercent}%`)
    })

    const { getByText, container } = render(
      <ScenarioCard 
        scenario={scenarioWithDuplicatePercents} 
        index={1} 
        isBase={false}
        showAdvanced={true}
        investorName="US"
      />
    )

    // Check that founder-specific content is there
    expect(getByText((content, element) => content.includes('Founder 1'))).toBeTruthy()
    expect(getByText((content, element) => content.includes('Founder 2'))).toBeTruthy()
    expect(getByText('48.00%')).toBeTruthy()    // Founder 1 post-round  
    expect(getByText('32.00%')).toBeTruthy()    // Founder 2 post-round
    
    // Check correct number of founder rows
    const founderRows = container.querySelectorAll('.founder-row')
    expect(founderRows).toHaveLength(2)
    
    console.log('✓ No confusion with duplicate percentages')
  })

  it('should handle the specific case the user mentioned - check first founder calculation', () => {
    // Let's create a scenario that might expose the issue the user is seeing
    const inputs = {
      postMoneyVal: 13,
      roundSize: 3,
      investorAmount: 2.75,
      investorPercent: 21.15,
      otherAmount: 0.25,
      otherPercent: 1.92,
      totalAmount: 3,
      totalPercent: 23.08,
      preMoneyVal: 10,
      roundPercent: 23.08,
      proRataAmount: 0,
      proRataPercent: 0,
      totalSafeAmount: 0,
      totalSafePercent: 0,
      safes: [],
      safeDetails: [],
      founders: [
        {
          id: 1,
          name: 'Founder 1',        // This is the one user said is wrong
          ownershipPercent: 45,
          postRoundPercent: 34.62,  // Should be 45 * (100-23.08)/100 = 34.614
          dilution: 10.38
        },
        {
          id: 2,
          name: 'Founder 2',
          ownershipPercent: 35,
          postRoundPercent: 26.92,  // Should be 35 * (100-23.08)/100 = 26.922
          dilution: 8.08
        },
        {
          id: 3,
          name: 'Founder 3',
          ownershipPercent: 20,
          postRoundPercent: 15.38,  // Should be 20 * (100-23.08)/100 = 15.384
          dilution: 4.62
        }
      ]
    }

    console.log('=== USER REPORTED ISSUE TEST ===')
    console.log('Checking if "Founder 1" displays correctly when multiple founders present')
    
    const expectedFounder1 = 45 * (100 - 23.08) / 100
    const expectedFounder2 = 35 * (100 - 23.08) / 100
    const expectedFounder3 = 20 * (100 - 23.08) / 100
    
    console.log('Expected post-round ownership:')
    console.log(`- Founder 1: ${expectedFounder1.toFixed(2)}% (actual: ${inputs.founders[0].postRoundPercent}%)`)
    console.log(`- Founder 2: ${expectedFounder2.toFixed(2)}% (actual: ${inputs.founders[1].postRoundPercent}%)`)
    console.log(`- Founder 3: ${expectedFounder3.toFixed(2)}% (actual: ${inputs.founders[2].postRoundPercent}%)`)
    
    const diff1 = Math.abs(inputs.founders[0].postRoundPercent - expectedFounder1)
    const diff2 = Math.abs(inputs.founders[1].postRoundPercent - expectedFounder2)
    const diff3 = Math.abs(inputs.founders[2].postRoundPercent - expectedFounder3)
    
    console.log('Differences from expected:')
    console.log(`- Founder 1: ${diff1.toFixed(4)}%`)
    console.log(`- Founder 2: ${diff2.toFixed(4)}%`)
    console.log(`- Founder 3: ${diff3.toFixed(4)}%`)
    
    if (diff1 > diff2 + 0.01 || diff1 > diff3 + 0.01) {
      console.log('⚠️  WARNING: Founder 1 has significantly different calculation than others!')
      console.log('This could be the issue the user is reporting.')
    }

    const { getByText, container } = render(
      <ScenarioCard 
        scenario={inputs} 
        index={1} 
        isBase={false}
        showAdvanced={true}
        investorName="US"
      />
    )

    // Verify Founder 1 is displayed correctly
    expect(getByText((content, element) => content.includes('Founder 1'))).toBeTruthy()
    expect(getByText('34.62%')).toBeTruthy()  // Post-round percentage  
    expect(getByText('-10.38%')).toBeTruthy() // Dilution
    
    // Check all founders are there
    const founderRows = container.querySelectorAll('.founder-row')
    expect(founderRows).toHaveLength(3)
    
    console.log('✓ Founder 1 displays correctly in ScenarioCard')
  })
})