import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ScenarioCard from './ScenarioCard'

const baseScenario = {
  title: 'Base Case',
  postMoneyVal: 13,
  roundSize: 3,
  investorAmount: 2.75,
  investorPercent: 21.15,
  otherAmount: 0.25,
  otherPercent: 1.92,
  roundPercent: 23.08,
  totalAmount: 3,
  totalPercent: 23.08,
  preMoneyVal: 10,
  proRataAmount: 0,
  proRataPercent: 0,
  safes: [],
  safeDetails: [],
  totalSafePercent: 0,
  preRoundFounderPercent: 76.9,
  finalEsopPercent: 0,
  priorInvestors: [],
  founders: [],
  unknownOwnership: 0,
}

const baseCompany = {
  name: 'Startup Alpha',
  postMoneyVal: 13,
  roundSize: 3,
  investorPortion: 2.75,
  otherPortion: 0.25,
  investorName: 'LSVP',
}

describe('ScenarioCard Base quick-edit', () => {
  let onUpdateBase

  beforeEach(() => {
    onUpdateBase = vi.fn()
  })

  it('renders quick-edit inputs only when isBase with company + onUpdateBase', () => {
    const { rerender } = render(
      <ScenarioCard scenario={baseScenario} index={1} isBase={false} />
    )
    expect(screen.queryByText(/Round$/i)).not.toBeInTheDocument()

    rerender(
      <ScenarioCard
        scenario={baseScenario}
        index={0}
        isBase={true}
        company={baseCompany}
        onUpdateBase={onUpdateBase}
        investorName="LSVP"
      />
    )
    expect(screen.getByText('Post-Money')).toBeInTheDocument()
    expect(screen.getByText('Round')).toBeInTheDocument()
    expect(screen.getByText('LSVP')).toBeInTheDocument()
  })

  it('updates postMoneyVal on valuation edit', () => {
    render(
      <ScenarioCard
        scenario={baseScenario}
        index={0}
        isBase={true}
        company={baseCompany}
        onUpdateBase={onUpdateBase}
        investorName="LSVP"
      />
    )
    const inputs = screen.getAllByRole('spinbutton')
    // First input is Post-Money
    fireEvent.change(inputs[0], { target: { value: '20' } })
    expect(onUpdateBase).toHaveBeenCalledWith({ postMoneyVal: 20 })
  })

  it('auto-recomputes otherPortion when roundSize changes', () => {
    render(
      <ScenarioCard
        scenario={baseScenario}
        index={0}
        isBase={true}
        company={baseCompany}
        onUpdateBase={onUpdateBase}
        investorName="LSVP"
      />
    )
    const inputs = screen.getAllByRole('spinbutton')
    // Second input is Round
    fireEvent.change(inputs[1], { target: { value: '5' } })
    expect(onUpdateBase).toHaveBeenCalledWith({
      roundSize: 5,
      otherPortion: 2.25, // 5 - investorPortion(2.75)
    })
  })

  it('auto-recomputes otherPortion when investor portion changes', () => {
    render(
      <ScenarioCard
        scenario={baseScenario}
        index={0}
        isBase={true}
        company={baseCompany}
        onUpdateBase={onUpdateBase}
        investorName="LSVP"
      />
    )
    const inputs = screen.getAllByRole('spinbutton')
    // Third input is investor portion
    fireEvent.change(inputs[2], { target: { value: '2' } })
    expect(onUpdateBase).toHaveBeenCalledWith({
      investorPortion: 2,
      otherPortion: 1, // roundSize(3) - 2
    })
  })

  it('clamps negative values to 0', () => {
    render(
      <ScenarioCard
        scenario={baseScenario}
        index={0}
        isBase={true}
        company={baseCompany}
        onUpdateBase={onUpdateBase}
        investorName="LSVP"
      />
    )
    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.change(inputs[0], { target: { value: '-5' } })
    expect(onUpdateBase).toHaveBeenCalledWith({ postMoneyVal: 0 })
  })

  it('shows companyName in title when provided', () => {
    render(
      <ScenarioCard
        scenario={baseScenario}
        index={0}
        isBase={true}
        company={baseCompany}
        onUpdateBase={onUpdateBase}
        companyName="Startup Alpha 2"
      />
    )
    expect(screen.getByText(/Base Case — Startup Alpha 2/)).toBeInTheDocument()
  })
})
