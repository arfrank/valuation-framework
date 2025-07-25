const ScenarioCard = ({ scenario, index, isBase, onApplyScenario, investorName = 'US', showAdvanced = false }) => {
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
        lsvpPortion: scenario.lsvpAmount,
        otherPortion: scenario.otherAmount
      })
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
          <div className="amount">{formatDollar(scenario.lsvpAmount)}</div>
          <div className="percent">{formatPercent(scenario.lsvpPercent)}</div>
        </div>
        
        <div className="table-row">
          <div className="label">Other</div>
          <div className="amount">{formatDollar(scenario.otherAmount)}</div>
          <div className="percent">{formatPercent(scenario.otherPercent)}</div>
        </div>

        {showAdvanced && scenario.proRataAmount > 0 && (
          <div className="table-row">
            <div className="label">Pro-Rata</div>
            <div className="amount">{formatDollar(scenario.proRataAmount)}</div>
            <div className="percent">{formatPercent(scenario.proRataPercent)}</div>
          </div>
        )}

        {showAdvanced && scenario.safeAmount > 0 && (
          <div className="table-row">
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

        {showAdvanced && (
          <div className="table-row founder-row">
            <div className="label">Founder Impact</div>
            <div className="amount">{scenario.postRoundFounderPercent.toFixed(1)}%</div>
            <div className="percent">-{formatPercent(scenario.founderDilution)}</div>
          </div>
        )}
      </div>
      
      <div className="valuation-footer">
        <div className="valuation-item">
          <span className="label">Pre-Money:</span>
          <span className="value">{formatDollar(scenario.preMoneyVal)}</span>
        </div>
        <div className="valuation-item">
          <span className="label">Post-Money:</span>
          <span className="value">{formatDollar(scenario.postMoneyVal)}</span>
        </div>
      </div>
    </div>
  )
}

export default ScenarioCard