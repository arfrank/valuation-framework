const ScenarioCard = ({ scenario, index, isBase }) => {
  const getCardClass = () => {
    if (isBase) return 'scenario-card base-scenario'
    return `scenario-card scenario-${index % 5}`
  }

  const formatPercent = (value) => `${value.toFixed(2)}%`
  const formatDollar = (value) => `$${value.toFixed(2)}M`

  return (
    <div className={getCardClass()}>
      {isBase && <div className="base-badge">Base Case</div>}
      
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
        
        <div className="table-row">
          <div className="label">LSVP</div>
          <div className="amount">{formatDollar(scenario.lsvpAmount)}</div>
          <div className="percent">{formatPercent(scenario.lsvpPercent)}</div>
        </div>
        
        <div className="table-row">
          <div className="label">Other</div>
          <div className="amount">{formatDollar(scenario.otherAmount)}</div>
          <div className="percent">{formatPercent(scenario.otherPercent)}</div>
        </div>
        
        <div className="table-row total-row">
          <div className="label">Total</div>
          <div className="amount">{formatDollar(scenario.totalAmount)}</div>
          <div className="percent">{formatPercent(scenario.totalPercent)}</div>
        </div>
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