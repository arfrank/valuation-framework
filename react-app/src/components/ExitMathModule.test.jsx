import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExitMathModule from './ExitMathModule'

const baseScenario = {
  investorAmount: 2,
  investorPercent: 20,
}

describe('ExitMathModule microinteractions', () => {
  it('pulses duplicate preset taps without changing exit scenarios', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()

    render(<ExitMathModule baseScenario={baseScenario} onUpdate={onUpdate} />)

    const preset = screen.getByRole('button', { name: '100M' })
    await user.click(preset)

    expect(onUpdate).not.toHaveBeenCalled()
    expect(preset).toHaveClass('duplicate-pulse')
  })

  it('adds a missing preset valuation through onUpdate', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()

    render(<ExitMathModule baseScenario={baseScenario} onUpdate={onUpdate} />)

    await user.click(screen.getByRole('button', { name: '10B' }))

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      exitValuations: [100, 500, 1000, 2000, 5000, 10000],
    }))
  })
})
