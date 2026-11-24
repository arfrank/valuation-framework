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

describe('ExitMathModule returns', () => {
  const exitMath = { exitValuations: [1000], numRounds: 0, uniformDilution: 20, perRoundOverrides: [] }

  it('computes MOIC from the ownership this check buys, not the firm\'s whole position', () => {
    // A $1M check buys 5%. The firm also holds 30% from an earlier round, whose
    // cost isn't part of this check. At a $1B exit the check returns
    // 5% × $1,000M = $50M, i.e. 50x. Using the whole 35% would claim 350x.
    render(
      <ExitMathModule
        exitMath={exitMath}
        baseScenario={{
          investorAmount: 1,
          investorPercent: 5,
          combinedInvestor: {
            totalNewInvestment: 1,
            investorRoundPercent: 5,
            priorDilutedPercent: 30,
            safePercent: 0,
            totalOwnership: 35
          }
        }}
      />
    )

    expect(screen.getByText('Ownership from this check').nextSibling).toHaveTextContent('5.00%')
    expect(screen.getByText('Not included: prior equity and SAFEs').nextSibling).toHaveTextContent('30.00%')
    expect(screen.getByText('$50.00M')).toBeInTheDocument()
    expect(screen.getByText('50.00x')).toBeInTheDocument()
  })

  it('shows no exclusion note when the firm only holds its new-round position', () => {
    render(
      <ExitMathModule
        exitMath={exitMath}
        baseScenario={{
          investorAmount: 2,
          investorPercent: 20,
          combinedInvestor: { totalNewInvestment: 2, investorRoundPercent: 20, totalOwnership: 20 }
        }}
      />
    )

    expect(screen.queryByText('Not included: prior equity and SAFEs')).toBeNull()
    expect(screen.getByText('100.00x')).toBeInTheDocument() // 20% × $1,000M / $2M
  })
})
