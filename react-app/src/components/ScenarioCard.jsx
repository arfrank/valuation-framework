import { useState } from 'react'

const ScenarioCard = ({ scenario, index, isBase, onApplyScenario, onCopyPermalink, investorName = 'US', showAdvanced = false }) => {
  const [copyFeedback, setCopyFeedback] = useState('')
  const [collapsed, setCollapsed] = useState({
    newRound: false,
    founders: false,
    priorInvestors: false,
    safes: false
  })
  
  const toggleCollapse = (section) => {
    setCollapsed(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }
  
  const getCardClass = () => {
    if (isBase) return 'scenario-card base-scenario'
    return `scenario-card scenario-${index % 5}`
  }

  const formatPercent = (value) => `${value.toFixed(2)}%`
  const formatDollar = (value) => `$${value.toFixed(2)}M`

  const handleApplyScenario = () => {
    if (onApplyScenario) {
      onApplyScenario({
        postMoneyVal: scenario.postMoneyVal,
        roundSize: scenario.roundSize,
        investorPortion: scenario.investorAmount,
        otherPortion: scenario.otherAmountOriginal || scenario.otherAmount,
        // Include advanced features if available
        proRataPercent: scenario.proRataPercentInput || 0,
        // N SAFEs support
        safes: scenario.safes || [],
        preRoundFounderOwnership: scenario.preRoundFounderPercent ?? 0,
        // Multi-party arrays
        priorInvestors: scenario.priorInvestors || [],
        founders: scenario.founders || [],
        // ESOP modeling
        currentEsopPercent: scenario.currentEsopPercent || 0,
        targetEsopPercent: scenario.targetEsopPercent || 0,
        esopTiming: scenario.esopTiming || 'pre-close'
      })
    }
  }

  const handleCopyPermalink = async () => {
    if (!onCopyPermalink) return

    try {
      const scenarioData = {
        postMoneyVal: scenario.postMoneyVal,
        roundSize: scenario.roundSize,
        investorPortion: scenario.investorAmount,
        otherPortion: scenario.otherAmountOriginal || scenario.otherAmount,
        investorName: investorName,
        showAdvanced: showAdvanced,
        proRataPercent: scenario.proRataPercentInput || 0,
        // N SAFEs support
        safes: scenario.safes || [],
        preRoundFounderOwnership: scenario.preRoundFounderPercent ?? 0,
        // Multi-party arrays
        priorInvestors: scenario.priorInvestors || [],
        founders: scenario.founders || [],
        // ESOP modeling
        currentEsopPercent: scenario.currentEsopPercent || 0,
        targetEsopPercent: scenario.targetEsopPercent || 0,
        esopTiming: scenario.esopTiming || 'pre-close'
      }

      const result = await onCopyPermalink(scenarioData)
      
      if (result.success) {
        setCopyFeedback('Copied!')
      } else {
        setCopyFeedback('Failed to copy')
      }
      
      // Clear feedback after 3 seconds
      setTimeout(() => setCopyFeedback(''), 3000)
    } catch {
      setCopyFeedback('Failed to copy')
      setTimeout(() => setCopyFeedback(''), 3000)
    }
  }

  // Detect combined investor (investorName matches a prior investor exactly)
  const combinedInvestor = scenario.combinedInvestor

  // Calculate total pro-rata across all prior investors
  const totalProRataAmount = scenario.priorInvestors
    ? scenario.priorInvestors.reduce((sum, inv) => sum + (inv.proRataAmount || 0), 0)
    : (scenario.proRataAmount || 0)

  // Remaining other for truly new investors (after ALL pro-rata)
  const remainingOther = scenario.otherAmountOriginal
    ? scenario.otherAmountOriginal - totalProRataAmount
    : scenario.otherAmount

  // Display values when investor is combined with a prior investor
  const displayInvestorAmount = combinedInvestor
    ? combinedInvestor.totalNewInvestment
    : scenario.investorAmount
  const displayInvestorOwnership = combinedInvestor
    ? combinedInvestor.totalOwnership
    : scenario.investorPercent

  // "Other" amount for display - when combined, exclude matched investor's pro-rata
  const displayOtherAmount = combinedInvestor
    ? (scenario.otherAmountOriginal || scenario.otherAmount) - (combinedInvestor.proRataAmount || 0)
    : (scenario.otherAmountOriginal || scenario.otherAmount)

  // Pro-rata investors to show under Other (exclude combined investor)
  const proRataInvestorsForDisplay = combinedInvestor
    ? (scenario.priorInvestors || []).filter(inv => inv.proRataAmount > 0 && inv.id !== combinedInvestor.id)
    : (scenario.priorInvestors || []).filter(inv => inv.proRataAmount > 0)
  const displayProRataTotal = proRataInvestorsForDisplay.reduce((sum, inv) => sum + (inv.proRataAmount || 0), 0)

  // Prior investors for display (exclude combined investor)
  const displayPriorInvestors = combinedInvestor
    ? (scenario.priorInvestors || []).filter(inv => inv.id !== combinedInvestor.id)
    : (scenario.priorInvestors || [])

  // Group founders and calculate total
  const foundersTotal = scenario.founders
    ? scenario.founders.reduce((sum, founder) => sum + founder.postRoundPercent, 0)
    : (scenario.preRoundFounderPercent || 0)

  // Group prior investors and calculate total (using display list)
  const priorInvestorsTotal = displayPriorInvestors.reduce((sum, inv) => sum + inv.postRoundPercent, 0)

  // Compute Prior Investors + Unknown as remainder so section totals sum to exactly 100%
  // (avoids double-counting pro-rata ownership in both New Round and Prior Investors)
  const adjustedPriorAndUnknownTotal = Math.max(0,
    100 - scenario.roundPercent - (scenario.totalSafePercent || 0) - foundersTotal - (scenario.finalEsopPercent || 0)
  )

  // Calculate unknown/other ownership lost using pre-round value from engine
  const unknownPreRound = scenario.preRoundUnknownPercent || 0
  const unknownOwnershipLost = unknownPreRound > 0
    ? unknownPreRound - (scenario.unknownOwnership || 0)
    : 0
    

  return (
    <div className={getCardClass()}>
      <div className="scenario-header">
        <h3 className="scenario-title">
          {scenario.title || (isBase ? "Base Case" : `Scenario ${index}`)}
        </h3>
        {!isBase && (
          <button 
            className="apply-scenario-btn" 
            onClick={handleApplyScenario}
            title="Apply this scenario to inputs"
          >
            Apply
          </button>
        )}
      </div>
      
      <div className="scenario-table">
        <div className="table-header">
          <div className="label">Party</div>
          <div className="amount">Change</div>
          <div className="percent">Ownership</div>
        </div>
        
        {/* Total New Round Header */}
        <div 
          className="table-row header-row clickable"
          onClick={() => toggleCollapse('newRound')}
        >
          <div className="label">
            <span className="collapse-indicator">{collapsed.newRound ? '▶' : '▼'}</span>
            <strong>New Round Total</strong>
          </div>
          <div className="amount amount-positive">+{formatDollar(scenario.roundSize)}</div>
          <div className="percent percent-bold">{formatPercent(scenario.roundPercent)}</div>
        </div>
        
        {/* New money breakdown */}
        {!collapsed.newRound && (
          <>
            <div className="table-row sub-row">
              <div className="label">├─ {investorName}{combinedInvestor ? ' (total)' : ''}</div>
              <div className="amount amount-positive">+{formatDollar(displayInvestorAmount)}</div>
              <div className="percent">{formatPercent(displayInvestorOwnership)}</div>
            </div>
        
        {showAdvanced ? (
          <>
            <div className="table-row sub-row">
              <div className="label">└─ Other</div>
              <div className="amount amount-positive">+{formatDollar(displayOtherAmount)}</div>
              <div className="percent">{formatPercent((displayOtherAmount / scenario.postMoneyVal) * 100)}</div>
            </div>

            {/* Pro-rata breakdown in advanced mode (exclude combined investor) */}
            {displayProRataTotal > 0 && (
              <>
                {proRataInvestorsForDisplay.map((investor, idx, arr) => (
                    <div key={investor.id || idx} className="table-row sub-sub-row">
                      <div className="label">    {remainingOther > 0.01 ? '├─' : (idx === arr.length - 1 ? '└─' : '├─')} {investor.name} (pro-rata)</div>
                      <div className="amount amount-positive">+{formatDollar(investor.proRataAmount)}</div>
                      <div className="percent">{formatPercent((investor.proRataAmount / scenario.postMoneyVal) * 100)}</div>
                    </div>
                  ))
                }
                {remainingOther > 0.01 && (
                  <div className="table-row sub-sub-row">
                    <div className="label">    └─ New investors</div>
                    <div className="amount amount-positive">+{formatDollar(remainingOther)}</div>
                    <div className="percent">{formatPercent((remainingOther / scenario.postMoneyVal) * 100)}</div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className="table-row sub-row">
            <div className="label">└─ Other</div>
            <div className="amount amount-positive">+{formatDollar(scenario.otherAmountOriginal || scenario.otherAmount)}</div>
            <div className="percent">{formatPercent(((scenario.otherAmountOriginal || scenario.otherAmount) / scenario.postMoneyVal) * 100)}</div>
          </div>
        )}
          </>
        )}
        
        {/* Founders section */}
        {showAdvanced && foundersTotal > 0 ? (
          <>
            {/* Founders header row */}
            <div 
              className="table-row header-row clickable"
              onClick={() => toggleCollapse('founders')}
            >
              <div className="label">
                <span className="collapse-indicator">{collapsed.founders ? '▶' : '▼'}</span>
                <strong>Founders Total</strong>
              </div>
              <div className="amount amount-negative">
                -{scenario.founders.reduce((sum, f) => sum + f.dilution, 0).toFixed(1)}%
              </div>
              <div className="percent percent-bold">{formatPercent(foundersTotal)}</div>
            </div>
            {/* Individual founders */}
            {!collapsed.founders && scenario.founders && scenario.founders.map((founder, idx) => (
              <div key={founder.id || idx} className="table-row sub-row">
                <div className="label">{idx === scenario.founders.length - 1 ? '└─' : '├─'} {founder.name || `Founder ${idx + 1}`}</div>
                <div className="amount amount-negative">-{founder.dilution.toFixed(1)}%</div>
                <div className="percent">{formatPercent(founder.postRoundPercent)}</div>
              </div>
            ))}
          </>
        ) : (
          scenario.preRoundFounderPercent > 0 && (
            <div className="table-row">
              <div className="label">Founders</div>
              <div className="amount amount-negative">-{((scenario.preRoundFounderPercent * scenario.roundPercent) / (100 - scenario.roundPercent)).toFixed(1)}%</div>
              <div className="percent percent-bold">{formatPercent(scenario.preRoundFounderPercent * (1 - scenario.roundPercent / 100))}</div>
            </div>
          )
        )}
        
        {/* Prior Investors & Unknown section (exclude combined investor) */}
        {showAdvanced && (displayPriorInvestors.length > 0 || scenario.unknownOwnership > 0.01) && (
          <>
            {/* Prior Investors header row */}
            <div
              className="table-row header-row clickable"
              onClick={() => toggleCollapse('priorInvestors')}
            >
              <div className="label">
                <span className="collapse-indicator">{collapsed.priorInvestors ? '▶' : '▼'}</span>
                <strong>Prior Investors Total</strong>
              </div>
              <div className="amount amount-negative">
                {/*-{(priorInvestorsTotalDilution + unknownOwnershipLost).toFixed(1)}%*/}
              </div>
              <div className="percent percent-bold">{formatPercent(adjustedPriorAndUnknownTotal)}</div>
            </div>

            {/* Individual prior investors (excluding combined investor) */}
            {!collapsed.priorInvestors && (
              <>
                {displayPriorInvestors.map((investor, idx) => {
                  const hasCombinedPrior = combinedInvestor && combinedInvestor.priorDilutedPercent > 0.01
                  const isLast = idx === displayPriorInvestors.length - 1 && scenario.unknownOwnership <= 0.01 && !hasCombinedPrior
                  return (
                    <div key={investor.id || idx} className="table-row sub-row">
                      <div className="label">{isLast ? '└─' : '├─'} {investor.name}</div>
                      <div className="amount">
                        {investor.proRataAmount > 0 ? (
                          <span className="amount-positive">+{formatDollar(investor.proRataAmount)} (pro-rata)</span>
                        ) : (
                          <span className="amount-negative">-{investor.dilution.toFixed(1)}%</span>
                        )}
                      </div>
                      <div className="percent">{formatPercent(investor.postRoundPercent)}</div>
                    </div>
                  )
                })}

                {/* Combined investor's diluted prior equity */}
                {combinedInvestor && combinedInvestor.priorDilutedPercent > 0.01 && (
                  <div className="table-row sub-row">
                    <div className="label">{scenario.unknownOwnership > 0.01 ? '├─' : '└─'} {investorName} (prior)</div>
                    <div className="amount amount-negative">
                      -{(combinedInvestor.priorOriginalPercent - combinedInvestor.priorDilutedPercent).toFixed(1)}%
                    </div>
                    <div className="percent">{formatPercent(combinedInvestor.priorDilutedPercent)}</div>
                  </div>
                )}

                {/* Unknown/Other ownership */}
                {scenario.unknownOwnership > 0.01 && (
                  <div className="table-row sub-row">
                    <div className="label">└─ Unknown/Other</div>
                    <div className="amount amount-negative">-{unknownOwnershipLost.toFixed(1)}%</div>
                    <div className="percent">{formatPercent(scenario.unknownOwnership)}</div>
                  </div>
                )}
              </>
            )}
          </>
        )}
        
        {/* SAFEs */}
        {showAdvanced && scenario.safeDetails && scenario.safeDetails.length > 0 && (
          <>
            {/* SAFEs header row */}
            <div 
              className="table-row header-row clickable"
              onClick={() => toggleCollapse('safes')}
            >
              <div className="label">
                <span className="collapse-indicator">{collapsed.safes ? '▶' : '▼'}</span>
                <strong>SAFEs Total</strong>
              </div>
              <div className="amount amount-neutral">converts</div>
              <div className="percent percent-bold">{formatPercent(scenario.totalSafePercent)}</div>
            </div>
            {/* Individual SAFEs */}
            {!collapsed.safes && scenario.safeDetails.map((safe, safeIndex) => (
              <div key={safe.id || safeIndex} className="table-row sub-row">
                <div className="label">{safeIndex === scenario.safeDetails.length - 1 ? '└─' : '├─'} SAFE #{safe.index}</div>
                <div className="amount amount-neutral">
                  <span style={{ fontSize: '0.85rem' }}>${safe.amount}M @ ${safe.conversionPrice}M</span>
                </div>
                <div className="percent">{formatPercent(safe.percent)}</div>
              </div>
            ))}
          </>
        )}
        
        {/* ESOP */}
        {showAdvanced && scenario.finalEsopPercent > 0 && (
          <div className="table-row">
            <div className="label">ESOP Pool</div>
            <div className="amount">
              {(() => {
                // Calculate ESOP dilution if there was a pre-existing ESOP
                if (scenario.currentEsopPercent > 0) {
                  const esopDilution = scenario.currentEsopPercent - scenario.finalEsopPercent
                  if (Math.abs(esopDilution) > 0.01) {
                    return (
                      <span className={esopDilution > 0 ? 'amount-negative' : 'amount-positive'}>
                        {esopDilution > 0 ? `-${esopDilution.toFixed(1)}%` : `+${Math.abs(esopDilution).toFixed(1)}%`}
                      </span>
                    )
                  }
                }
                // If ESOP increase, show positive change
                if (scenario.esopIncrease > 0) {
                  return <span className='amount-positive'>+{scenario.esopIncrease.toFixed(1)}%</span>
                }
                // Otherwise show neutral
                return <span className='amount-neutral'>—</span>
              })()}
            </div>
            <div className="percent percent-bold">{formatPercent(scenario.finalEsopPercent)}</div>
          </div>
        )}
        
        {/* Total row */}
        <div className="table-row total-row">
          <div className="label">Total</div>
          <div className="amount">{formatDollar(scenario.roundSize)}</div>
          <div className="percent">100%</div>
        </div>
      </div>
      
      <div className="valuation-footer">
        <div className="valuation-items">
          <div className="valuation-item">
            <span className="label">Pre-Money:</span>
            <span className="value">{formatDollar(scenario.preMoneyVal)}</span>
          </div>
          <div className="valuation-item">
            <span className="label">Post-Money:</span>
            <span className="value">{formatDollar(scenario.postMoneyVal)}</span>
          </div>
        </div>
        
        {isBase && onCopyPermalink && (
          <div className="share-buttons">
            <button 
              className="permalink-btn-inline" 
              onClick={handleCopyPermalink}
              title="Share permalink for this scenario"
              disabled={!!copyFeedback}
            >
              {copyFeedback || '🔗'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ScenarioCard