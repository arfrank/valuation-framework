import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InputForm from './InputForm'

describe('InputForm - Two-Step Round', () => {
  const mockOnUpdate = vi.fn()
  const defaultCompany = {
    postMoneyVal: 400,
    roundSize: 100,
    investorPortion: 75,
    otherPortion: 25,
    investorName: 'Lead VC',
    showAdvanced: true,
    proRataPercent: 0,
    safes: [],
    preRoundFounderOwnership: 0,
    twoStepEnabled: false,
    step2PostMoney: 0,
    step2Amount: 0,
    step2InvestorPortion: 0,
    step2OtherPortion: 0
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the 2-Step Round section inside Advanced Features', () => {
    render(<InputForm company={defaultCompany} onUpdate={mockOnUpdate} />)
    expect(screen.getByText('2-Step Round')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /enable/i })).toBeInTheDocument()
  })

  it('should not render 2-Step Round section when advanced is hidden', () => {
    render(<InputForm company={{ ...defaultCompany, showAdvanced: false }} onUpdate={mockOnUpdate} />)
    expect(screen.queryByText('2-Step Round')).not.toBeInTheDocument()
  })

  it('should not show step 2 inputs when disabled', () => {
    render(<InputForm company={defaultCompany} onUpdate={mockOnUpdate} />)
    expect(screen.queryByText('Step 2')).not.toBeInTheDocument()
  })

  it('should show step 2 inputs when enabled', () => {
    render(<InputForm company={{ ...defaultCompany, twoStepEnabled: true }} onUpdate={mockOnUpdate} />)
    expect(screen.getByText('Step 2')).toBeInTheDocument()
  })

  it('should toggle twoStepEnabled when checkbox is clicked', async () => {
    const user = userEvent.setup()
    render(<InputForm company={defaultCompany} onUpdate={mockOnUpdate} />)

    const checkbox = screen.getByRole('checkbox', { name: /enable/i })
    await user.click(checkbox)

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        twoStepEnabled: true
      })
    )
  })

  it('should render step 2 input fields when enabled', () => {
    render(<InputForm company={{ ...defaultCompany, twoStepEnabled: true, step2PostMoney: 1000, step2Amount: 200 }} onUpdate={mockOnUpdate} />)

    // Should have two "Post-Money Valuation" labels visible (main + step 2)
    const postMoneyLabels = screen.getAllByText('Post-Money Valuation')
    expect(postMoneyLabels.length).toBe(2)

    // Should have an "Amount" label for step 2
    expect(screen.getByText('Amount')).toBeInTheDocument()
  })

  it('should auto-calculate step 2 other portion', async () => {
    render(<InputForm company={{
      ...defaultCompany,
      twoStepEnabled: true,
      step2PostMoney: 1000,
      step2Amount: 200,
      step2InvestorPortion: 100,
      step2OtherPortion: 100
    }} onUpdate={mockOnUpdate} />)

    // Change step 2 amount
    const amountInput = screen.getByLabelText('Amount')
    fireEvent.change(amountInput, { target: { value: '300' } })

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        step2Amount: 300,
        step2OtherPortion: 200 // 300 - 100
      })
    )
  })

  it('should show validation warning when V2 <= V1', () => {
    render(<InputForm company={{
      ...defaultCompany,
      twoStepEnabled: true,
      step2PostMoney: 300, // Less than V1 of 400
      step2Amount: 200,
      step2InvestorPortion: 100,
      step2OtherPortion: 100
    }} onUpdate={mockOnUpdate} />)

    expect(screen.getByText(/should be greater than/)).toBeInTheDocument()
  })

  it('should not show V2 warning when V2 > V1', () => {
    render(<InputForm company={{
      ...defaultCompany,
      twoStepEnabled: true,
      step2PostMoney: 1000,
      step2Amount: 200,
      step2InvestorPortion: 100,
      step2OtherPortion: 100
    }} onUpdate={mockOnUpdate} />)

    expect(screen.queryByText(/should be greater than/)).not.toBeInTheDocument()
  })

  it('should preserve main inputs when toggling two-step off', async () => {
    const user = userEvent.setup()
    const twoStepCompany = {
      ...defaultCompany,
      twoStepEnabled: true,
      step2PostMoney: 1000,
      step2Amount: 200,
      step2InvestorPortion: 100,
      step2OtherPortion: 100
    }

    render(<InputForm company={twoStepCompany} onUpdate={mockOnUpdate} />)

    // Toggle off
    const checkbox = screen.getByRole('checkbox', { name: /enable/i })
    await user.click(checkbox)

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        twoStepEnabled: false,
        postMoneyVal: 400,
        roundSize: 100,
        investorPortion: 75,
        otherPortion: 25
      })
    )
  })

  it('should show both main and step 2 investor name labels', () => {
    render(<InputForm company={{
      ...defaultCompany,
      twoStepEnabled: true,
      investorName: 'Acme VC',
      step2PostMoney: 1000,
      step2Amount: 200,
      step2InvestorPortion: 100,
      step2OtherPortion: 100
    }} onUpdate={mockOnUpdate} />)

    // Both main and step 2 should show the investor name
    const investorLabels = screen.getAllByText(/Acme VC Portion/)
    expect(investorLabels.length).toBe(2)
  })
})
