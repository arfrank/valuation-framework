import { useState, useEffect } from 'react'

const InputForm = ({ company, onUpdate }) => {
  const [values, setValues] = useState({
    postMoneyVal: 13,
    roundSize: 3,
    investorPortion: 2.75,
    otherPortion: 0.25,
    investorName: 'US',
    // Advanced features
    showAdvanced: false,
    proRataPercent: 0,
    safeAmount: 0,
    safeCap: 0,
    preRoundFounderOwnership: 0
  })
  
  // New state for tracking input mode
  const [inputMode, setInputMode] = useState('post-money') // 'post-money' or 'pre-money'

  useEffect(() => {
    if (company) {
      setValues(company)
    }
  }, [company])

  const handleChange = (field, value) => {
    let numValue = field === 'investorName' || field === 'showAdvanced' ? value : parseFloat(value)
    
    // Input validation for numeric fields
    if (field !== 'investorName' && field !== 'showAdvanced') {
      // Handle NaN, empty strings, and invalid inputs
      if (isNaN(numValue) || value === '' || value === null || value === undefined) {
        numValue = 0
      }
      // Prevent negative values
      if (numValue < 0) numValue = 0
      // Prevent unreasonably large values (> 1 trillion)
      if (numValue > 1000000) numValue = 1000000
    }
    
    const newValues = { ...values, [field]: numValue }
    
    // Handle pre-money input mode
    if (field === 'preMoneyVal' && inputMode === 'pre-money') {
      // Calculate post-money when pre-money changes
      newValues.postMoneyVal = Math.round((numValue + values.roundSize) * 100) / 100
    }
    
    // Handle post-money changes that affect pre-money calculations
    if ((field === 'postMoneyVal' || field === 'roundSize') && inputMode === 'post-money') {
      // No additional calculation needed - pre-money is calculated in render
    }
    
    // Auto-calculate other portion when round size or investor portion changes
    if (field === 'roundSize' || field === 'investorPortion') {
      if (field === 'roundSize') {
        newValues.otherPortion = Math.round(Math.max(0, numValue - values.investorPortion) * 100) / 100
        // Update post-money if in pre-money mode
        if (inputMode === 'pre-money') {
          const currentPreMoney = values.postMoneyVal - values.roundSize
          newValues.postMoneyVal = Math.round((currentPreMoney + numValue) * 100) / 100
        }
      } else if (field === 'investorPortion') {
        newValues.otherPortion = Math.round(Math.max(0, values.roundSize - numValue) * 100) / 100
      }
    }
    
    // SAFE validation: cap should be >= amount if both are set
    if (field === 'safeCap' && numValue > 0 && values.safeAmount > 0 && numValue < values.safeAmount) {
      newValues.safeCap = values.safeAmount  // Set cap to at least the amount
    }
    if (field === 'safeAmount' && numValue > 0 && values.safeCap > 0 && numValue > values.safeCap) {
      newValues.safeAmount = values.safeCap  // Limit amount to the cap
    }
    
    setValues(newValues)
    onUpdate(newValues)
  }

  const preMoneyVal = Math.round((values.postMoneyVal - values.roundSize) * 100) / 100
  const safePreMoneyVal = isNaN(preMoneyVal) ? 0 : preMoneyVal
  
  const handleToggleInputMode = () => {
    setInputMode(inputMode === 'post-money' ? 'pre-money' : 'post-money')
  }

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
          <div className="calculated-money-toggle" onClick={handleToggleInputMode}>
            {inputMode === 'post-money' ? (
              <>Pre-Money: <span className="value">${safePreMoneyVal.toFixed(1)}M</span></>
            ) : (
              <>Post-Money: <span className="value">${(isNaN(values.postMoneyVal) ? 0 : values.postMoneyVal).toFixed(1)}M</span></>
            )}
            <span className="toggle-hint">⇄</span>
          </div>
        </div>
      </div>

      <div className="input-grid">
        <div className="input-group">
          <label htmlFor="valuation-input">
            {inputMode === 'post-money' ? 'Post-Money Valuation' : 'Pre-Money Valuation'}
          </label>
          <div className="input-wrapper">
            <span className="currency">$</span>
            <input
              id="valuation-input"
              type="number"
              value={inputMode === 'post-money' ? (isNaN(values.postMoneyVal) ? 0 : values.postMoneyVal) : safePreMoneyVal}
              onChange={(e) => handleChange(inputMode === 'post-money' ? 'postMoneyVal' : 'preMoneyVal', e.target.value)}
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
          <label htmlFor="investor-portion">{values.investorName || 'US'} Portion</label>
          <div className="input-wrapper">
            <span className="currency">$</span>
            <input
              id="investor-portion"
              type="number"
              value={values.investorPortion}
              onChange={(e) => handleChange('investorPortion', e.target.value)}
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
              <div className={`input-wrapper ${values.preRoundFounderOwnership > 0 ? 'input-wrapper-with-clear' : ''}`}>
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
                {values.preRoundFounderOwnership > 0 && (
                  <button 
                    type="button"
                    className="clear-input-btn"
                    onClick={() => handleChange('preRoundFounderOwnership', 0)}
                    title="Clear founder ownership"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="pro-rata">Pro-Rata Participation</label>
              <div className={`input-wrapper ${values.proRataPercent > 0 ? 'input-wrapper-with-clear' : ''}`}>
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
                {values.proRataPercent > 0 && (
                  <button 
                    type="button"
                    className="clear-input-btn"
                    onClick={() => handleChange('proRataPercent', 0)}
                    title="Clear pro-rata"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="safe-amount">SAFE Notes Outstanding</label>
              <div className={`input-wrapper ${values.safeAmount > 0 ? 'input-wrapper-with-clear' : ''}`}>
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
                {values.safeAmount > 0 && (
                  <button 
                    type="button"
                    className="clear-input-btn"
                    onClick={() => handleChange('safeAmount', 0)}
                    title="Clear SAFE amount"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="safe-cap">SAFE Valuation Cap</label>
              <div className={`input-wrapper ${values.safeCap > 0 ? 'input-wrapper-with-clear' : ''}`}>
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
                {values.safeCap > 0 && (
                  <button 
                    type="button"
                    className="clear-input-btn"
                    onClick={() => handleChange('safeCap', 0)}
                    title="Clear SAFE cap"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="validation-info">
        {!isNaN(values.investorPortion) && !isNaN(values.otherPortion) && !isNaN(values.roundSize) && 
         (values.investorPortion + values.otherPortion).toFixed(2) !== values.roundSize.toFixed(2) && (
          <div className="warning">
            ⚠️ {values.investorName || 'Investor'} + Other ({(values.investorPortion + values.otherPortion).toFixed(2)}M) doesn't equal Round Size ({values.roundSize.toFixed(2)}M)
          </div>
        )}
        {!isNaN(values.postMoneyVal) && !isNaN(values.roundSize) && values.postMoneyVal <= values.roundSize && values.postMoneyVal > 0 && (
          <div className="warning">
            ⚠️ Post-Money Valuation must be greater than Round Size for valid pre-money calculation
          </div>
        )}
        {!isNaN(values.postMoneyVal) && values.postMoneyVal <= 0 && (
          <div className="warning">
            ⚠️ Post-Money Valuation must be greater than 0
          </div>
        )}
        {!isNaN(values.safeAmount) && !isNaN(values.safeCap) && values.safeAmount > 0 && values.safeCap > 0 && values.safeAmount > values.safeCap && (
          <div className="warning">
            ⚠️ SAFE amount cannot exceed valuation cap
          </div>
        )}
      </div>
    </div>
  )
}

export default InputForm