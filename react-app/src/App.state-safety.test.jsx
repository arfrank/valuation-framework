import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { createDefaultCompany } from './utils/dataStructures'
import { encodeScenarioToURL } from './utils/permalink'
import { TOUR_SEEN_KEY } from './utils/walkthroughSteps'

const stored = () => JSON.parse(window.localStorage.getItem('valuationFramework'))
const seed = (companies) => {
  window.localStorage.setItem('valuationFramework', JSON.stringify(companies))
}
const wait = (ms) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)) })

const makeSafe = (id, investorName) => ({
  id,
  amount: 1,
  conversionType: 'cap-discount',
  cap: 10,
  discount: 0,
  investorName,
  proRata: false,
  proRataOverride: null
})

let originalReplaceState

beforeEach(() => {
  window.localStorage.clear()
  window.localStorage.setItem(TOUR_SEEN_KEY, '1')
  window.location.search = ''
  originalReplaceState = window.history.replaceState
})

afterEach(() => {
  window.history.replaceState = originalReplaceState
  window.location.search = ''
})

describe('row Undo never touches another company', () => {
  it('drops a pending SAFE Undo when the user switches tabs', async () => {
    const alpha = { ...createDefaultCompany('Alpha'), showAdvanced: true, postMoneyVal: 50, safes: [makeSafe(111, 'S1')] }
    const beta = { ...createDefaultCompany('Beta'), postMoneyVal: 99 }
    seed({ company1: alpha, company2: beta })
    render(<App />)

    fireEvent.click(screen.getByTitle('Remove SAFE'))
    await wait(250)
    expect(stored().company1.safes).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()

    fireEvent.click(screen.getByText('Beta'))
    await waitFor(() => expect(document.getElementById('core-valuation-input').value).toBe('99'))

    // The toast belonged to Alpha; it must not be clickable on Beta.
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
    const after = stored()
    expect(after.company1.name).toBe('Alpha')
    expect(after.company1.postMoneyVal).toBe(50)
    expect(after.company2.name).toBe('Beta')
    expect(after.company2.postMoneyVal).toBe(99)
    expect(after.company2.safes).toHaveLength(0)
  })

  it('restores a removed SAFE on the same tab', async () => {
    const alpha = { ...createDefaultCompany('Alpha'), showAdvanced: true, safes: [makeSafe(111, 'S1'), makeSafe(112, 'S2')] }
    seed({ company1: alpha })
    render(<App />)

    fireEvent.click(screen.getAllByTitle('Remove SAFE')[0])
    await wait(250)
    expect(stored().company1.safes.map(s => s.investorName)).toEqual(['S2'])

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await wait(50)
    expect(stored().company1.safes.map(s => s.investorName)).toEqual(['S1', 'S2'])
  })

  it('keeps edits made between removing a prior investor and clicking Undo', async () => {
    const alpha = { ...createDefaultCompany('Alpha'), showAdvanced: true }
    alpha.priorInvestors = [
      { ...alpha.priorInvestors[0], id: 1, name: 'First', ownershipPercent: 15 },
      { ...alpha.priorInvestors[0], id: 2, name: 'Second', ownershipPercent: 5 }
    ]
    alpha.founders[0].ownershipPercent = 80
    seed({ company1: alpha })
    render(<App />)

    fireEvent.click(screen.getAllByTitle('Remove investor')[1])
    await wait(250)
    expect(stored().company1.priorInvestors).toHaveLength(1)

    const user = userEvent.setup()
    const postMoney = document.getElementById('core-valuation-input')
    await user.clear(postMoney)
    await user.type(postMoney, '40')
    expect(stored().company1.postMoneyVal).toBe(40)

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await wait(50)
    expect(stored().company1.priorInvestors.map(inv => inv.name)).toEqual(['First', 'Second'])
    expect(stored().company1.postMoneyVal).toBe(40)
  })
})

describe('typing names', () => {
  it('keeps the space in a multi-word firm name', async () => {
    render(<App />)
    const user = userEvent.setup()
    const input = document.getElementById('investor-name')
    await user.tripleClick(input)
    await user.keyboard('Acme Ventures')
    expect(input.value).toBe('Acme Ventures')
    expect(stored().company1.investorName).toBe('Acme Ventures')
  })

  it('keeps the space in a multi-word founder name', async () => {
    const alpha = { ...createDefaultCompany('Alpha'), showAdvanced: true }
    seed({ company1: alpha })
    render(<App />)
    const user = userEvent.setup()
    const input = document.getElementById(`founder-name-${alpha.founders[0].id}`)
    await user.clear(input)
    await user.type(input, 'Jane Doe')
    expect(input.value).toBe('Jane Doe')
  })

  it('does not swallow the first characters typed into a newly added investor row', async () => {
    const alpha = { ...createDefaultCompany('Alpha'), showAdvanced: true }
    seed({ company1: alpha })
    render(<App />)
    const user = userEvent.setup({ delay: 120 })
    await user.click(screen.getByText('+ Add Investor'))
    await wait(100)
    await user.keyboard('Sequoia')
    const investors = stored().company1.priorInvestors
    expect(investors[investors.length - 1].name).toBe('Sequoia')
  })
})

describe('arriving through a permalink', () => {
  it('does not start the tour or replace the shared scenario for a first-time visitor', async () => {
    window.localStorage.removeItem(TOUR_SEEN_KEY)
    const shared = { ...createDefaultCompany('Shared Deal'), postMoneyVal: 77 }
    const query = encodeScenarioToURL(shared)
    window.location.search = query.startsWith('?') ? query : `?${query}`
    // A real browser clears location.search when the loader calls replaceState.
    window.history.replaceState = () => { window.location.search = '' }

    render(<App />)
    await wait(500)

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(Object.values(stored()).map(c => c.name)).toEqual(['Scenario 1', 'Shared Deal'])
    expect(document.getElementById('core-valuation-input').value).toBe('77')
  })
})

describe('corrupt stored data', () => {
  it.each([
    ['null', 'null'],
    ['an object', '{}'],
    ['a string', '"x"'],
    ['a number', '5']
  ])('renders when the compare selection is %s', (_label, raw) => {
    window.localStorage.setItem('valuationFrameworkSelected', raw)
    render(<App />)
    expect(document.getElementById('core-valuation-input')).toBeInTheDocument()
  })

  it('renders when a stored SAFE has a non-string investor name', () => {
    const alpha = { ...createDefaultCompany('Alpha'), showAdvanced: true, safes: [{ ...makeSafe(1, 42), proRata: true }] }
    seed({ company1: alpha })
    render(<App />)
    expect(document.getElementById('core-valuation-input')).toBeInTheDocument()
    expect(stored().company1.safes[0].investorName).toBe('42')
  })
})
