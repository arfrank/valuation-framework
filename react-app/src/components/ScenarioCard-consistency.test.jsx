import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import ScenarioCard from './ScenarioCard'
import { calculateEnhancedScenarios } from '../utils/multiPartyCalculations'

// Every case renders the card from real engine output, so the fixtures can't
// drift into states the engine would never produce.
const baseCompany = {
  name: 'Co',
  postMoneyVal: 20,
  roundSize: 4,
  investorPortion: 3,
  otherPortion: 1,
  leadPortion: 0,
  firmLeadsRound: true,
  investorName: 'US',
  showAdvanced: true,
  priorInvestors: [],
  founders: [{ id: 'f1', name: 'Founder', ownershipPercent: 100 }],
  safes: [],
  currentEsopPercent: 0,
  grantedEsopPercent: 0,
  targetEsopPercent: 0,
  esopTiming: 'pre-close',
  warrants: []
}

function renderBaseCard(company) {
  const scenarios = calculateEnhancedScenarios(company)
  const { container } = render(
    <ScenarioCard
      scenario={scenarios[0]}
      index={0}
      isBase
      company={company}
      investorName={company.investorName}
      showAdvanced={company.showAdvanced}
    />
  )
  const rows = [...container.querySelectorAll('.scenario-table .table-row')].map(row => ({
    label: row.querySelector('.label')?.textContent.trim() ?? '',
    percent: parseFloat(row.querySelector('.percent')?.textContent ?? ''),
    isTotalRow: row.classList.contains('combined-total-row')
  }))
  return { rows, scenario: scenarios[0] }
}

const findRow = (rows, label) => rows.find(row => row.label === label)
const newRoundHeader = (rows) => rows.find(row => row.label.includes('New Round Total'))

describe('ScenarioCard rows agree with their section headers', () => {
  it('shows the firm\'s round slice, not its total, under New Round Total', () => {
    // $3M of a $4M round at $20M post is 15%. The firm also holds a $1M SAFE
    // at an $8M cap (12.5%), which belongs in the SAFE section.
    const { rows } = renderBaseCard({
      ...baseCompany,
      safes: [{ id: 's1', amount: 1, cap: 8, discount: 0, investorName: 'US', conversionType: 'cap-discount' }]
    })

    const header = newRoundHeader(rows)
    expect(header.percent).toBeCloseTo(20, 2)

    const firmRow = findRow(rows, 'US')
    expect(firmRow.percent).toBeCloseTo(15, 2)

    const totalRow = findRow(rows, 'US (total)')
    expect(totalRow.isTotalRow).toBe(true)
    expect(totalRow.percent).toBeCloseTo(27.5, 2)

    expect(firmRow.percent + findRow(rows, 'Other').percent).toBeCloseTo(header.percent, 2)
  })

  it('has no "(total)" row when the firm only holds its new-round position', () => {
    const { rows } = renderBaseCard(baseCompany)
    expect(findRow(rows, 'US (total)')).toBeUndefined()
    expect(findRow(rows, 'US').percent).toBeCloseTo(15, 2)
  })

  it('dilutes the Other row by a post-close ESOP top-up', () => {
    const { rows, scenario } = renderBaseCard({
      ...baseCompany,
      investorPortion: 2,
      otherPortion: 2,
      founders: [{ id: 'f1', name: 'Founder', ownershipPercent: 90 }],
      currentEsopPercent: 10,
      targetEsopPercent: 15,
      esopTiming: 'post-close'
    })

    expect(scenario.esopIncreasePostClose).toBeGreaterThan(0)
    const header = newRoundHeader(rows)
    const firmRow = findRow(rows, 'US')
    const otherRow = findRow(rows, 'Other')

    expect(otherRow.percent).toBeCloseTo(scenario.otherPercent, 2)
    expect(firmRow.percent + otherRow.percent).toBeCloseTo(header.percent, 1)
  })

  it('dilutes each SAFE row by a post-close ESOP top-up, matching the SAFE total', () => {
    // $1M at a $10M cap converts to 10%; a post-close top-up dilutes it further.
    const { rows, scenario } = renderBaseCard({
      ...baseCompany,
      founders: [{ id: 'f1', name: 'Founder', ownershipPercent: 90 }],
      safes: [{ id: 's1', amount: 1, cap: 10, discount: 0, investorName: 'Angel', conversionType: 'cap-discount' }],
      currentEsopPercent: 10,
      targetEsopPercent: 12,
      esopTiming: 'post-close'
    })

    expect(scenario.esopIncreasePostClose).toBeGreaterThan(0)
    const header = rows.find(row => row.label.includes('SAFEs Total'))
    const safeRow = findRow(rows, 'Angel')

    expect(header.percent).toBeLessThan(10)
    expect(safeRow.percent).toBeCloseTo(header.percent, 2)
  })

  it('renders the Prior Investors section when the firm is the only prior holder', () => {
    // A 20% prior stake diluted by a 20% round is 16%.
    const { rows } = renderBaseCard({
      ...baseCompany,
      founders: [{ id: 'f1', name: 'Founder', ownershipPercent: 80 }],
      priorInvestors: [{ id: 'p1', name: 'US', ownershipPercent: 20, hasProRataRights: false, proRataOverride: null }]
    })

    const sectionHeader = rows.find(row => row.label.includes('Prior Investors Total'))
    expect(sectionHeader).toBeDefined()
    expect(sectionHeader.percent).toBeCloseTo(16, 2)

    expect(findRow(rows, 'US (prior)').percent).toBeCloseTo(16, 2)
    expect(findRow(rows, 'US').percent).toBeCloseTo(15, 2)
    expect(findRow(rows, 'US (total)').percent).toBeCloseTo(31, 2)
  })
})
