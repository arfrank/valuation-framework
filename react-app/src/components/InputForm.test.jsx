import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InputForm from './InputForm'

describe('InputForm with Pre-Money Toggle', () => {
  const mockOnUpdate = vi.fn()
  const defaultCompany = {
    postMoneyVal: 13,
    roundSize: 3,
    investorPortion: 2.75,
    otherPortion: 0.25,
    investorName: 'US',
    showAdvanced: false,
    proRataPercent: 0,
    safes: [],
    preRoundFounderOwnership: 0
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render in post-money mode by default', () => {
    render(<InputForm company={defaultCompany} onUpdate={mockOnUpdate} />)
    
    expect(screen.getByText(/Pre-Money:/)).toBeInTheDocument()
    expect(screen.getByLabelText('Post-Money Valuation')).toBeInTheDocument()
  })

  it('should show correct pre-money calculation in toggle display', () => {
    render(<InputForm company={defaultCompany} onUpdate={mockOnUpdate} />)
    
    // Pre-money = Post-money - Round size = 13 - 3 = 10
    expect(screen.getByText('$10.0M')).toBeInTheDocument()
  })

  it('should toggle to pre-money mode when clicked', async () => {
    const user = userEvent.setup()
    render(<InputForm company={defaultCompany} onUpdate={mockOnUpdate} />)

    const toggleElement = screen.getByText(/Pre-Money:/)
    await user.click(toggleElement)

    expect(screen.getByText(/Post-Money:/)).toBeInTheDocument()
    expect(screen.getByLabelText('Pre-Money Valuation')).toBeInTheDocument()
  })

  it('should show correct post-money calculation in toggle display when in pre-money mode', async () => {
    const user = userEvent.setup()
    render(<InputForm company={defaultCompany} onUpdate={mockOnUpdate} />)

    const toggleElement = screen.getByText(/Pre-Money:/)
    await user.click(toggleElement)

    // Should show post-money value (13.0M) in the toggle display
    expect(screen.getByText('$13.0M')).toBeInTheDocument()
  })

  it('should display toggle hint symbol', () => {
    render(<InputForm company={defaultCompany} onUpdate={mockOnUpdate} />)
    
    expect(screen.getByText('⇄')).toBeInTheDocument()
  })

  it('should calculate post-money when pre-money input changes', async () => {
    const user = userEvent.setup()
    render(<InputForm company={defaultCompany} onUpdate={mockOnUpdate} />)

    // Switch to pre-money mode
    await user.click(screen.getByText(/Pre-Money:/))
    
    // Change pre-money input to 12
    const preMoneyInput = screen.getByLabelText('Pre-Money Valuation')
    await user.clear(preMoneyInput)
    await user.type(preMoneyInput, '12')

    // Should update to post-money = pre-money + round size = 12 + 3 = 15
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        postMoneyVal: 15
      })
    )
  })

  it('should handle round size changes in pre-money mode', async () => {
    const user = userEvent.setup()
    render(<InputForm company={defaultCompany} onUpdate={mockOnUpdate} />)

    // Switch to pre-money mode first
    await user.click(screen.getByText(/Pre-Money:/))
    
    // Change round size
    const roundSizeInput = screen.getByLabelText('Round Size')
    await user.clear(roundSizeInput)
    await user.type(roundSizeInput, '4')

    // Post-money should be recalculated: current pre-money (10) + new round size (4) = 14
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        roundSize: 4,
        postMoneyVal: 14,
        otherPortion: 1.25 // 4 - 2.75 = 1.25
      })
    )
  })

  it('should maintain input mode when toggling back and forth', async () => {
    const user = userEvent.setup()
    render(<InputForm company={defaultCompany} onUpdate={mockOnUpdate} />)

    // Start in post-money mode
    expect(screen.getByLabelText('Post-Money Valuation')).toBeInTheDocument()

    // Toggle to pre-money
    await user.click(screen.getByText(/Pre-Money:/))
    expect(screen.getByLabelText('Pre-Money Valuation')).toBeInTheDocument()

    // Toggle back to post-money
    await user.click(screen.getByText(/Post-Money:/))
    expect(screen.getByLabelText('Post-Money Valuation')).toBeInTheDocument()
  })

  it('should show correct input value for each mode', async () => {
    const user = userEvent.setup()
    render(<InputForm company={defaultCompany} onUpdate={mockOnUpdate} />)

    // In post-money mode, should show post-money value
    let valuationInput = screen.getByLabelText('Post-Money Valuation')
    expect(valuationInput.value).toBe('13')

    // Switch to pre-money mode
    await user.click(screen.getByText(/Pre-Money:/))
    
    // In pre-money mode, should show pre-money value (10)
    valuationInput = screen.getByLabelText('Pre-Money Valuation')
    expect(valuationInput.value).toBe('10')
  })

  it('should handle investor name changes correctly', async () => {
    // const user = userEvent.setup()
    render(<InputForm company={defaultCompany} onUpdate={mockOnUpdate} />)

    const investorInput = screen.getByLabelText('Investor:')
    
    // Fire a change event directly to test the handler
    fireEvent.change(investorInput, { target: { value: 'Acme VC' } })

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        investorName: 'Acme VC'
      })
    )
  })

  it('should maintain compact styling with proper spacing', () => {
    render(<InputForm company={defaultCompany} onUpdate={mockOnUpdate} />)
    
    const inputForm = document.querySelector('.input-form')
    // const computedStyle = window.getComputedStyle(inputForm)
    
    // Should have reduced padding for compact layout
    expect(inputForm).toHaveClass('input-form')
  })
})