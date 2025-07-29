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
    // N SAFEs structure - array of SAFE objects
    safes: [],
    preRoundFounderOwnership: 0,
    // ESOP fields
    currentEsopPool: 0,
    targetEsopPool: 0,
    esopTiming: 'pre-close' // 'pre-close' or 'in-round'
  })
  
  // New state for tracking input mode
  const [inputMode, setInputMode] = useState('post-money') // 'post-money' or 'pre-money'

  useEffect(() => {
    if (company) {
      setValues({
        ...company,
        // Ensure safes array is always present
        safes: company.safes || []
      })
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

  // SAFE management functions
  const addSafe = () => {
    const newSafe = {
      id: Date.now(), // Simple ID generation
      amount: 0,
      cap: 0,
      discount: 0
    }
    const newValues = {
      ...values,
      safes: [...(values.safes || []), newSafe]
    }
    setValues(newValues)
    onUpdate(newValues)
  }

  const removeSafe = (safeId) => {
    const newValues = {
      ...values,
      safes: (values.safes || []).filter(safe => safe.id !== safeId)
    }
    setValues(newValues)
    onUpdate(newValues)
  }

  const updateSafe = (safeId, field, value) => {
    let numValue = parseFloat(value)
    
    // Handle NaN, empty strings, and invalid inputs
    if (isNaN(numValue) || value === '' || value === null || value === undefined) {
      numValue = 0
    }
    // Prevent negative values
    if (numValue < 0) numValue = 0
    // Prevent unreasonably large values
    if (numValue > 1000000) numValue = 1000000
    // Limit discount to 100%
    if (field === 'discount' && numValue > 100) numValue = 100

    const newValues = {
      ...values,
      safes: (values.safes || []).map(safe => 
        safe.id === safeId 
          ? { ...safe, [field]: numValue }
          : safe
      )
    }
    setValues(newValues)
    onUpdate(newValues)
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

            {/* ESOP Section */}
            <div className="esop-section">
              <h5>Employee Stock Option Pool (ESOP)</h5>
              
              <div className="input-grid">
                <div className="input-group">
                  <label htmlFor="current-esop">Current ESOP</label>
                  <div className={`input-wrapper ${values.currentEsopPool > 0 ? 'input-wrapper-with-clear' : ''}`}>
                    <input
                      id="current-esop"
                      type="number"
                      value={values.currentEsopPool}
                      onChange={(e) => handleChange('currentEsopPool', e.target.value)}
                      step="1"
                      min="0"
                      max="50"
                    />
                    <span className="unit">% of company</span>
                    {values.currentEsopPool > 0 && (
                      <button 
                        type="button"
                        className="clear-input-btn"
                        onClick={() => handleChange('currentEsopPool', 0)}
                        title="Clear current ESOP"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="target-esop">Target Post-Round ESOP</label>
                  <div className={`input-wrapper ${values.targetEsopPool > 0 ? 'input-wrapper-with-clear' : ''}`}>
                    <input
                      id="target-esop"
                      type="number"
                      value={values.targetEsopPool}
                      onChange={(e) => handleChange('targetEsopPool', e.target.value)}
                      step="1"
                      min="0"
                      max="50"
                    />
                    <span className="unit">% post-round</span>
                    {values.targetEsopPool > 0 && (
                      <button 
                        type="button"
                        className="clear-input-btn"
                        onClick={() => handleChange('targetEsopPool', 0)}
                        title="Clear target ESOP"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {values.targetEsopPool > 0 && (
                <div className="esop-timing">
                  <label>ESOP Expansion Timing</label>
                  <div className="radio-group">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="esop-timing"
                        value="pre-close"
                        checked={values.esopTiming === 'pre-close'}
                        onChange={(e) => handleChange('esopTiming', e.target.value)}
                      />
                      <span>Pre-close (dilutes existing investors only)</span>
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="esop-timing"
                        value="in-round"
                        checked={values.esopTiming === 'in-round'}
                        onChange={(e) => handleChange('esopTiming', e.target.value)}
                      />
                      <span>Part of round (dilutes all investors)</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* N SAFEs Section */}
            <div className="safes-section">
              <div className="safes-header">
                <h5>SAFE Notes</h5>
                <button 
                  type="button"
                  className="add-safe-btn"
                  onClick={addSafe}
                  title="Add SAFE"
                >
                  + Add SAFE
                </button>
              </div>

              {(!values.safes || values.safes.length === 0) && (
                <div className="no-safes-message">
                  No SAFE notes added. Click "Add SAFE" to get started.
                </div>
              )}

              {values.safes && values.safes.map((safe, index) => (
                <div key={safe.id} className="safe-row">
                  <div className="safe-row-header">
                    <span className="safe-label">SAFE #{index + 1}</span>
                    <button 
                      type="button"
                      className="remove-safe-btn"
                      onClick={() => removeSafe(safe.id)}
                      title="Remove SAFE"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="safe-inputs">
                    <div className="input-group">
                      <label htmlFor={`safe-amount-${safe.id}`}>Amount</label>
                      <div className="input-wrapper">
                        <span className="currency">$</span>
                        <input
                          id={`safe-amount-${safe.id}`}
                          type="number"
                          value={safe.amount}
                          onChange={(e) => updateSafe(safe.id, 'amount', e.target.value)}
                          step="0.1"
                          min="0"
                        />
                        <span className="unit">M</span>
                      </div>
                    </div>

                    <div className="input-group">
                      <label htmlFor={`safe-cap-${safe.id}`}>Valuation Cap</label>
                      <div className="input-wrapper">
                        <span className="currency">$</span>
                        <input
                          id={`safe-cap-${safe.id}`}
                          type="number"
                          value={safe.cap}
                          onChange={(e) => updateSafe(safe.id, 'cap', e.target.value)}
                          step="0.5"
                          min="0"
                          placeholder="0 = uncapped"
                        />
                        <span className="unit">M</span>
                      </div>
                    </div>

                    <div className="input-group">
                      <label htmlFor={`safe-discount-${safe.id}`}>Discount</label>
                      <div className="input-wrapper">
                        <input
                          id={`safe-discount-${safe.id}`}
                          type="number"
                          value={safe.discount}
                          onChange={(e) => updateSafe(safe.id, 'discount', e.target.value)}
                          step="1"
                          min="0"
                          max="100"
                        />
                        <span className="unit">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Individual SAFE Conversion Info */}
                  {safe.amount > 0 && (safe.cap > 0 || safe.discount > 0) && (
                    <div className="safe-conversion-info">
                      <div className="conversion-display">
                        <span className="conversion-label">Conversion Valuation:</span>
                        <span className="conversion-value">
                          {(() => {
                            if (safe.cap > 0 && safe.discount > 0) {
                              const capPrice = safe.cap
                              const discountPrice = safePreMoneyVal * (1 - safe.discount / 100)
                              return capPrice < discountPrice 
                                ? `$${capPrice.toFixed(1)}M`
                                : `$${discountPrice.toFixed(1)}M`
                            } else if (safe.cap > 0) {
                              return `$${Math.min(safe.cap, safePreMoneyVal).toFixed(1)}M`
                            } else if (safe.discount > 0) {
                              return `$${(safePreMoneyVal * (1 - safe.discount / 100)).toFixed(1)}M`
                            }
                            return '$0.0M'
                          })()}
                        </span>
                        <span className="conversion-note">
                          {(() => {
                            if (safe.cap > 0 && safe.discount > 0) {
                              const capPrice = safe.cap
                              const discountPrice = safePreMoneyVal * (1 - safe.discount / 100)
                              return capPrice < discountPrice 
                                ? `(Using cap vs ${safe.discount}% discount)`
                                : `(Using discount vs $${capPrice.toFixed(1)}M cap)`
                            } else if (safe.cap > 0) {
                              return `(Cap: $${safe.cap.toFixed(1)}M)`  
                            } else if (safe.discount > 0) {
                              return `(${safe.discount}% discount)`
                            }
                            return ''
                          })()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
        {!isNaN(values.safeDiscount) && values.safeDiscount > 100 && (
          <div className="warning">
            ⚠️ SAFE discount cannot exceed 100%
          </div>
        )}
        {!isNaN(values.safeAmount) && !isNaN(values.safeCap) && !isNaN(values.safeDiscount) && values.safeAmount > 0 && values.safeCap === 0 && values.safeDiscount === 0 && (
          <div className="warning">
            ⚠️ SAFE must have either a valuation cap or discount (or both)
          </div>
        )}
      </div>
    </div>
  )
}

export default InputForm