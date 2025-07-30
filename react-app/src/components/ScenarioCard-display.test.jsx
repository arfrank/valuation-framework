import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import ScenarioCard from './ScenarioCard'

describe('ScenarioCard Display Logic', () => {
  const baseScenario = {
    title: 'Test Scenario',
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
    safeDetails: []
  }

  describe('Founder Display', () => {
    it('should hide founder rows when no founders in array', () => {
      const scenarioWithNoFounders = {
        ...baseScenario,
        founders: [],
        preRoundFounderPercent: 0,
        postRoundFounderPercent: 0,
        founderDilution: 0
      }

      const { container } = render(
        <ScenarioCard 
          scenario={scenarioWithNoFounders} 
          index={1} 
          isBase={false}
          showAdvanced={true}
          investorName="US"
        />
      )

      expect(container.querySelector('.founder-row')).toBeNull()
    })

    it('should show individual founder rows when founders array has data', () => {
      const scenarioWithFounders = {
        ...baseScenario,
        founders: [
          {
            id: 1,
            name: 'John Founder',
            ownershipPercent: 40,
            postRoundPercent: 30.80,
            dilution: 9.2
          },
          {
            id: 2,
            name: 'Jane Founder', 
            ownershipPercent: 30,
            postRoundPercent: 23.10,
            dilution: 6.9
          }
        ],
        preRoundFounderPercent: 70,
        postRoundFounderPercent: 53.84,
        founderDilution: 16.16
      }

      const { getByText } = render(
        <ScenarioCard 
          scenario={scenarioWithFounders} 
          index={1} 
          isBase={false}
          showAdvanced={true}
          investorName="US"
        />
      )

      expect(getByText((content, _element) => content.includes('John Founder'))).toBeTruthy()
      expect(getByText((content, _element) => content.includes('Jane Founder'))).toBeTruthy()
      // Verify percentages are displayed (from HTML debug output)
      expect(getByText('30.80%')).toBeTruthy() // John Founder's percentage from mock data
      expect(getByText('23.10%')).toBeTruthy() // Jane Founder's percentage from mock data
      expect(getByText('-9.2%')).toBeTruthy()  // John Founder's dilution
      expect(getByText('-6.9%')).toBeTruthy()  // Jane Founder's dilution
    })

    it('should hide founder rows when showAdvanced is false', () => {
      const scenarioWithFounders = {
        ...baseScenario,
        founders: [
          {
            id: 1,
            name: 'John Founder',
            ownershipPercent: 40,
            postRoundPercent: 30.8,
            dilution: 9.2
          }
        ],
        preRoundFounderPercent: 70,
        postRoundFounderPercent: 53.84,
        founderDilution: 16.16
      }

      const { container } = render(
        <ScenarioCard 
          scenario={scenarioWithFounders} 
          index={1} 
          isBase={false}
          showAdvanced={false}
          investorName="US"
        />
      )

      expect(container.querySelector('.founder-row')).toBeNull()
    })
  })

  describe('Multi-Party Display (N Founders & N Prior Investors)', () => {
    it('should display multiple prior investors with pro-rata details', () => {
      const scenarioWithMultipleInvestors = {
        ...baseScenario,
        priorInvestors: [
          {
            id: 1,
            name: 'Seed VC',
            ownershipPercent: 15,
            postRoundPercent: 11.5,
            proRataAmount: 0.5,
            dilution: 3.5
          },
          {
            id: 2,
            name: 'Angel Group',
            ownershipPercent: 10,
            postRoundPercent: 7.7,
            proRataAmount: 0,
            dilution: 2.3
          },
          {
            id: 3,
            name: 'Strategic Partner',
            ownershipPercent: 5,
            postRoundPercent: 5.8,
            proRataAmount: 0.3,
            dilution: -0.8 // Actually gained due to pro-rata
          }
        ]
      }

      const { getByText, getAllByText } = render(
        <ScenarioCard 
          scenario={scenarioWithMultipleInvestors} 
          index={1} 
          isBase={false}
          showAdvanced={true}
          investorName="US"
        />
      )

      // Check all prior investors are displayed (use getAllByText for duplicates)
      expect(getAllByText((content, _element) => content.includes('Seed VC')).length).toBeGreaterThan(0)
      expect(getAllByText((content, _element) => content.includes('Angel Group')).length).toBeGreaterThan(0)
      expect(getAllByText((content, _element) => content.includes('Strategic Partner')).length).toBeGreaterThan(0)
      
      // Check ownership percentages
      expect(getByText('11.50%')).toBeTruthy()
      expect(getByText('7.70%')).toBeTruthy()
      expect(getByText('5.80%')).toBeTruthy()
      
      // Check pro-rata amounts and dilution info
      expect(getByText('+$0.50M')).toBeTruthy() // Seed VC pro-rata
      expect(getByText('-2.3%')).toBeTruthy()   // Angel Group dilution (uses toFixed(1))
      expect(getByText('+$0.30M')).toBeTruthy() // Strategic Partner pro-rata
    })

    it('should display multiple founders with individual dilution', () => {
      const scenarioWithMultipleFounders = {
        ...baseScenario,
        founders: [
          {
            id: 1,
            name: 'CEO',
            ownershipPercent: 45,
            postRoundPercent: 34.6,
            dilution: 10.4
          },
          {
            id: 2,
            name: 'CTO',
            ownershipPercent: 35,
            postRoundPercent: 26.9,
            dilution: 8.1
          },
          {
            id: 3,
            name: 'COO',
            ownershipPercent: 20,
            postRoundPercent: 15.4,
            dilution: 4.6
          }
        ]
      }

      const { getByText } = render(
        <ScenarioCard 
          scenario={scenarioWithMultipleFounders} 
          index={1} 
          isBase={false}
          showAdvanced={true}
          investorName="US"
        />
      )

      // Check all founders are displayed
      expect(getByText((content, _element) => content.includes('CEO'))).toBeTruthy()
      expect(getByText((content, _element) => content.includes('CTO'))).toBeTruthy()
      expect(getByText((content, _element) => content.includes('COO'))).toBeTruthy()
      
      // Check post-round ownership percentages
      expect(getByText('34.60%')).toBeTruthy()
      expect(getByText('26.90%')).toBeTruthy()
      expect(getByText('15.40%')).toBeTruthy()
      
      // Check dilution percentages
      expect(getByText('-10.4%')).toBeTruthy()
      expect(getByText('-8.1%')).toBeTruthy()
      expect(getByText('-4.6%')).toBeTruthy()
    })

    it('should display both multiple founders and multiple prior investors together', () => {
      const scenarioWithBoth = {
        ...baseScenario,
        priorInvestors: [
          {
            id: 1,
            name: 'Previous Round',
            ownershipPercent: 20,
            postRoundPercent: 15.4,
            proRataAmount: 0,
            dilution: 4.6
          }
        ],
        founders: [
          {
            id: 1,
            name: 'Founder 1',
            ownershipPercent: 40,
            postRoundPercent: 30.8,
            dilution: 9.2
          },
          {
            id: 2,
            name: 'Founder 2',
            ownershipPercent: 30,
            postRoundPercent: 23.1,
            dilution: 6.9
          }
        ]
      }

      const { getByText, getAllByText } = render(
        <ScenarioCard 
          scenario={scenarioWithBoth} 
          index={1} 
          isBase={false}
          showAdvanced={true}
          investorName="US"
        />
      )

      // Check prior investor
      expect(getByText((content, _element) => content.includes('Previous Round'))).toBeTruthy()
      expect(getAllByText('15.40%').length).toBeGreaterThan(0)
      
      // Check founders
      expect(getByText((content, _element) => content.includes('Founder 1'))).toBeTruthy()
      expect(getByText((content, _element) => content.includes('Founder 2'))).toBeTruthy()
      expect(getByText('30.80%')).toBeTruthy()
      expect(getByText('23.10%')).toBeTruthy()
    })

    it('should handle edge case with many stakeholders (5+ founders, 3+ investors)', () => {
      const scenarioWithManyStakeholders = {
        ...baseScenario,
        priorInvestors: [
          { id: 1, name: 'VC 1', ownershipPercent: 8, postRoundPercent: 6.2, proRataAmount: 0, dilution: 1.8 },
          { id: 2, name: 'VC 2', ownershipPercent: 7, postRoundPercent: 5.4, proRataAmount: 0.2, dilution: 1.6 },
          { id: 3, name: 'Angel', ownershipPercent: 5, postRoundPercent: 3.8, proRataAmount: 0, dilution: 1.2 }
        ],
        founders: [
          { id: 1, name: 'CEO', ownershipPercent: 25, postRoundPercent: 19.2, dilution: 5.8 },
          { id: 2, name: 'CTO', ownershipPercent: 20, postRoundPercent: 15.4, dilution: 4.6 },
          { id: 3, name: 'COO', ownershipPercent: 15, postRoundPercent: 11.5, dilution: 3.5 },
          { id: 4, name: 'CMO', ownershipPercent: 10, postRoundPercent: 7.7, dilution: 2.3 },
          { id: 5, name: 'CFO', ownershipPercent: 10, postRoundPercent: 7.7, dilution: 2.3 }
        ]
      }

      const { getByText, getAllByText } = render(
        <ScenarioCard 
          scenario={scenarioWithManyStakeholders} 
          index={1} 
          isBase={false}
          showAdvanced={true}
          investorName="US"
        />
      )

      // Check all prior investors are displayed (use getAllByText for potential duplicates)
      expect(getAllByText((content, _element) => content.includes('VC 1')).length).toBeGreaterThan(0)
      expect(getAllByText((content, _element) => content.includes('VC 2')).length).toBeGreaterThan(0)
      expect(getAllByText((content, _element) => content.includes('Angel')).length).toBeGreaterThan(0)
      
      // Check all founders are displayed
      expect(getByText((content, _element) => content.includes('CEO'))).toBeTruthy()
      expect(getByText((content, _element) => content.includes('CTO'))).toBeTruthy()
      expect(getByText((content, _element) => content.includes('COO'))).toBeTruthy()
      expect(getByText((content, _element) => content.includes('CMO'))).toBeTruthy()
      expect(getByText((content, _element) => content.includes('CFO'))).toBeTruthy()
      
      // Spot check some percentages  
      expect(getByText('19.20%')).toBeTruthy() // CEO
      expect(getByText('6.20%')).toBeTruthy()  // VC 1
      expect(getByText('+$0.20M')).toBeTruthy() // VC 2 pro-rata
    })
  })

  describe('SAFE Display', () => {
    it('should show individual SAFEs from safeDetails', () => {
      const scenarioWithSafes = {
        ...baseScenario,
        safeDetails: [
          { id: 1, index: 1, amount: 1, cap: 8, discount: 0, conversionPrice: 8, percent: 12.5 },
          { id: 2, index: 2, amount: 0.5, cap: 0, discount: 20, conversionPrice: 8, percent: 6.25 }
        ],
        totalSafeAmount: 1.5,
        totalSafePercent: 18.75
      }

      const { getByText } = render(
        <ScenarioCard 
          scenario={scenarioWithSafes} 
          index={1} 
          isBase={false}
          showAdvanced={true}
          investorName="US"
        />
      )

      expect(getByText((content, _element) => content.includes('SAFE #1'))).toBeTruthy()
      expect(getByText((content, _element) => content.includes('SAFE #2'))).toBeTruthy()
      expect(getByText((content, _element) => content.includes('$1M @'))).toBeTruthy() // SAFE 1 amount display
      expect(getByText((content, _element) => content.includes('$0.5M @'))).toBeTruthy() // SAFE 2 amount display
    })


    it('should not show any SAFE rows when no SAFEs present', () => {
      const { queryByText } = render(
        <ScenarioCard 
          scenario={baseScenario} 
          index={1} 
          isBase={false}
          showAdvanced={true}
          investorName="US"
        />
      )

      expect(queryByText('SAFE #1')).toBeNull()
      expect(queryByText('SAFE Conv.')).toBeNull()
    })
  })

  describe('Combined Display Logic', () => {
    it('should show both SAFEs and individual founders when both present', () => {
      const fullScenario = {
        ...baseScenario,
        founders: [
          {
            id: 1,
            name: 'CEO',
            ownershipPercent: 40,
            postRoundPercent: 25.5,
            dilution: 14.5
          },
          {
            id: 2,
            name: 'CTO',
            ownershipPercent: 30,
            postRoundPercent: 20.0,
            dilution: 10.0
          }
        ],
        preRoundFounderPercent: 70,
        postRoundFounderPercent: 45.5,
        founderDilution: 24.5,
        safeDetails: [
          { id: 1, index: 1, amount: 1, cap: 8, discount: 0, conversionPrice: 8, percent: 12.5 }
        ]
      }

      const { getByText } = render(
        <ScenarioCard 
          scenario={fullScenario} 
          index={1} 
          isBase={false}
          showAdvanced={true}
          investorName="US"
        />
      )

      expect(getByText((content, _element) => content.includes('SAFE #1'))).toBeTruthy()
      expect(getByText((content, _element) => content.includes('CEO'))).toBeTruthy()
      expect(getByText((content, _element) => content.includes('CTO'))).toBeTruthy()
      expect(getByText('25.50%')).toBeTruthy()
      expect(getByText('20.00%')).toBeTruthy()
    })

    it('should show only SAFEs when no founders present', () => {
      const safeOnlyScenario = {
        ...baseScenario,
        founders: [], // Empty founders array
        preRoundFounderPercent: 0,
        postRoundFounderPercent: 0,
        founderDilution: 0,
        safeDetails: [
          { id: 1, index: 1, amount: 1, cap: 8, discount: 0, conversionPrice: 8, percent: 12.5 }
        ]
      }

      const { getByText, container } = render(
        <ScenarioCard 
          scenario={safeOnlyScenario} 
          index={1} 
          isBase={false}
          showAdvanced={true}
          investorName="US"
        />
      )

      expect(getByText((content, _element) => content.includes('SAFE #1'))).toBeTruthy()
      expect(container.querySelector('.founder-row')).toBeNull()
    })
  })
})