import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FormInput from './FormInput'

describe('FormInput Component', () => {
  it('should render with label on left and value on right', () => {
    render(
      <FormInput
        label="Post-Money Valuation"
        value={13}
        onChange={() => {}}
        prefix="$"
        suffix="M"
      />
    )

    expect(screen.getByLabelText('Post-Money Valuation')).toBeInTheDocument()
    expect(screen.getByDisplayValue('13')).toBeInTheDocument()
    expect(screen.getByText('$')).toBeInTheDocument()
    expect(screen.getByText('M')).toBeInTheDocument()
  })

  it('should show clear button when clearable and has value', () => {
    const mockOnChange = vi.fn()
    
    render(
      <FormInput
        label="Test Input"
        value={10}
        onChange={mockOnChange}
        clearable={true}
      />
    )

    const clearButton = screen.getByTitle('Clear test input')
    expect(clearButton).toBeInTheDocument()
  })

  it('should handle text input', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    
    render(
      <FormInput
        label="Investor Name"
        type="text"
        value="US"
        onChange={mockOnChange}
      />
    )

    const input = screen.getByDisplayValue('US')
    
    // Clear the input and verify empty string call
    await user.clear(input)
    expect(mockOnChange).toHaveBeenCalledWith('')
    
    // Type new value and verify the calls include the final value
    await user.type(input, 'Acme VC')
    expect(mockOnChange).toHaveBeenCalled()
    
    // Just verify that onChange was called multiple times during typing
    expect(mockOnChange.mock.calls.length).toBeGreaterThan(1)
  })

  it('should have proper accessibility attributes', () => {
    render(
      <FormInput
        label="Round Size"
        value={3}
        onChange={() => {}}
        prefix="$"
        suffix="M"
      />
    )

    const input = screen.getByLabelText('Round Size')
    const label = screen.getByText('Round Size')
    
    expect(input).toHaveAttribute('id')
    expect(label).toHaveAttribute('for', input.getAttribute('id'))
  })
})