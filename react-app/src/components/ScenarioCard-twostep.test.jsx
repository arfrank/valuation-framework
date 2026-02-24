import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScenarioCard from './ScenarioCard'

describe('ScenarioCard - Two-Step Round Display', () => {
  const baseTwoStepScenario = {
    title: 'Base Case',
    postMoneyVal: 400,
    roundSize: 300,
    preMoneyVal: 300,
    investorName: 'Lead VC',
    investorAmount: 175,
    investorPercent: 25,
    otherAmount: 125,
    otherPercent: 15,
    otherAmountOriginal: 125,
    roundPercent: 40,
    totalAmount: 300,
    totalPercent: 40,
    proRataAmount: 0,
    proRataPercent: 0,
    proRataDetails: [],
    safes: [],
    totalSafePercent: 0,
    safeDetails: [],
    currentEsopPercent: 0,
    targetEsopPercent: 0,
    finalEsopPercent: 0,
    esopIncrease: 0,
    esopIncreasePreClose: 0,
    esopIncreasePostClose: 0,
    priorInvestors: [],
    founders: [],
    combinedInvestor: null,
    postRoundFounderPercent: 0,
    preRoundFounderPercent: 0,
    founderDilution: 0,
    totalOwnership: 100,
    unknownOwnership: 60,
    preRoundUnknownPercent: 100,
    twoStepEnabled: true,
    step1: {
      postMoney: 400,
      preMoney: 300,
      amount: 100,
      investorAmount: 75,
      otherAmount: 25,
      rawPercent: 25,
      finalPercent: 20,
      investorPercent: 15,
      otherPercent: 5
    },
    step2: {
      postMoney: 1000,
      preMoney: 800,
      amount: 200,
      investorAmount: 100,
      otherAmount: 100,
      percent: 20,
      investorPercent: 10,
      otherPercent: 10
    },
    analytics: {
      blendedPostMoney: 750,
      blendedPreMoney: 450,
      leadEffectivePostMoney: 608.7,
      instantMarkup: 150,
      headlineValuation: 1000
    }
  }

  const mockOnApplyScenario = vi.fn()
  const mockOnCopyPermalink = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show Step 1 and Step 2 sub-headers in the New Round section', () => {
    render(
      <ScenarioCard
        scenario={baseTwoStepScenario}
        index={0}
        isBase={true}
        onApplyScenario={mockOnApplyScenario}
        investorName="Lead VC"
      />
    )

    expect(screen.getByText('Step 1')).toBeInTheDocument()
    expect(screen.getByText('Step 2')).toBeInTheDocument()
  })

  it('should show per-step valuations', () => {
    render(
      <ScenarioCard
        scenario={baseTwoStepScenario}
        index={0}
        isBase={true}
        investorName="Lead VC"
      />
    )

    // $400.00M appears in both step header and V1 footer, so use getAllByText
    const fourHundredMs = screen.getAllByText(/\$400\.00M/)
    expect(fourHundredMs.length).toBeGreaterThanOrEqual(2)
    // $1000.00M appears in step 2 header and V2 footer and analytics
    const thousandMs = screen.getAllByText(/\$1000\.00M/)
    expect(thousandMs.length).toBeGreaterThanOrEqual(2)
  })

  it('should show step 1 and step 2 amounts', () => {
    render(
      <ScenarioCard
        scenario={baseTwoStepScenario}
        index={0}
        isBase={true}
        investorName="Lead VC"
      />
    )

    // Step 1 amount ($100.00M) appears in multiple sub-rows, so use getAllByText
    const hundredMs = screen.getAllByText('+$100.00M')
    expect(hundredMs.length).toBeGreaterThanOrEqual(1)
    // Step 2 amount: $200.00M
    expect(screen.getByText('+$200.00M')).toBeInTheDocument()
  })

  it('should show V1 and V2 in the valuation footer', () => {
    render(
      <ScenarioCard
        scenario={baseTwoStepScenario}
        index={0}
        isBase={true}
        investorName="Lead VC"
      />
    )

    expect(screen.getByText('V1 (Step 1):')).toBeInTheDocument()
    expect(screen.getByText('V2 (Step 2):')).toBeInTheDocument()
  })

  it('should NOT show V1/V2 footer for non-two-step scenarios', () => {
    const singleRoundScenario = {
      ...baseTwoStepScenario,
      twoStepEnabled: false,
      step1: undefined,
      step2: undefined,
      analytics: undefined
    }
    render(
      <ScenarioCard
        scenario={singleRoundScenario}
        index={0}
        isBase={true}
        investorName="Lead VC"
      />
    )

    expect(screen.queryByText('V1 (Step 1):')).not.toBeInTheDocument()
    expect(screen.getByText('Pre-Money:')).toBeInTheDocument()
    expect(screen.getByText('Post-Money:')).toBeInTheDocument()
  })

  it('should show analytics section for two-step scenarios', () => {
    render(
      <ScenarioCard
        scenario={baseTwoStepScenario}
        index={0}
        isBase={true}
        investorName="Lead VC"
      />
    )

    expect(screen.getByText('Headline valuation')).toBeInTheDocument()
    expect(screen.getByText('Blended post-money')).toBeInTheDocument()
    expect(screen.getByText('Lead VC effective post-money')).toBeInTheDocument()
    expect(screen.getByText(/Instant markup/)).toBeInTheDocument()
  })

  it('should show correct analytics values', () => {
    render(
      <ScenarioCard
        scenario={baseTwoStepScenario}
        index={0}
        isBase={true}
        investorName="Lead VC"
      />
    )

    // Headline and V2 footer both show $1000.00M
    const thousandMs = screen.getAllByText('$1000.00M')
    expect(thousandMs.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('$750.00M')).toBeInTheDocument() // blended post-money
    expect(screen.getByText('150.0%')).toBeInTheDocument() // instant markup
  })

  it('should NOT show analytics for non-two-step scenarios', () => {
    const singleRoundScenario = {
      ...baseTwoStepScenario,
      twoStepEnabled: false,
      step1: undefined,
      step2: undefined,
      analytics: undefined
    }
    render(
      <ScenarioCard
        scenario={singleRoundScenario}
        index={0}
        isBase={true}
        investorName="Lead VC"
      />
    )

    expect(screen.queryByText('Headline valuation')).not.toBeInTheDocument()
    expect(screen.queryByText('Blended post-money')).not.toBeInTheDocument()
  })

  it('should include two-step data in apply scenario call', async () => {
    const user = userEvent.setup()
    render(
      <ScenarioCard
        scenario={baseTwoStepScenario}
        index={1}
        isBase={false}
        onApplyScenario={mockOnApplyScenario}
        investorName="Lead VC"
      />
    )

    const applyBtn = screen.getByRole('button', { name: /apply/i })
    await user.click(applyBtn)

    expect(mockOnApplyScenario).toHaveBeenCalledWith(
      expect.objectContaining({
        twoStepEnabled: true,
        step2PostMoney: 1000,
        step2Amount: 200,
        step2InvestorPortion: 100,
        step2OtherPortion: 100,
        // Step 1 values as main inputs
        postMoneyVal: 400,
        roundSize: 100,
        investorPortion: 75,
        otherPortion: 25
      })
    )
  })

  it('should include two-step data in permalink copy call', async () => {
    mockOnCopyPermalink.mockResolvedValue({ success: true })
    const user = userEvent.setup()

    render(
      <ScenarioCard
        scenario={baseTwoStepScenario}
        index={0}
        isBase={true}
        onCopyPermalink={mockOnCopyPermalink}
        investorName="Lead VC"
      />
    )

    const permalinkBtn = screen.getByRole('button', { name: /🔗/ })
    await user.click(permalinkBtn)

    expect(mockOnCopyPermalink).toHaveBeenCalledWith(
      expect.objectContaining({
        twoStepEnabled: true,
        step2PostMoney: 1000,
        step2Amount: 200,
        step2InvestorPortion: 100,
        step2OtherPortion: 100
      })
    )
  })

  it('should show investor name in step breakdowns', () => {
    render(
      <ScenarioCard
        scenario={baseTwoStepScenario}
        index={0}
        isBase={true}
        investorName="Acme VC"
      />
    )

    // Investor name should appear in step 1 and step 2 sub-rows
    const investorLabels = screen.getAllByText(/Acme VC/)
    expect(investorLabels.length).toBeGreaterThanOrEqual(2)
  })
})
