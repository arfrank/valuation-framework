import { useState } from 'react'

const ScenarioCard = ({ scenario, index, isBase, onApplyScenario, onCopyPermalink, onCopyShareableText, investorName = 'US', showAdvanced = false }) => {
  const [copyFeedback, setCopyFeedback] = useState('')
  const [textFeedback, setTextFeedback] = useState('')
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
        otherPortion: scenario.otherAmount,
        // Include advanced features if available
        proRataPercent: scenario.proRataPercentInput || 0,
        // N SAFEs support
        safes: scenario.safes || [],
        // Legacy SAFE fields for backward compatibility
        safeAmount: scenario.safeAmount || 0,
        safeCap: scenario.safeCap || 0,
        safeDiscount: scenario.safeDiscount || 0,
        preRoundFounderOwnership: scenario.preRoundFounderPercent ?? 0
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
        otherPortion: scenario.otherAmount,
        investorName: investorName,
        showAdvanced: showAdvanced,
        proRataPercent: scenario.proRataPercentInput || 0,
        // N SAFEs support
        safes: scenario.safes || [],
        // Legacy SAFE fields for backward compatibility
        safeAmount: scenario.safeAmount || 0,
        safeCap: scenario.safeCap || 0,
        safeDiscount: scenario.safeDiscount || 0,
        preRoundFounderOwnership: scenario.preRoundFounderPercent ?? 0
      }

      const result = await onCopyPermalink(scenarioData)
      
      if (result.success) {
        setCopyFeedback('Copied!')
      } else {
        setCopyFeedback('Failed to copy')
      }
      
      // Clear feedback after 3 seconds
      setTimeout(() => setCopyFeedback(''), 3000)
    } catch (error) {
      setCopyFeedback('Failed to copy')
      setTimeout(() => setCopyFeedback(''), 3000)
    }
  }

  const handleCopyShareableText = async () => {
    if (!onCopyShareableText) return

    try {
      const scenarioData = {
        postMoneyVal: scenario.postMoneyVal,
        roundSize: scenario.roundSize,
        investorPortion: scenario.investorAmount,
        otherPortion: scenario.otherAmount,
        investorName: investorName,
        showAdvanced: showAdvanced,
        proRataPercent: scenario.proRataPercentInput || 0,
        // N SAFEs support
        safes: scenario.safes || [],
        // Legacy SAFE fields for backward compatibility
        safeAmount: scenario.safeAmount || 0,
        safeCap: scenario.safeCap || 0,
        safeDiscount: scenario.safeDiscount || 0,
        preRoundFounderOwnership: scenario.preRoundFounderPercent ?? 0
      }

      const result = await onCopyShareableText(scenarioData)
      
      if (result.success) {
        setTextFeedback('Copied!')
      } else {
        setTextFeedback('Failed to copy')
      }
      
      // Clear feedback after 3 seconds
      setTimeout(() => setTextFeedback(''), 3000)
    } catch (error) {
      setTextFeedback('Failed to copy')
      setTimeout(() => setTextFeedback(''), 3000)
    }
  }

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
          <div></div>
          <div>Amount</div>
          <div>%</div>
        </div>
        
        <div className="table-row">
          <div className="label">Round</div>
          <div className="amount">{formatDollar(scenario.roundSize)}</div>
          <div className="percent">{formatPercent(scenario.roundPercent)}</div>
        </div>
        
        <div className="table-row investor-row">
          <div className="label">{investorName}</div>
          <div className="amount">{formatDollar(scenario.investorAmount)}</div>
          <div className="percent">{formatPercent(scenario.investorPercent)}</div>
        </div>
        
        <div className="table-row">
          <div className="label">Other</div>
          <div className="amount">{formatDollar(scenario.otherAmount)}</div>
          <div className="percent">{formatPercent(scenario.otherPercent)}</div>
        </div>

        {showAdvanced && scenario.proRataAmount > 0 && (
          <div className="table-row pro-rata-row">
            <div className="label">Pro-Rata</div>
            <div className="amount">{formatDollar(scenario.proRataAmount)}</div>
            <div className="percent">{formatPercent(scenario.proRataPercent)}</div>
          </div>
        )}

        {showAdvanced && scenario.safeDetails && scenario.safeDetails.length > 0 && 
          scenario.safeDetails.map((safe, safeIndex) => (
            <div key={safe.id || safeIndex} className="table-row safe-row">
              <div className="label">SAFE #{safe.index}</div>
              <div className="amount">{formatDollar(safe.amount)}</div>
              <div className="percent">{formatPercent(safe.percent)}</div>
            </div>
          ))
        }

        {showAdvanced && scenario.safeAmount > 0 && (!scenario.safeDetails || scenario.safeDetails.length === 0) && (
          <div className="table-row safe-row">
            <div className="label">SAFE Conv.</div>
            <div className="amount">{formatDollar(scenario.safeAmount)}</div>
            <div className="percent">{formatPercent(scenario.safePercent)}</div>
          </div>
        )}
        
        <div className="table-row total-row">
          <div className="label">Total</div>
          <div className="amount">{formatDollar(scenario.totalAmount)}</div>
          <div className="percent">{formatPercent(scenario.totalPercent)}</div>
        </div>

        {showAdvanced && scenario.preRoundFounderPercent > 0 && (
          <div className="table-row founder-row">
            <div className="label">Founder Impact</div>
            <div className="amount">{scenario.postRoundFounderPercent.toFixed(1)}%</div>
            <div className="percent">-{formatPercent(scenario.founderDilution)}</div>
          </div>
        )}
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
        
        <div className="share-buttons">
          {onCopyPermalink && (
            <button 
              className="permalink-btn-inline" 
              onClick={handleCopyPermalink}
              title="Share permalink for this scenario"
              disabled={!!copyFeedback}
            >
              {copyFeedback || '🔗'}
            </button>
          )}
          {onCopyShareableText && (
            <button 
              className="permalink-btn-inline" 
              onClick={handleCopyShareableText}
              title="Copy formatted text summary"
              disabled={!!textFeedback}
            >
              {textFeedback || '📋'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ScenarioCard