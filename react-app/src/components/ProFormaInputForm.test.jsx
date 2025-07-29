import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProFormaInputForm from './ProFormaInputForm'

describe('ProFormaInputForm', () => {
  const mockCompany = {
    name: 'Test Company',
    postMoneyVal: 13,
    roundSize: 3,
    newInvestorAmount: 2.5,
    newInvestorName: 'Test Investor',
    existingInvestors: [],
    founders: [],
    safes: [],
    esopPoolPreClose: 0,
    esopPoolInRound: 0,
    isProFormaMode: true
  }

  const mockOnUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render pro-forma input form', () => {
    render(<ProFormaInputForm company={mockCompany} onUpdate={mockOnUpdate} />)
    
    expect(screen.getByText('Pro-Forma Cap Table Modeling')).toBeInTheDocument()
    expect(screen.getByLabelText(/Post-Money Valuation/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Round Size/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Investor Name/)).toBeInTheDocument()
  })

  it('should display calculated pre-money valuation', () => {
    render(<ProFormaInputForm company={mockCompany} onUpdate={mockOnUpdate} />)
    
    expect(screen.getByText('$10M')).toBeInTheDocument() // 13 - 3 = 10
  })

  it('should handle basic input changes', async () => {
    const user = userEvent.setup()
    render(<ProFormaInputForm company={mockCompany} onUpdate={mockOnUpdate} />)
    
    const postMoneyInput = screen.getByLabelText(/Post-Money Valuation/)
    await user.clear(postMoneyInput)
    await user.type(postMoneyInput, '15')
    
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        postMoneyVal: 15
      })
    )
  })

  it('should handle investor name changes', async () => {
    const user = userEvent.setup()
    render(<ProFormaInputForm company={mockCompany} onUpdate={mockOnUpdate} />)
    
    const investorNameInput = screen.getByLabelText(/Investor Name/)
    await user.clear(investorNameInput)
    await user.type(investorNameInput, 'New Lead VC')
    
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        newInvestorName: 'New Lead VC'
      })
    )
  })

  it('should add existing investors', async () => {
    const user = userEvent.setup()
    render(<ProFormaInputForm company={mockCompany} onUpdate={mockOnUpdate} />)
    
    const addInvestorButton = screen.getByText('+ Add Investor')
    await user.click(addInvestorButton)
    
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        existingInvestors: expect.arrayContaining([
          expect.objectContaining({
            name: '',
            ownershipPercent: 0,
            hasProRata: true,
            proRataCommitment: 0
          })
        ])
      })
    )
  })

  it('should add founders', async () => {
    const user = userEvent.setup()
    render(<ProFormaInputForm company={mockCompany} onUpdate={mockOnUpdate} />)
    
    const addFounderButton = screen.getByText('+ Add Founder')
    await user.click(addFounderButton)
    
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        founders: expect.arrayContaining([
          expect.objectContaining({
            name: '',
            ownershipPercent: 0,
            isFounder: true
          })
        ])
      })
    )
  })

  it('should add SAFE notes', async () => {
    const user = userEvent.setup()
    render(<ProFormaInputForm company={mockCompany} onUpdate={mockOnUpdate} />)
    
    const addSafeButton = screen.getByText('+ Add SAFE')
    await user.click(addSafeButton)
    
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        safes: expect.arrayContaining([
          expect.objectContaining({
            amount: 0,
            cap: 0,
            discount: 0
          })
        ])
      })
    )
  })

  it('should handle ESOP inputs', async () => {
    const user = userEvent.setup()
    render(<ProFormaInputForm company={mockCompany} onUpdate={mockOnUpdate} />)
    
    const esopPreCloseInput = screen.getByLabelText(/Pre-Close ESOP Pool/)
    await user.clear(esopPreCloseInput)
    await user.type(esopPreCloseInput, '10')
    
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        esopPoolPreClose: 10
      })
    )
  })

  it('should display round summary', () => {
    const companyWithData = {
      ...mockCompany,
      existingInvestors: [
        {
          id: 1,
          name: 'Seed Investor',
          ownershipPercent: 15,
          hasProRata: true,
          proRataCommitment: 0.3
        }
      ],
      safes: [
        { id: 1, amount: 0.5, cap: 8, discount: 0 }
      ],
      esopPoolInRound: 0.2
    }
    
    render(<ProFormaInputForm company={companyWithData} onUpdate={mockOnUpdate} />)
    
    expect(screen.getByText('Round Summary')).toBeInTheDocument()
    expect(screen.getByText('$0.30M')).toBeInTheDocument() // Existing commitments
    expect(screen.getByText('$0.50M')).toBeInTheDocument() // SAFE amount
    expect(screen.getByText('$0.20M')).toBeInTheDocument() // ESOP in round
  })

  it('should handle removing existing investors', async () => {
    const user = userEvent.setup()
    const companyWithInvestor = {
      ...mockCompany,
      existingInvestors: [
        {
          id: 1,
          name: 'Test Investor',
          ownershipPercent: 10,
          hasProRata: true,
          proRataCommitment: 0.2
        }
      ]
    }
    
    render(<ProFormaInputForm company={companyWithInvestor} onUpdate={mockOnUpdate} />)
    
    const removeButton = screen.getByText('Remove')
    await user.click(removeButton)
    
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        existingInvestors: []
      })
    )
  })

  it('should validate numeric inputs', async () => {
    const user = userEvent.setup()
    render(<ProFormaInputForm company={mockCompany} onUpdate={mockOnUpdate} />)
    
    const postMoneyInput = screen.getByLabelText(/Post-Money Valuation/)
    await user.clear(postMoneyInput)
    await user.type(postMoneyInput, 'invalid')
    
    // Should handle invalid input gracefully (convert to 0)
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        postMoneyVal: 0
      })
    )
  })

  it('should prevent negative values', async () => {
    const user = userEvent.setup()
    render(<ProFormaInputForm company={mockCompany} onUpdate={mockOnUpdate} />)
    
    const roundSizeInput = screen.getByLabelText(/Round Size/)
    await user.clear(roundSizeInput)
    await user.type(roundSizeInput, '-5')
    
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        roundSize: 0
      })
    )
  })

  it('should auto-calculate new investor amount when round size changes', async () => {
    const user = userEvent.setup()
    render(<ProFormaInputForm company={mockCompany} onUpdate={mockOnUpdate} />)
    
    const roundSizeInput = screen.getByLabelText(/Round Size/)
    await user.clear(roundSizeInput)
    await user.type(roundSizeInput, '5')
    
    // Should adjust newInvestorAmount based on new round size
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        roundSize: 5,
        newInvestorAmount: 5 // Assuming no existing commitments
      })
    )
  })

  it('should update existing investor pro-rata commitment', async () => {
    const user = userEvent.setup()
    const companyWithInvestor = {
      ...mockCompany,
      existingInvestors: [
        {
          id: 1,
          name: 'Test Investor',
          ownershipPercent: 10,
          hasProRata: true,
          proRataCommitment: 0
        }
      ]
    }
    
    render(<ProFormaInputForm company={companyWithInvestor} onUpdate={mockOnUpdate} />)
    
    const proRataInput = screen.getByLabelText(/Pro-Rata Commitment/)
    await user.clear(proRataInput)
    await user.type(proRataInput, '0.5')
    
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        existingInvestors: expect.arrayContaining([
          expect.objectContaining({
            proRataCommitment: 0.5
          })
        ])
      })
    )
  })
})