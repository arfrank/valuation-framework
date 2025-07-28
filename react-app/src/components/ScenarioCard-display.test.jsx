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
    safeAmount: 0,
    safePercent: 0,
    safeCap: 0,
    safeDiscount: 0,
    safeConversionPrice: 0,
    totalSafeAmount: 0,
    totalSafePercent: 0,
    safeDetails: []
  }

  describe('Founder Impact Display', () => {
    it('should hide founder impact row when preRoundFounderPercent is 0', () => {
      const scenarioWithZeroFounder = {
        ...baseScenario,
        preRoundFounderPercent: 0,
        postRoundFounderPercent: 0,
        founderDilution: 0
      }

      const { queryByText } = render(
        <ScenarioCard 
          scenario={scenarioWithZeroFounder} 
          index={1} 
          isBase={false}
          showAdvanced={true}
          investorName="US"
        />
      )

      expect(queryByText('Founder Impact')).toBeNull()
    })

    it('should show founder impact row when preRoundFounderPercent > 0', () => {
      const scenarioWithFounder = {
        ...baseScenario,
        preRoundFounderPercent: 70,
        postRoundFounderPercent: 53.84,
        founderDilution: 16.16
      }

      const { getByText } = render(
        <ScenarioCard 
          scenario={scenarioWithFounder} 
          index={1} 
          isBase={false}
          showAdvanced={true}
          investorName="US"
        />
      )

      expect(getByText('Founder Impact')).toBeTruthy()
      expect(getByText('53.8%')).toBeTruthy()
      expect(getByText('-16.16%')).toBeTruthy()
    })

    it('should hide founder impact row when showAdvanced is false', () => {
      const scenarioWithFounder = {
        ...baseScenario,
        preRoundFounderPercent: 70,
        postRoundFounderPercent: 53.84,
        founderDilution: 16.16
      }

      const { queryByText } = render(
        <ScenarioCard 
          scenario={scenarioWithFounder} 
          index={1} 
          isBase={false}
          showAdvanced={false}
          investorName="US"
        />
      )

      expect(queryByText('Founder Impact')).toBeNull()
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

      expect(getByText('SAFE #1')).toBeTruthy()
      expect(getByText('SAFE #2')).toBeTruthy()
      expect(getByText('$1.00M')).toBeTruthy() // SAFE 1 amount
      expect(getByText('$0.50M')).toBeTruthy() // SAFE 2 amount
    })

    it('should show legacy SAFE when no safeDetails but safeAmount > 0', () => {
      const scenarioWithLegacySafe = {
        ...baseScenario,
        safeAmount: 1,
        safePercent: 12.5,
        safeDetails: []
      }

      const { getByText } = render(
        <ScenarioCard 
          scenario={scenarioWithLegacySafe} 
          index={1} 
          isBase={false}
          showAdvanced={true}
          investorName="US"
        />
      )

      expect(getByText('SAFE Conv.')).toBeTruthy()
      expect(getByText('12.50%')).toBeTruthy()
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
    it('should show both SAFEs and founder impact when both present', () => {
      const fullScenario = {
        ...baseScenario,
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

      expect(getByText('SAFE #1')).toBeTruthy()
      expect(getByText('Founder Impact')).toBeTruthy()
    })

    it('should show only SAFEs when founder ownership is 0', () => {
      const safeOnlyScenario = {
        ...baseScenario,
        preRoundFounderPercent: 0,
        postRoundFounderPercent: 0,
        founderDilution: 0,
        safeDetails: [
          { id: 1, index: 1, amount: 1, cap: 8, discount: 0, conversionPrice: 8, percent: 12.5 }
        ]
      }

      const { getByText, queryByText } = render(
        <ScenarioCard 
          scenario={safeOnlyScenario} 
          index={1} 
          isBase={false}
          showAdvanced={true}
          investorName="US"
        />
      )

      expect(getByText('SAFE #1')).toBeTruthy()
      expect(queryByText('Founder Impact')).toBeNull()
    })
  })
})