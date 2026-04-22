import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScenarioControls from './ScenarioControls'

describe('ScenarioControls', () => {
  it('renders a normalized 3-down / 3-up band from offsets', () => {
    render(<ScenarioControls offsets={[-30, -20, -10, 10, 20, 30]} onChange={vi.fn()} />)

    expect(screen.getByText('−30%')).toBeInTheDocument()
    expect(screen.getByText('−15%')).toBeInTheDocument()
    expect(screen.getByText('−7.5%')).toBeInTheDocument()
    expect(screen.getByText('+7.5%')).toBeInTheDocument()
    expect(screen.getByText('+15%')).toBeInTheDocument()
    expect(screen.getByText('+30%')).toBeInTheDocument()
  })

  it('applies preset ranges as quarter / half / full bands', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<ScenarioControls offsets={[-30, -15, -7.5, 7.5, 15, 30]} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '±10' }))

    expect(onChange).toHaveBeenCalledWith([-10, -5, -2.5, 2.5, 5, 10])
  })

  it('accepts a custom max delta and expands it to six scenarios', () => {
    const onChange = vi.fn()

    render(<ScenarioControls offsets={[-30, -15, -7.5, 7.5, 15, 30]} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /set custom max delta/i }))
    const input = screen.getByPlaceholderText('max %')
    fireEvent.change(input, { target: { value: '25' } })
    fireEvent.blur(input)

    expect(onChange).toHaveBeenCalledWith([-25, -12.5, -6.25, 6.25, 12.5, 25])
  })
})
