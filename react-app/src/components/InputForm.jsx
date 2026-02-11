import { useState, useEffect } from 'react'
import PriorInvestorsSection from './PriorInvestorsSection'
import FoundersSection from './FoundersSection'
import FormInput from './FormInput'
import { migrateLegacyCompany } from '../utils/dataStructures'

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
    // ESOP (Employee Stock Option Pool) modeling
    currentEsopPercent: 0,
    targetEsopPercent: 0,
    esopTiming: 'pre-close' // 'pre-close' or 'post-close'
  })
  
  // New state for tracking input mode
  const [inputMode, setInputMode] = useState('post-money') // 'post-money' or 'pre-money'

  useEffect(() => {
    if (company) {
      // Migrate legacy company data to new multi-party structure
      const migratedCompany = migrateLegacyCompany(company)
      setValues({
        ...migratedCompany,
        // Ensure safes array is always present
        safes: migratedCompany.safes || [],
        // Ensure multi-party arrays are present
        priorInvestors: migratedCompany.priorInvestors || [],
        founders: migratedCompany.founders || []
      })
    }
  }, [company])

  const handleChange = (field, value) => {
    let numValue = field === 'investorName' || field === 'showAdvanced' || field === 'esopTiming' ? value : parseFloat(value)
    
    // Input validation for numeric fields
    if (field !== 'investorName' && field !== 'showAdvanced' && field !== 'esopTiming') {
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

    // When other portion is edited directly, sync investor portion
    if (field === 'otherPortion') {
      // Clamp to round size
      const clampedOther = Math.min(numValue, values.roundSize)
      newValues.otherPortion = Math.round(Math.max(0, clampedOther) * 100) / 100
      newValues.investorPortion = Math.round(Math.max(0, values.roundSize - newValues.otherPortion) * 100) / 100
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

  // Multi-party handlers
  const handlePriorInvestorsUpdate = (updatedPriorInvestors) => {
    const newValues = {
      ...values,
      priorInvestors: updatedPriorInvestors
    }
    setValues(newValues)
    onUpdate(newValues)
  }

  const handleFoundersUpdate = (updatedFounders) => {
    const newValues = {
      ...values,
      founders: updatedFounders
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
        <FormInput
          label={inputMode === 'post-money' ? 'Post-Money Valuation' : 'Pre-Money Valuation'}
          type="number"
          value={inputMode === 'post-money' ? (isNaN(values.postMoneyVal) ? 0 : values.postMoneyVal) : safePreMoneyVal}
          onChange={(value) => handleChange(inputMode === 'post-money' ? 'postMoneyVal' : 'preMoneyVal', value)}
          prefix="$"
          suffix="M"
          step="0.1"
          min="0"
        />

        <FormInput
          label="Round Size"
          type="number"
          value={values.roundSize}
          onChange={(value) => handleChange('roundSize', value)}
          prefix="$"
          suffix="M"
          step="0.1"
          min="0"
        />

        <FormInput
          label={`${values.investorName || 'US'} Portion`}
          type="number"
          value={values.investorPortion}
          onChange={(value) => handleChange('investorPortion', value)}
          prefix="$"
          suffix="M"
          step="0.01"
          min="0"
          max={values.roundSize}
        />

        <FormInput
          label="Other Portion"
          type="number"
          value={values.otherPortion}
          onChange={(value) => handleChange('otherPortion', value)}
          prefix="$"
          suffix="M"
          step="0.01"
          min="0"
          max={values.roundSize}
        />
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
                  <FormInput
                    label="Amount"
                    type="number"
                    value={safe.amount}
                    onChange={(value) => updateSafe(safe.id, 'amount', value)}
                    prefix="$"
                    suffix="M"
                    step="0.1"
                    min="0"
                    id={`safe-amount-${safe.id}`}
                  />

                  <FormInput
                    label="Valuation"
                    type="number"
                    value={safe.cap}
                    onChange={(value) => updateSafe(safe.id, 'cap', value)}
                    prefix="$"
                    suffix="M"
                    step="0.5"
                    min="0"
                    placeholder="0 = uncapped"
                    id={`safe-cap-${safe.id}`}
                  />

                  <FormInput
                    label="Discount"
                    type="number"
                    value={safe.discount}
                    onChange={(value) => updateSafe(safe.id, 'discount', value)}
                    suffix="%"
                    step="1"
                    min="0"
                    max="100"
                    id={`safe-discount-${safe.id}`}
                  />
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

          <PriorInvestorsSection
            priorInvestors={values.priorInvestors || []}
            onUpdate={handlePriorInvestorsUpdate}
            roundSize={values.roundSize}
            investorName={values.investorName || 'US'}
          />

          <FoundersSection 
            founders={values.founders || []}
            onUpdate={handleFoundersUpdate}
          />

          <div className="esop-section">
            <h5>Employee Stock Option Pool (ESOP)</h5>
            
            <div className="input-grid">
              <FormInput
                label="Current ESOP"
                type="number"
                value={values.currentEsopPercent}
                onChange={(value) => handleChange('currentEsopPercent', value)}
                suffix="%"
                step="0.01"
                min="0"
                max="100"
                clearable={true}
              />

              <FormInput
                label="Target ESOP"
                type="number"
                value={values.targetEsopPercent}
                onChange={(value) => handleChange('targetEsopPercent', value)}
                suffix="%"
                step="0.01"
                min="0"
                max="100"
                clearable={true}
              />
            </div>

            {/* ESOP Timing Selection */}
            {values.targetEsopPercent > 0 && values.currentEsopPercent >= 0 && (
              <div className="esop-timing-section">
                <label className="section-label">ESOP Pool Timing</label>
                <div className="esop-timing-options">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="esop-timing"
                      value="pre-close"
                      checked={values.esopTiming === 'pre-close'}
                      onChange={(e) => handleChange('esopTiming', e.target.value)}
                    />
                    <span className="radio-label">
                      <strong>Pre-Close</strong> - Dilutes existing shareholders only
                    </span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="esop-timing"
                      value="post-close"
                      checked={values.esopTiming === 'post-close'}
                      onChange={(e) => handleChange('esopTiming', e.target.value)}
                    />
                    <span className="radio-label">
                      <strong>Post-Close</strong> - Dilutes all shareholders including new investors
                    </span>
                  </label>
                </div>
                
                {/* Info about the difference */}
                <div className="esop-timing-info">
                  {values.esopTiming === 'pre-close' ? (
                    <p className="timing-explanation">
                      💡 ESOP shares are allocated before the investment. This affects only existing shareholders 
                      (founders, employees, previous investors) and uses iterative dilution calculations.
                    </p>
                  ) : (
                    <p className="timing-explanation">
                      💡 ESOP shares are allocated after the investment. All shareholders including 
                      the new investors share the dilution proportionally.
                    </p>
                  )}
                </div>
              </div>
            )}
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
      </div>
    </div>
  )
}

export default InputForm