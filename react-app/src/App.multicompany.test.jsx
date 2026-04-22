import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'

vi.mock('./components/CompanyTabs', () => ({
  default: ({ companies, activeCompany, onCompanyChange, onAddCompany, selectedCompanyIds, onToggleCompareSelection }) => (
    <div data-testid="company-tabs">
      {Object.entries(companies).map(([id, company]) => (
        <div key={id}>
          <button data-testid={`tab-${id}`} onClick={() => onCompanyChange(id)}>
            {company.name}{activeCompany === id ? ' (active)' : ''}
          </button>
          <button data-testid={`compare-${id}`} onClick={() => onToggleCompareSelection(id)}>
            {selectedCompanyIds.includes(id) ? `Uncompare ${company.name}` : `Compare ${company.name}`}
          </button>
        </div>
      ))}
      <button data-testid="add-company" onClick={onAddCompany}>Add Company</button>
    </div>
  )
}))

vi.mock('./components/InputForm', () => ({
  default: ({ company }) => (
    <div data-testid="input-form">{company?.name || 'no-company'}</div>
  )
}))

vi.mock('./components/ScenarioCard', () => ({
  default: ({ isBase, companyName, scenario }) => (
    <div data-testid={isBase ? 'base-scenario' : 'alt-scenario'}>
      {isBase ? (companyName || scenario?.title || 'Base Case') : (scenario?.title || 'Scenario')}
    </div>
  )
}))

vi.mock('./components/ScenarioControls', () => ({
  default: () => <div data-testid="scenario-controls">Scenario Controls</div>
}))

vi.mock('./components/Logo', () => ({
  default: () => <div data-testid="logo">Logo</div>
}))

vi.mock('./components/NotificationContainer', () => ({
  default: () => null
}))

vi.mock('./components/ExitMathModule', () => ({
  default: () => <div data-testid="exit-math">Exit Math</div>
}))

describe('App multi-company state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()

    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000',
        origin: 'http://localhost:3000',
        pathname: '/',
        search: '',
        hash: '',
      },
      writable: true,
    })
  })

  it('hydrates the active company from persisted data and appends new company ids after the max existing id', async () => {
    window.localStorage.setItem('valuationFramework', JSON.stringify({
      company2: {
        name: 'Persisted Beta',
        postMoneyVal: 20,
        roundSize: 4,
        investorPortion: 3,
        otherPortion: 1,
        investorName: 'US',
        showAdvanced: false,
        safes: [],
        priorInvestors: [],
        founders: [],
        currentEsopPercent: 0,
        grantedEsopPercent: 0,
        targetEsopPercent: 0,
        esopTiming: 'pre-close',
        scenarioOffsets: [-30, -20, -10, 10, 20, 30],
        showExitMath: false,
        exitMath: { exitValuation: 5000, numRounds: 3, uniformDilution: 20, perRoundOverrides: [] }
      }
    }))

    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('input-form')).toHaveTextContent('Persisted Beta')
    })

    fireEvent.click(screen.getByTestId('add-company'))

    const stored = JSON.parse(window.localStorage.getItem('valuationFramework'))
    expect(Object.keys(stored).sort()).toEqual(['company2', 'company3'])
    expect(stored.company2.name).toBe('Persisted Beta')
    expect(stored.company3.name).toBe('Startup C')
  })

  it('hides non-base scenarios while compare mode is active', async () => {
    render(<App />)

    fireEvent.click(screen.getByTestId('add-company'))

    await waitFor(() => {
      expect(screen.getByTestId('compare-company2')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('compare-company1'))
    fireEvent.click(screen.getByTestId('compare-company2'))

    await waitFor(() => {
      expect(screen.getAllByTestId('base-scenario')).toHaveLength(2)
    })

    expect(screen.queryByTestId('alt-scenario')).not.toBeInTheDocument()
    expect(screen.queryByTestId('scenario-controls')).not.toBeInTheDocument()
  })
})
