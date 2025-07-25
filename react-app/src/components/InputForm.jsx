import { useState, useEffect } from 'react'

const InputForm = ({ company, onUpdate }) => {
  const [values, setValues] = useState({
    postMoneyVal: 13,
    roundSize: 3,
    lsvpPortion: 2.75,
    otherPortion: 0.25,
    investorName: 'US',
    // Advanced features
    showAdvanced: false,
    proRataPercent: 15,
    safeAmount: 0,
    safeCap: 0,
    preRoundFounderOwnership: 70
  })

  useEffect(() => {
    if (company) {
      setValues(company)
    }
  }, [company])

  const handleChange = (field, value) => {
    let numValue = field === 'investorName' || field === 'showAdvanced' ? value : (parseFloat(value) || 0)
    
    // Input validation for numeric fields
    if (field !== 'investorName' && field !== 'showAdvanced') {
      // Prevent negative values
      if (numValue < 0) numValue = 0
      // Prevent unreasonably large values (> 1 trillion)
      if (numValue > 1000000) numValue = 1000000
    }
    
    const newValues = { ...values, [field]: numValue }
    
    // Auto-calculate other portion when round size or LSVP portion changes
    if (field === 'roundSize' || field === 'lsvpPortion') {
      if (field === 'roundSize') {
        newValues.otherPortion = Math.round(Math.max(0, numValue - values.lsvpPortion) * 100) / 100
      } else if (field === 'lsvpPortion') {
        newValues.otherPortion = Math.round(Math.max(0, values.roundSize - numValue) * 100) / 100
      }
    }
    
    setValues(newValues)
    onUpdate(newValues)
  }

  const preMoneyVal = Math.round((values.postMoneyVal - values.roundSize) * 100) / 100

  return (
    <div className="input-form">
      <div className="form-header">
        <h3>Investment Parameters</h3>
        <div className="header-controls">
          <div className="investor-name-input">
            <label htmlFor="investor-name">Investor:</label>
            <input
              id="investor-name"
              type="text"
              value={values.investorName || 'US'}
              onChange={(e) => handleChange('investorName', e.target.value)}
              placeholder="US"
            />
          </div>
          <div className="calculated-pre-money">
            Pre-Money: <span className="value">${preMoneyVal.toFixed(1)}M</span>
          </div>
        </div>
      </div>

      <div className="input-grid">
        <div className="input-group">
          <label htmlFor="post-money">Post-Money Valuation</label>
          <div className="input-wrapper">
            <span className="currency">$</span>
            <input
              id="post-money"
              type="number"
              value={values.postMoneyVal}
              onChange={(e) => handleChange('postMoneyVal', e.target.value)}
              step="0.1"
              min="0"
            />
            <span className="unit">M</span>
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="round-size">Round Size</label>
          <div className="input-wrapper">
            <span className="currency">$</span>
            <input
              id="round-size"
              type="number"
              value={values.roundSize}
              onChange={(e) => handleChange('roundSize', e.target.value)}
              step="0.1"
              min="0"
            />
            <span className="unit">M</span>
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="lsvp-portion">{values.investorName || 'US'} Portion</label>
          <div className="input-wrapper">
            <span className="currency">$</span>
            <input
              id="lsvp-portion"
              type="number"
              value={values.lsvpPortion}
              onChange={(e) => handleChange('lsvpPortion', e.target.value)}
              step="0.01"
              min="0"
              max={values.roundSize}
            />
            <span className="unit">M</span>
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="other-portion">Other Portion</label>
          <div className="input-wrapper">
            <span className="currency">$</span>
            <input
              id="other-portion"
              type="number"
              value={values.otherPortion}
              onChange={(e) => handleChange('otherPortion', e.target.value)}
              step="0.01"
              min="0"
            />
            <span className="unit">M</span>
          </div>
        </div>
      </div>

      {/* Advanced Features Toggle */}
      <div className="advanced-toggle">
        <button 
          type="button"
          className="toggle-advanced-btn"
          onClick={() => handleChange('showAdvanced', !values.showAdvanced)}
        >
          {values.showAdvanced ? '▼' : '▶'} Advanced Features
        </button>
      </div>

      {/* Advanced Features Section */}
      {values.showAdvanced && (
        <div className="advanced-section">
          <h4>Cap Table Modeling</h4>
          
          <div className="input-grid">
            <div className="input-group">
              <label htmlFor="founder-ownership">Pre-Round Founder Ownership</label>
              <div className="input-wrapper">
                <input
                  id="founder-ownership"
                  type="number"
                  value={values.preRoundFounderOwnership}
                  onChange={(e) => handleChange('preRoundFounderOwnership', e.target.value)}
                  step="1"
                  min="0"
                  max="100"
                />
                <span className="unit">%</span>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="pro-rata">Pro-Rata Participation</label>
              <div className="input-wrapper">
                <input
                  id="pro-rata"
                  type="number"
                  value={values.proRataPercent}
                  onChange={(e) => handleChange('proRataPercent', e.target.value)}
                  step="1"
                  min="0"
                  max="100"
                />
                <span className="unit">% of round</span>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="safe-amount">SAFE Notes Outstanding</label>
              <div className="input-wrapper">
                <span className="currency">$</span>
                <input
                  id="safe-amount"
                  type="number"
                  value={values.safeAmount}
                  onChange={(e) => handleChange('safeAmount', e.target.value)}
                  step="0.1"
                  min="0"
                />
                <span className="unit">M</span>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="safe-cap">SAFE Valuation Cap</label>
              <div className="input-wrapper">
                <span className="currency">$</span>
                <input
                  id="safe-cap"
                  type="number"
                  value={values.safeCap}
                  onChange={(e) => handleChange('safeCap', e.target.value)}
                  step="0.5"
                  min="0"
                />
                <span className="unit">M</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="validation-info">
        {(values.lsvpPortion + values.otherPortion).toFixed(2) !== values.roundSize.toFixed(2) && (
          <div className="warning">
            ⚠️ LSVP + Other ({(values.lsvpPortion + values.otherPortion).toFixed(2)}M) doesn't equal Round Size ({values.roundSize.toFixed(2)}M)
          </div>
        )}
        {values.postMoneyVal <= values.roundSize && values.postMoneyVal > 0 && (
          <div className="warning">
            ⚠️ Post-Money Valuation must be greater than Round Size for valid pre-money calculation
          </div>
        )}
        {values.postMoneyVal <= 0 && (
          <div className="warning">
            ⚠️ Post-Money Valuation must be greater than 0
          </div>
        )}
      </div>
    </div>
  )
}

export default InputForm