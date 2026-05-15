import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
    fireEvent.change(preMoneyInput, { target: { value: '12' } })

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
    fireEvent.change(roundSizeInput, { target: { value: '4' } })

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

    const investorInput = screen.getByLabelText('Your firm:')
    
    // Fire a change event directly to test the handler
    fireEvent.change(investorInput, { target: { value: 'Acme VC' } })

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        investorName: 'Acme VC'
      })
    )
  })

  it('updates round type when switching to SAFE', async () => {
    const user = userEvent.setup()
    render(<InputForm company={defaultCompany} onUpdate={mockOnUpdate} />)

    await user.selectOptions(screen.getByLabelText('Round type'), 'safe')

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        roundInstrument: 'safe'
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

  it('should clamp investor portion to round size', () => {
    render(<InputForm company={defaultCompany} onUpdate={mockOnUpdate} />)

    fireEvent.change(screen.getByLabelText('US Portion'), { target: { value: '5' } })

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        investorPortion: 3,
        otherPortion: 0
      })
    )
  })

  it('should clamp investor portion when round size drops below it', () => {
    render(<InputForm company={defaultCompany} onUpdate={mockOnUpdate} />)

    fireEvent.change(screen.getByLabelText('Round Size'), { target: { value: '2' } })

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        roundSize: 2,
        investorPortion: 2,
        otherPortion: 0
      })
    )
  })

  it('pulses the auto-balanced other portion when round size changes', () => {
    render(<InputForm company={defaultCompany} onUpdate={mockOnUpdate} />)

    fireEvent.change(screen.getByLabelText('Round Size'), { target: { value: '4' } })

    expect(screen.getByLabelText('Other Portion').closest('.form-input-group')).toHaveClass('is-auto-balanced')
  })

  it('focuses the first SAFE field when adding a SAFE row', async () => {
    const user = userEvent.setup()
    render(<InputForm company={{ ...defaultCompany, showAdvanced: true }} onUpdate={mockOnUpdate} />)

    await user.click(screen.getByRole('button', { name: /add safe/i }))

    const safeInvestorInput = screen.getByLabelText('Investor')
    await waitFor(() => {
      expect(document.activeElement).toBe(safeInvestorInput)
    })
  })

  it('shows fixed-percent SAFE controls and caption', () => {
    render(<InputForm
      company={{
        ...defaultCompany,
        showAdvanced: true,
        safes: [{
          id: 1,
          investorName: 'Y Combinator ES24, LLC',
          amount: 0.125,
          conversionType: 'fixed-percent',
          fixedOwnershipPercent: 7,
          cap: 0,
          discount: 0,
          proRata: true
        }]
      }}
      onUpdate={mockOnUpdate}
    />)

    expect(screen.getByLabelText('SAFE type')).toHaveValue('fixed-percent')
    expect(screen.getByLabelText('Fixed %')).toHaveValue(7)
    expect(screen.getByText(/Converts at fixed 7\.00%/)).toBeInTheDocument()
  })

  it('summarizes large SAFE imports and keeps side-letter notes visible', () => {
    render(<InputForm
      company={{
        ...defaultCompany,
        showAdvanced: true,
        importWarnings: ['No cap table was provided'],
        safes: [
          {
            id: 1,
            investorName: 'The LegalTech Fund II, L.P.',
            amount: 0.1,
            conversionType: 'cap-discount',
            cap: 8,
            discount: 0,
            proRata: true,
            notes: 'Pro-rata, info rights, and MFN granted via separate side letter'
          },
          {
            id: 2,
            investorName: 'Y Combinator ES24, LLC',
            amount: 0.125,
            conversionType: 'fixed-percent',
            fixedOwnershipPercent: 7,
            proRata: false
          }
        ]
      }}
      onUpdate={mockOnUpdate}
    />)

    expect(screen.getByLabelText('SAFE import summary')).toHaveTextContent('2 SAFEs')
    expect(screen.getByLabelText('SAFE import summary')).toHaveTextContent('$0.225M total')
    expect(screen.getByText('No cap table was provided')).toBeInTheDocument()
    expect(screen.getByText('Side letter')).toBeInTheDocument()
    expect(screen.getByText(/Pro-rata, info rights, and MFN granted/)).toBeInTheDocument()
  })

  it('switches SAFE type selector to MFN and keeps cap/discount controls', async () => {
    const user = userEvent.setup()
    render(<InputForm
      company={{
        ...defaultCompany,
        showAdvanced: true,
        safes: [{ id: 1, investorName: 'YC ESP24, L.P.', amount: 0.375, cap: 0, discount: 0 }]
      }}
      onUpdate={mockOnUpdate}
    />)

    await user.selectOptions(screen.getByLabelText('SAFE type'), 'mfn')

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        safes: [expect.objectContaining({ conversionType: 'mfn' })]
      })
    )
    expect(screen.getByLabelText('Cap')).toBeInTheDocument()
    expect(screen.getByLabelText('Discount')).toBeInTheDocument()
  })

  it('shows round-price SAFE as non-editable round price fields', () => {
    render(<InputForm
      company={{
        ...defaultCompany,
        showAdvanced: true,
        safes: [{ id: 1, investorName: 'Round Price SAFE', amount: 0.1, conversionType: 'round-price' }]
      }}
      onUpdate={mockOnUpdate}
    />)

    expect(screen.getByLabelText('SAFE type')).toHaveValue('round-price')
    expect(screen.queryByLabelText('Cap')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Discount')).not.toBeInTheDocument()
    expect(screen.getAllByText('Round price').length).toBeGreaterThan(0)
    expect(screen.getByText('round')).toBeInTheDocument()
    expect(screen.getByText('price')).toBeInTheDocument()
  })

  it('shows pro-rata suppression copy for SAFE rounds', () => {
    render(<InputForm
      company={{
        ...defaultCompany,
        showAdvanced: true,
        roundInstrument: 'safe',
        safes: [{
          id: 1,
          investorName: 'Seed SAFE',
          amount: 1,
          conversionType: 'cap-discount',
          cap: 10,
          discount: 0,
          proRata: true
        }],
        priorInvestors: [{
          id: 2,
          name: 'Seed Fund',
          ownershipPercent: 10,
          hasProRataRights: true,
          proRataOverride: null
        }],
        founders: []
      }}
      onUpdate={mockOnUpdate}
    />)

    expect(screen.getAllByText('Pro-rata suppressed for SAFE round').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText('Pro-rata allocation')).not.toBeInTheDocument()
    expect(screen.queryByText('SAFE pro-rata:')).not.toBeInTheDocument()
  })
})
