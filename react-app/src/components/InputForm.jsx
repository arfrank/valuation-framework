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
    let numValue = field === 'investorName' || field === 'showAdvanced' || field === 'twoStepEnabled' || field === 'esopTiming' ? value : parseFloat(value)

    // Input validation for numeric fields
    if (field !== 'investorName' && field !== 'showAdvanced' && field !== 'twoStepEnabled' && field !== 'esopTiming') {
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
    
    // Auto-calculate step 2 other portion
    if (field === 'step2Amount' || field === 'step2InvestorPortion') {
      if (field === 'step2Amount') {
        newValues.step2OtherPortion = Math.round(Math.max(0, numValue - (values.step2InvestorPortion || 0)) * 100) / 100
      } else if (field === 'step2InvestorPortion') {
        newValues.step2OtherPortion = Math.round(Math.max(0, (values.step2Amount || 0) - numValue) * 100) / 100
      }
    }
    if (field === 'step2OtherPortion') {
      const clampedOther = Math.min(numValue, values.step2Amount || 0)
      newValues.step2OtherPortion = Math.round(Math.max(0, clampedOther) * 100) / 100
      newValues.step2InvestorPortion = Math.round(Math.max(0, (values.step2Amount || 0) - newValues.step2OtherPortion) * 100) / 100
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
      discount: 0,
      investorName: '',
      proRata: false,
      proRataOverride: null
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
    // Handle string fields (investorName)
    if (field === 'investorName') {
      const newValues = {
        ...values,
        safes: (values.safes || []).map(safe =>
          safe.id === safeId
            ? { ...safe, investorName: value }
            : safe
        )
      }
      setValues(newValues)
      onUpdate(newValues)
      return
    }

    // Handle pro-rata toggle (boolean). Clear override when disabling.
    if (field === 'proRata') {
      const newValues = {
        ...values,
        safes: (values.safes || []).map(safe =>
          safe.id === safeId
            ? { ...safe, proRata: Boolean(value), proRataOverride: value ? safe.proRataOverride : null }
            : safe
        )
      }
      setValues(newValues)
      onUpdate(newValues)
      return
    }

    // Handle pro-rata override (nullable number). Null = use calculated amount.
    if (field === 'proRataOverride') {
      const parsed = parseFloat(value)
      const next = (isNaN(parsed) || value === '' || value === null || value === undefined)
        ? null
        : Math.max(0, parsed)
      const newValues = {
        ...values,
        safes: (values.safes || []).map(safe =>
          safe.id === safeId
            ? { ...safe, proRataOverride: next }
            : safe
        )
      }
      setValues(newValues)
      onUpdate(newValues)
      return
    }

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

          <div className="advanced-split">
            {/* 2-Step Round */}
            <div className="two-step-section">
              <div className="two-step-header">
                <h5>2-Step Round</h5>
                <label className="two-step-checkbox">
                  <input
                    type="checkbox"
                    checked={values.twoStepEnabled || false}
                    onChange={(e) => handleChange('twoStepEnabled', e.target.checked)}
                  />
                  <span className="two-step-label">Enable</span>
                </label>
              </div>

              {values.twoStepEnabled && (
                <div className="step2-card">
                  <div className="step2-card-header">
                    <span className="step-label">Step 2</span>
                    <span className="step-note">Step 1 uses main inputs above</span>
                  </div>
                  {values.step2PostMoney > 0 && values.step2PostMoney <= values.postMoneyVal && (
                    <div className="warning">
                      V2 (${values.step2PostMoney}M) should be greater than V1 (${values.postMoneyVal}M)
                    </div>
                  )}
                  <div className="input-grid step2-input-grid">
                    <FormInput
                      label="Post-Money Valuation"
                      type="number"
                      value={values.step2PostMoney || 0}
                      onChange={(value) => handleChange('step2PostMoney', value)}
                      prefix="$"
                      suffix="M"
                      step="0.1"
                      min="0"
                    />

                    <FormInput
                      label="Amount"
                      type="number"
                      value={values.step2Amount || 0}
                      onChange={(value) => handleChange('step2Amount', value)}
                      prefix="$"
                      suffix="M"
                      step="0.1"
                      min="0"
                    />

                    <FormInput
                      label={`${values.investorName || 'US'} Portion`}
                      type="number"
                      value={values.step2InvestorPortion || 0}
                      onChange={(value) => handleChange('step2InvestorPortion', value)}
                      prefix="$"
                      suffix="M"
                      step="0.01"
                      min="0"
                      max={values.step2Amount || 0}
                    />

                    <FormInput
                      label="Other Portion"
                      type="number"
                      value={values.step2OtherPortion || 0}
                      onChange={(value) => handleChange('step2OtherPortion', value)}
                      prefix="$"
                      suffix="M"
                      step="0.01"
                      min="0"
                      max={values.step2Amount || 0}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="esop-section">
              <h5>Employee Stock Option Pool (ESOP)</h5>
              <p className="esop-subtitle">
                Total pool = Granted + Available. VCs typically negotiate the <em>available</em> slice post-close.
              </p>

              <div className="input-grid esop-input-grid">
                <FormInput
                  label="Current Pool"
                  type="number"
                  value={values.currentEsopPercent || ''}
                  onChange={(value) => handleChange('currentEsopPercent', value)}
                  suffix="%"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0"
                  clearable={true}
                  tooltip="Total ESOP pool today, including both granted and unallocated shares (as a % of fully-diluted shares)."
                />

                <FormInput
                  label="Already Granted"
                  type="number"
                  value={values.grantedEsopPercent || ''}
                  onChange={(value) => handleChange('grantedEsopPercent', value)}
                  suffix="%"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0"
                  clearable={true}
                  tooltip="Portion of the current pool that has already been issued to employees. The rest is the unallocated pool VCs negotiate over."
                />

                <FormInput
                  label="Target Available"
                  type="number"
                  value={values.targetEsopPercent || ''}
                  onChange={(value) => handleChange('targetEsopPercent', value)}
                  suffix="%"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0"
                  clearable={true}
                  tooltip="Desired unallocated pool post-round (as a % of post-money fully-diluted). Set to 0 to skip any top-up."
                />
              </div>

              {Number(values.grantedEsopPercent || 0) > Number(values.currentEsopPercent || 0) && (
                <div className="esop-validation-error">
                  Already granted ({Number(values.grantedEsopPercent).toFixed(2)}%) exceeds current pool ({Number(values.currentEsopPercent).toFixed(2)}%).
                </div>
              )}

              {values.targetEsopPercent > 0 && (
                <div className="esop-timing-section">
                  <label className="section-label">Top-up timing</label>
                  <div className="esop-timing-toggle" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={values.esopTiming === 'pre-close'}
                      className={`esop-timing-option ${values.esopTiming === 'pre-close' ? 'active' : ''}`}
                      onClick={() => handleChange('esopTiming', 'pre-close')}
                    >
                      Pre-Close
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={values.esopTiming === 'post-close'}
                      className={`esop-timing-option ${values.esopTiming === 'post-close' ? 'active' : ''}`}
                      onClick={() => handleChange('esopTiming', 'post-close')}
                    >
                      Post-Close
                    </button>
                  </div>

                  <p className="esop-timing-explanation">
                    {values.esopTiming === 'pre-close'
                      ? 'Top-up happens before the round. Dilutes founders, prior investors, and granted ESOP — not new investors.'
                      : 'Top-up happens after the round. Dilutes everyone proportionally, including new investors.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="safes-section">
            <div className="section-title-row">
              <h5 className="section-label">SAFE Notes</h5>
              <div className="section-header-actions">
                <button
                  type="button"
                  className="add-safe-btn"
                  onClick={addSafe}
                  title="Add SAFE"
                >
                  + Add SAFE
                </button>
              </div>
            </div>

            {(!values.safes || values.safes.length === 0) ? (
              <div className="no-safes-message">
                No SAFE notes added. Click "Add SAFE" to get started.
              </div>
            ) : (
              <div className="repeater-table repeater-table--safes">
                <div className="repeater-header">
                  <span className="repeater-col repeater-col--name">Investor</span>
                  <span className="repeater-col repeater-col--amount">Amount</span>
                  <span className="repeater-col repeater-col--cap">Cap</span>
                  <span className="repeater-col repeater-col--discount">Discount</span>
                  <span className="repeater-col repeater-col--prorata">Pro-rata</span>
                  <span className="repeater-col repeater-col--alloc">Allocation</span>
                  <span className="repeater-col repeater-col--actions" aria-hidden="true" />
                </div>
                {values.safes.map((safe) => {
                  // Conversion valuation for the caption under the row
                  const conversionInfo = (() => {
                    if (!(safe.amount > 0 && (safe.cap > 0 || safe.discount > 0))) return null
                    let val, note
                    if (safe.cap > 0 && safe.discount > 0) {
                      const capPrice = safe.cap
                      const discountPrice = safePreMoneyVal * (1 - safe.discount / 100)
                      if (capPrice < discountPrice) {
                        val = capPrice
                        note = `cap vs ${safe.discount}% discount`
                      } else {
                        val = discountPrice
                        note = `discount vs $${capPrice.toFixed(1)}M cap`
                      }
                    } else if (safe.cap > 0) {
                      val = Math.min(safe.cap, safePreMoneyVal)
                      note = `cap $${safe.cap.toFixed(1)}M`
                    } else {
                      val = safePreMoneyVal * (1 - safe.discount / 100)
                      note = `${safe.discount}% discount`
                    }
                    return `Converts at $${val.toFixed(1)}M (${note})`
                  })()

                  // Pro-rata allocation calculation
                  let proRataBlock = null
                  if (safe.proRata && safe.amount > 0 && values.roundSize > 0) {
                    let conversionPrice = 0
                    if (safe.cap > 0 && safe.discount > 0) {
                      conversionPrice = Math.min(safe.cap, safePreMoneyVal * (1 - safe.discount / 100))
                    } else if (safe.cap > 0) {
                      conversionPrice = Math.min(safe.cap, safePreMoneyVal)
                    } else if (safe.discount > 0) {
                      conversionPrice = safePreMoneyVal * (1 - safe.discount / 100)
                    } else {
                      conversionPrice = safePreMoneyVal
                    }
                    if (conversionPrice > 0) {
                      const safeOwnership = (safe.amount / conversionPrice) * 100
                      const calculatedProRata = (safeOwnership / 100) * values.roundSize
                      const hasOverride = safe.proRataOverride != null
                      const displayAmount = hasOverride ? safe.proRataOverride : calculatedProRata
                      const matchesLead = (safe.investorName || '').trim() === (values.investorName || 'US').trim()
                      proRataBlock = { calculatedProRata, hasOverride, displayAmount, matchesLead: matchesLead && !!safe.investorName }
                    }
                  }

                  return (
                    <div key={safe.id} className="repeater-row repeater-row--safe">
                      <div className="repeater-col repeater-col--name">
                        <FormInput
                          label="Investor"
                          type="text"
                          value={safe.investorName || ''}
                          onChange={(value) => updateSafe(safe.id, 'investorName', value)}
                          placeholder="Optional"
                          id={`safe-investor-${safe.id}`}
                          compact
                        />
                      </div>
                      <div className="repeater-col repeater-col--amount">
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
                          compact
                        />
                      </div>
                      <div className="repeater-col repeater-col--cap">
                        <FormInput
                          label="Cap"
                          type="number"
                          value={safe.cap}
                          onChange={(value) => updateSafe(safe.id, 'cap', value)}
                          prefix="$"
                          suffix="M"
                          step="0.5"
                          min="0"
                          placeholder="0 = uncapped"
                          id={`safe-cap-${safe.id}`}
                          compact
                        />
                      </div>
                      <div className="repeater-col repeater-col--discount">
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
                          compact
                        />
                      </div>
                      <div className="repeater-col repeater-col--prorata">
                        <label className="repeater-checkbox" title="Pro-rata rights">
                          <input
                            type="checkbox"
                            checked={Boolean(safe.proRata)}
                            onChange={(e) => updateSafe(safe.id, 'proRata', e.target.checked)}
                          />
                        </label>
                      </div>
                      <div className="repeater-col repeater-col--alloc">
                        {proRataBlock && !proRataBlock.matchesLead ? (
                          <FormInput
                            label="Allocation"
                            type="number"
                            value={proRataBlock.displayAmount}
                            onChange={(value) => updateSafe(safe.id, 'proRataOverride', value)}
                            prefix="$"
                            suffix="M"
                            step="0.01"
                            min="0"
                            compact
                          />
                        ) : (
                          <span
                            className="repeater-alloc-placeholder"
                            title={proRataBlock?.matchesLead ? `Handled via ${values.investorName || 'US'} round portion` : 'Enable pro-rata to set allocation'}
                          >
                            {proRataBlock?.matchesLead ? 'via lead' : '—'}
                          </span>
                        )}
                      </div>
                      <div className="repeater-col repeater-col--actions">
                        {proRataBlock?.hasOverride && !proRataBlock.matchesLead && (
                          <button
                            type="button"
                            className="reset-pro-rata-btn"
                            onClick={() => updateSafe(safe.id, 'proRataOverride', null)}
                            title={`Reset to calculated ($${parseFloat(proRataBlock.calculatedProRata.toPrecision(10))}M)`}
                          >
                            ↺
                          </button>
                        )}
                        <button
                          type="button"
                          className="remove-safe-btn"
                          onClick={() => removeSafe(safe.id)}
                          title="Remove SAFE"
                        >
                          ×
                        </button>
                      </div>
                      {conversionInfo && (
                        <div className="repeater-row-caption">{conversionInfo}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
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