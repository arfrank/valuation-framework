import { useState, useEffect, useRef } from 'react'
import PriorInvestorsSection from './PriorInvestorsSection'
import FoundersSection from './FoundersSection'
import FormInput from './FormInput'
import { migrateLegacyCompany } from '../utils/dataStructures'
import { resolveSafeConversion } from '../utils/multiPartyCalculations'

const InputForm = ({ company, onUpdate, collapsed = false, onToggleCollapsed, highlightToken = 0 }) => {
  const roundToCents = (value) => Math.round(Math.max(0, value) * 100) / 100
  const focusTimerRef = useRef(null)
  const [values, setValues] = useState({
    postMoneyVal: 13,
    roundSize: 3,
    investorPortion: 2.75,
    otherPortion: 0.25,
    investorName: 'US',
    roundInstrument: 'priced',
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
  const moneySwapTimerRef = useRef(null)
  const [pulseField, setPulseField] = useState(null)
  const [formHighlight, setFormHighlight] = useState(false)
  const [moneyToggleSwapping, setMoneyToggleSwapping] = useState(false)
  const [pendingFocusId, setPendingFocusId] = useState(null)
  const [recentRowKey, setRecentRowKey] = useState(null)
  const [removingRows, setRemovingRows] = useState({})
  const [undoNotice, setUndoNotice] = useState(null)

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

  useEffect(() => {
    if (!highlightToken) return undefined
    setFormHighlight(true)
    const id = setTimeout(() => setFormHighlight(false), 850)
    return () => clearTimeout(id)
  }, [highlightToken])

  useEffect(() => {
    if (!pendingFocusId) return undefined
    focusTimerRef.current = setTimeout(() => {
      const el = document.getElementById(pendingFocusId)
      if (el && typeof el.focus === 'function') {
        el.focus()
        if (typeof el.select === 'function') el.select()
      }
      setPendingFocusId(null)
    }, 60)
    return () => clearTimeout(focusTimerRef.current)
  }, [pendingFocusId, values.safes, values.warrants, inputMode])

  useEffect(() => () => {
    if (moneySwapTimerRef.current) clearTimeout(moneySwapTimerRef.current)
  }, [])

  const pulseComputedField = (field) => {
    setPulseField(field)
    setTimeout(() => {
      setPulseField((current) => (current === field ? null : current))
    }, 650)
  }

  const markRecentRow = (key) => {
    setRecentRowKey(key)
    setTimeout(() => {
      setRecentRowKey((current) => (current === key ? null : current))
    }, 850)
  }

  const markRemovingRow = (key) => {
    setRemovingRows(prev => ({ ...prev, [key]: true }))
    setTimeout(() => {
      setRemovingRows(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }, 260)
  }

  const showRowUndo = (label, onUndo) => {
    const notice = { id: Date.now(), label, onUndo }
    setUndoNotice(notice)
    setTimeout(() => {
      setUndoNotice((current) => (current?.id === notice.id ? null : current))
    }, 4200)
  }

  const handleChange = (field, value) => {
    let numValue = field === 'investorName' || field === 'roundInstrument' || field === 'showAdvanced' || field === 'twoStepEnabled' || field === 'esopTiming' ? value : parseFloat(value)

    // Input validation for numeric fields
    if (field !== 'investorName' && field !== 'roundInstrument' && field !== 'showAdvanced' && field !== 'twoStepEnabled' && field !== 'esopTiming') {
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
      pulseComputedField('postMoneyVal')
    }
    
    // Handle post-money changes that affect pre-money calculations
    if ((field === 'postMoneyVal' || field === 'roundSize') && inputMode === 'post-money') {
      // No additional calculation needed - pre-money is calculated in render
    }
    
    // Auto-calculate step 2 other portion
    if (field === 'step2Amount' || field === 'step2InvestorPortion') {
      if (field === 'step2Amount') {
        const clampedInvestor = Math.min(values.step2InvestorPortion || 0, numValue)
        newValues.step2InvestorPortion = roundToCents(clampedInvestor)
        newValues.step2OtherPortion = roundToCents(numValue - clampedInvestor)
        pulseComputedField('step2OtherPortion')
      } else if (field === 'step2InvestorPortion') {
        const clampedInvestor = Math.min(numValue, values.step2Amount || 0)
        newValues.step2InvestorPortion = roundToCents(clampedInvestor)
        newValues.step2OtherPortion = roundToCents((values.step2Amount || 0) - clampedInvestor)
        pulseComputedField('step2OtherPortion')
      }
    }
    if (field === 'step2OtherPortion') {
      const clampedOther = Math.min(numValue, values.step2Amount || 0)
      newValues.step2OtherPortion = roundToCents(clampedOther)
      newValues.step2InvestorPortion = roundToCents((values.step2Amount || 0) - newValues.step2OtherPortion)
      pulseComputedField('step2InvestorPortion')
    }

    // Auto-calculate other portion when round size or investor portion changes
    if (field === 'roundSize' || field === 'investorPortion') {
      if (field === 'roundSize') {
        const clampedInvestor = Math.min(values.investorPortion || 0, numValue)
        newValues.investorPortion = roundToCents(clampedInvestor)
        newValues.otherPortion = roundToCents(numValue - clampedInvestor)
        pulseComputedField('otherPortion')
        if (clampedInvestor !== (values.investorPortion || 0)) pulseComputedField('investorPortion')
        // Update post-money if in pre-money mode
        if (inputMode === 'pre-money') {
          const currentPreMoney = values.postMoneyVal - values.roundSize
          newValues.postMoneyVal = roundToCents(currentPreMoney + numValue)
          pulseComputedField('postMoneyVal')
        }
      } else if (field === 'investorPortion') {
        const clampedInvestor = Math.min(numValue, values.roundSize || 0)
        newValues.investorPortion = roundToCents(clampedInvestor)
        newValues.otherPortion = roundToCents((values.roundSize || 0) - clampedInvestor)
        pulseComputedField('otherPortion')
      }
    }

    // When other portion is edited directly, sync investor portion
    if (field === 'otherPortion') {
      // Clamp to round size
      const clampedOther = Math.min(numValue, values.roundSize)
      newValues.otherPortion = roundToCents(clampedOther)
      newValues.investorPortion = roundToCents((values.roundSize || 0) - newValues.otherPortion)
      pulseComputedField('investorPortion')
    }
    
    
    setValues(newValues)
    onUpdate(newValues)
  }

  const preMoneyVal = Math.round((values.postMoneyVal - values.roundSize) * 100) / 100
  const safePreMoneyVal = isNaN(preMoneyVal) ? 0 : preMoneyVal
  const safeRows = values.safes || []
  const isSafeRound = values.roundInstrument === 'safe'
  const safeSummary = safeRows.reduce((summary, safe) => {
    const amount = Number(safe.amount) || 0
    summary.totalAmount += amount
    if (safe.proRata) summary.proRataCount += 1
    if (safe.conversionType === 'fixed-percent') summary.fixedCount += 1
    if (safe.conversionType === 'mfn') summary.mfnCount += 1
    if ((safe.notes || '').trim()) summary.noteCount += 1
    return summary
  }, { totalAmount: 0, proRataCount: 0, fixedCount: 0, mfnCount: 0, noteCount: 0 })
  const importWarnings = Array.isArray(values.importWarnings) ? values.importWarnings : []

  const formatSafeAmount = (amount) => {
    const value = Number(amount) || 0
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: value < 1 ? 3 : 2, maximumFractionDigits: 3 })}M`
  }

  const getSafeTermLabel = (safe) => {
    const conversionType = safe.conversionType || 'cap-discount'
    if (conversionType === 'fixed-percent') {
      return `Fixed ${(Number(safe.fixedOwnershipPercent) || 0).toFixed(2)}%`
    }
    if (conversionType === 'round-price') return 'Round price'

    const cap = Number(safe.cap) || 0
    const discount = Number(safe.discount) || 0
    const pieces = []
    if (cap > 0) pieces.push(`$${cap.toFixed(cap < 10 ? 1 : 0)}M cap`)
    if (discount > 0) pieces.push(`${discount}% discount`)
    const fallback = pieces.length > 0 ? pieces.join(' + ') : 'Round price'
    return conversionType === 'mfn' ? `MFN - ${fallback}` : fallback
  }
  
  const handleToggleInputMode = () => {
    setMoneyToggleSwapping(true)
    setInputMode(inputMode === 'post-money' ? 'pre-money' : 'post-money')
    setPendingFocusId('core-valuation-input')
    if (moneySwapTimerRef.current) clearTimeout(moneySwapTimerRef.current)
    moneySwapTimerRef.current = setTimeout(() => setMoneyToggleSwapping(false), 380)
  }

  // SAFE management functions
  const addSafe = () => {
    const id = Date.now()
    const newSafe = {
      id, // Simple ID generation
      amount: 0,
      conversionType: 'cap-discount',
      fixedOwnershipPercent: 0,
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
    markRecentRow(`safe-${id}`)
    setPendingFocusId(`safe-investor-${id}`)
  }

  const removeSafe = (safeId) => {
    const removed = (values.safes || []).find(safe => safe.id === safeId)
    if (!removed) return
    const originalIndex = (values.safes || []).findIndex(safe => safe.id === safeId)
    markRemovingRow(`safe-${safeId}`)
    setTimeout(() => {
      setValues(prev => {
        const nextSafes = (prev.safes || []).filter(safe => safe.id !== safeId)
        const nextValues = { ...prev, safes: nextSafes }
        onUpdate(nextValues)
        return nextValues
      })
      showRowUndo('SAFE removed', () => {
        setValues(prev => {
          if ((prev.safes || []).some(safe => safe.id === safeId)) return prev
          const nextSafes = [...(prev.safes || [])]
          nextSafes.splice(Math.max(0, originalIndex), 0, removed)
          const nextValues = { ...prev, safes: nextSafes }
          onUpdate(nextValues)
          markRecentRow(`safe-${safeId}`)
          return nextValues
        })
      })
    }, 180)
  }

  const updateSafe = (safeId, field, value) => {
    // Handle string fields.
    if (field === 'investorName' || field === 'conversionType') {
      const newValues = {
        ...values,
        safes: (values.safes || []).map(safe =>
          safe.id === safeId
            ? { ...safe, [field]: value }
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
    // Limit fixed ownership to 100%
    if (field === 'fixedOwnershipPercent' && numValue > 100) numValue = 100

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

  // Warrant management functions
  const addWarrant = () => {
    const id = Date.now()
    const newWarrant = {
      id,
      name: '',
      amount: 0,
      valuation: 0
    }
    const newValues = {
      ...values,
      warrants: [...(values.warrants || []), newWarrant]
    }
    setValues(newValues)
    onUpdate(newValues)
    markRecentRow(`warrant-${id}`)
    setPendingFocusId(`warrant-name-${id}`)
  }

  const removeWarrant = (warrantId) => {
    const removed = (values.warrants || []).find(w => w.id === warrantId)
    if (!removed) return
    const originalIndex = (values.warrants || []).findIndex(w => w.id === warrantId)
    markRemovingRow(`warrant-${warrantId}`)
    setTimeout(() => {
      setValues(prev => {
        const nextWarrants = (prev.warrants || []).filter(w => w.id !== warrantId)
        const nextValues = { ...prev, warrants: nextWarrants }
        onUpdate(nextValues)
        return nextValues
      })
      showRowUndo('Warrant removed', () => {
        setValues(prev => {
          if ((prev.warrants || []).some(w => w.id === warrantId)) return prev
          const nextWarrants = [...(prev.warrants || [])]
          nextWarrants.splice(Math.max(0, originalIndex), 0, removed)
          const nextValues = { ...prev, warrants: nextWarrants }
          onUpdate(nextValues)
          markRecentRow(`warrant-${warrantId}`)
          return nextValues
        })
      })
    }, 180)
  }

  const updateWarrant = (warrantId, field, value) => {
    if (field === 'name') {
      const newValues = {
        ...values,
        warrants: (values.warrants || []).map(w =>
          w.id === warrantId ? { ...w, name: value } : w
        )
      }
      setValues(newValues)
      onUpdate(newValues)
      return
    }
    let numValue = parseFloat(value)
    if (isNaN(numValue) || value === '' || value === null || value === undefined) {
      numValue = 0
    }
    if (numValue < 0) numValue = 0
    if (numValue > 1_000_000) numValue = 1_000_000

    const newValues = {
      ...values,
      warrants: (values.warrants || []).map(w =>
        w.id === warrantId ? { ...w, [field]: numValue } : w
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

  if (collapsed) {
    return (
      <button
        type="button"
        className="input-form collapsed-rail"
        onClick={onToggleCollapsed}
        title="Show Investment Parameters"
        aria-label="Show Investment Parameters"
      >
        <span className="collapsed-rail-icon" aria-hidden="true">▶</span>
        <span className="collapsed-rail-label">Investment Parameters</span>
      </button>
    )
  }

  return (
    <div className={`input-form${formHighlight ? ' input-form-highlight' : ''}`}>
      <div className="form-header">
        <div className="form-header-title">
          <button
            type="button"
            className="input-form-collapse-btn"
            onClick={onToggleCollapsed}
            title="Hide Investment Parameters"
            aria-label="Hide Investment Parameters"
          >
            ◀
          </button>
          <h3>Investment Parameters</h3>
        </div>
        <div className="header-controls">
          <div className="investor-name-input">
            <label htmlFor="investor-name" title="Your firm's name. Used as a label throughout the model.">Your firm:</label>
            <input
              id="investor-name"
              type="text"
              value={values.investorName || 'US'}
              onChange={(e) => handleChange('investorName', e.target.value)}
              placeholder="e.g. LSVP"
              title="Your firm's name. Used as a label throughout the model."
            />
          </div>
          <div
            className={`calculated-money-toggle${moneyToggleSwapping ? ' is-swapping' : ''}`}
            data-tour="money-toggle"
            onClick={handleToggleInputMode}
            title="Click to switch between entering post-money or pre-money valuation. The other side is computed."
          >
            {inputMode === 'post-money' ? (
              <>Pre-Money: <span key={`pre-${safePreMoneyVal}`} className="value money-roll">${safePreMoneyVal.toFixed(1)}M</span></>
            ) : (
              <>Post-Money: <span key={`post-${values.postMoneyVal}`} className="value money-roll">${(isNaN(values.postMoneyVal) ? 0 : values.postMoneyVal).toFixed(1)}M</span></>
            )}
            <span className="toggle-hint">⇄</span>
          </div>
        </div>
      </div>

      <div className="input-grid" data-tour="core-inputs">
        <FormInput
          label={inputMode === 'post-money' ? 'Post-Money Valuation' : 'Pre-Money Valuation'}
          type="number"
          value={inputMode === 'post-money' ? (isNaN(values.postMoneyVal) ? 0 : values.postMoneyVal) : safePreMoneyVal}
          onChange={(value) => handleChange(inputMode === 'post-money' ? 'postMoneyVal' : 'preMoneyVal', value)}
          prefix="$"
          suffix="M"
          step="0.1"
          min="0"
          id="core-valuation-input"
          className={pulseField === 'postMoneyVal' ? 'is-auto-balanced' : ''}
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

        <div className="form-input-group round-type-field">
          <div className="form-input-wrapper">
            <label htmlFor="round-instrument" className="form-input-label">
              Round Type
            </label>
            <div className="form-input-field">
              <select
                id="round-instrument"
                className="form-select-control"
                value={values.roundInstrument || 'priced'}
                onChange={(e) => handleChange('roundInstrument', e.target.value)}
                aria-label="Round type"
                title="SAFE rounds model pro-forma dilution but do not trigger pro-rata participation."
              >
                <option value="priced">Priced</option>
                <option value="safe">SAFE</option>
              </select>
            </div>
          </div>
        </div>

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
          className={pulseField === 'investorPortion' ? 'is-auto-balanced' : ''}
        />

        <FormInput
          label="Other Portion"
          tooltip="Everything in the round that isn't your firm's check — co-investors and pro-rata participants."
          type="number"
          value={values.otherPortion}
          onChange={(value) => handleChange('otherPortion', value)}
          prefix="$"
          suffix="M"
          step="0.01"
          min="0"
          max={values.roundSize}
          className={pulseField === 'otherPortion' ? 'is-auto-balanced' : ''}
        />
      </div>

      {/* Advanced Features Toggle */}
      <div className="advanced-toggle">
        <button
          type="button"
          className="toggle-advanced-btn"
          data-tour="advanced-toggle"
          onClick={() => handleChange('showAdvanced', !values.showAdvanced)}
        >
          <span className={`chevron-icon${values.showAdvanced ? '' : ' is-collapsed'}`}>▼</span> Advanced Features
        </button>
      </div>

      {/* Advanced Features Section */}
      <div
        className={`advanced-section${values.showAdvanced ? '' : ' is-collapsed'}`}
        aria-hidden={!values.showAdvanced}
        {...(!values.showAdvanced ? { inert: true } : {})}
      >
        <div className="advanced-section-inner">
          <h4>Cap Table Modeling</h4>

          <div className="advanced-split">
            {/* 2-Step Round */}
            <div className="two-step-section">
              <div className="two-step-header">
                <h5 className="section-label">2-Step Round</h5>
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
                    <div className="warning warning-attention">
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
                      className={pulseField === 'step2InvestorPortion' ? 'is-auto-balanced' : ''}
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
                      className={pulseField === 'step2OtherPortion' ? 'is-auto-balanced' : ''}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="esop-section">
              <div className="section-title-row">
                <h5 className="section-label">Employee Stock Option Pool (ESOP)</h5>
              </div>
              <p className="section-subtitle">
                Total pool = Granted + Available. VCs negotiate the available slice post-close.
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
                <div className="esop-timing-row">
                  <span className="esop-timing-label">Top-up timing</span>
                  <div className={`esop-timing-toggle ${values.esopTiming === 'post-close' ? 'is-post' : 'is-pre'}`} role="tablist">
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
                      ? 'Dilutes founders, priors, and granted ESOP — not new investors.'
                      : 'Dilutes everyone proportionally, including new investors.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="warrants-section">
            <div className="section-title-row">
              <h5 className="section-label">Outstanding Warrants</h5>
              <div className="section-header-actions">
                <button
                  type="button"
                  className="add-safe-btn"
                  onClick={addWarrant}
                  title="Add warrant"
                >
                  + Add Warrant
                </button>
              </div>
            </div>
            <p className="section-subtitle">
              &quot;$X of warrants at $Y valuation&quot; — pre-round % = amount / valuation.
            </p>

            {(!values.warrants || values.warrants.length === 0) ? (
              <div className="no-safes-message">
                No warrants. Add to model warrant coverage from venture debt or strategic agreements.
              </div>
            ) : (
              <div className="repeater-table repeater-table--warrants">
                <div className="repeater-header">
                  <span className="repeater-col repeater-col--name">Holder</span>
                  <span className="repeater-col repeater-col--amount">Amount</span>
                  <span className="repeater-col repeater-col--valuation">Valuation</span>
                  <span className="repeater-col repeater-col--actions" aria-hidden="true" />
                </div>
                {values.warrants.map((warrant) => {
                  const amount = Number(warrant.amount) || 0
                  const valuation = Number(warrant.valuation) || 0
                  const fdPercent = (amount > 0 && valuation > 0) ? (amount / valuation) * 100 : 0
                  return (
                    <div
                      key={warrant.id}
                      className={[
                        'repeater-row',
                        'repeater-row--warrant',
                        recentRowKey === `warrant-${warrant.id}` ? 'repeater-row--new' : '',
                        removingRows[`warrant-${warrant.id}`] ? 'repeater-row--removing' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <div className="repeater-col repeater-col--name">
                        <FormInput
                          label="Holder"
                          type="text"
                          value={warrant.name || ''}
                          onChange={(value) => updateWarrant(warrant.id, 'name', value)}
                          placeholder="Optional"
                          id={`warrant-name-${warrant.id}`}
                          compact
                        />
                      </div>
                      <div className="repeater-col repeater-col--amount">
                        <FormInput
                          label="Amount"
                          type="number"
                          value={warrant.amount}
                          onChange={(value) => updateWarrant(warrant.id, 'amount', value)}
                          prefix="$"
                          suffix="M"
                          step="0.1"
                          min="0"
                          placeholder="0"
                          id={`warrant-amount-${warrant.id}`}
                          compact
                        />
                      </div>
                      <div className="repeater-col repeater-col--valuation">
                        <FormInput
                          label="Valuation"
                          type="number"
                          value={warrant.valuation}
                          onChange={(value) => updateWarrant(warrant.id, 'valuation', value)}
                          prefix="$"
                          suffix="M"
                          step="1"
                          min="0"
                          placeholder="0"
                          id={`warrant-valuation-${warrant.id}`}
                          compact
                        />
                      </div>
                      <div className="repeater-col repeater-col--actions">
                        <button
                          type="button"
                          className="remove-safe-btn"
                          onClick={() => removeWarrant(warrant.id)}
                          title="Remove warrant"
                        >
                          ×
                        </button>
                      </div>
                      {fdPercent > 0 && (
                        <div className="repeater-row-caption">
                          <span className="repeater-row-caption-text">
                            {fdPercent.toFixed(2)}% of fully-diluted ownership
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="safes-section" data-tour="safes-section">
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

            {(importWarnings.length > 0 || safeRows.length > 0) && (
              <div className="safe-import-context">
                {safeRows.length > 0 && (
                  <div className="safe-summary-strip" aria-label="SAFE import summary">
                    <span><strong>{safeRows.length}</strong> SAFEs</span>
                    <span><strong>{formatSafeAmount(safeSummary.totalAmount)}</strong> total</span>
                    <span><strong>{safeSummary.proRataCount}</strong> pro-rata</span>
                    {(safeSummary.fixedCount > 0 || safeSummary.mfnCount > 0) && (
                      <span><strong>{safeSummary.fixedCount + safeSummary.mfnCount}</strong> non-standard</span>
                    )}
                    {safeSummary.noteCount > 0 && (
                      <span><strong>{safeSummary.noteCount}</strong> notes</span>
                    )}
                  </div>
                )}
                {importWarnings.length > 0 && (
                  <div className="safe-import-warning">
                    {importWarnings.map((warning, index) => (
                      <p key={index}>{warning}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {safeRows.length === 0 ? (
              <div className="no-safes-message">
                No SAFE notes. Add convertibles to see how they convert into this round at their cap or discount.
              </div>
            ) : (
              <div className="repeater-table repeater-table--safes">
                <div className="repeater-header">
                  <span className="repeater-col repeater-col--name">Investor</span>
                  <span className="repeater-col repeater-col--amount">Amount</span>
                  <span className="repeater-col repeater-col--type">Type</span>
                  <span className="repeater-col repeater-col--cap">Cap</span>
                  <span className="repeater-col repeater-col--discount">Discount</span>
                  <span className="repeater-col repeater-col--prorata">Pro-rata</span>
                  <span className="repeater-col repeater-col--actions" aria-hidden="true" />
                </div>
                {safeRows.map((safe) => {
                  const conversionType = safe.conversionType || 'cap-discount'
                  const isFixedPercentSafe = conversionType === 'fixed-percent'
                  const isRoundPriceSafe = conversionType === 'round-price'
                  const safeNotes = (safe.notes || '').trim()
                  const termLabel = getSafeTermLabel(safe)
                  // Conversion valuation for the caption under the row
                  const conversionInfo = (() => {
                    if (safe.amount <= 0) return null
                    const conversion = resolveSafeConversion(safe, safePreMoneyVal)
                    if (!conversion.percent) return null
                    if (conversion.conversionType === 'fixed-percent') {
                      return `Converts at ${conversion.conversionLabel}`
                    }
                    if (conversion.conversionType === 'round-price' || conversion.conversionLabel === 'round price') {
                      return `Converts at round price ($${conversion.conversionPrice.toFixed(1)}M)`
                    }
                    return `Converts at $${conversion.conversionPrice.toFixed(1)}M (${conversion.conversionLabel})`
                  })()

                  // Pro-rata allocation calculation
                  let proRataBlock = null
                  if (safe.proRata && safe.amount > 0 && values.roundSize > 0) {
                    const conversion = resolveSafeConversion(safe, safePreMoneyVal)
                    if (conversion.percent > 0) {
                      const safeOwnership = conversion.percent
                      const calculatedProRata = (safeOwnership / 100) * values.roundSize
                      const hasOverride = safe.proRataOverride != null
                      const displayAmount = hasOverride ? safe.proRataOverride : calculatedProRata
                      const matchesLead = (safe.investorName || '').trim() === (values.investorName || 'US').trim()
                      proRataBlock = { calculatedProRata, hasOverride, displayAmount, matchesLead: matchesLead && !!safe.investorName, suppressed: isSafeRound }
                    }
                  }

                  return (
                    <div
                      key={safe.id}
                      className={[
                        'repeater-row',
                        'repeater-row--safe',
                        recentRowKey === `safe-${safe.id}` ? 'repeater-row--new' : '',
                        removingRows[`safe-${safe.id}`] ? 'repeater-row--removing' : '',
                      ].filter(Boolean).join(' ')}
                    >
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
                      <div className="repeater-col repeater-col--type">
                        <label className="sr-only" htmlFor={`safe-type-${safe.id}`}>SAFE type</label>
                        <select
                          id={`safe-type-${safe.id}`}
                          className="repeater-select"
                          value={conversionType}
                          onChange={(e) => updateSafe(safe.id, 'conversionType', e.target.value)}
                          aria-label="SAFE type"
                        >
                          <option value="cap-discount">Cap/Disc.</option>
                          <option value="fixed-percent">Fixed %</option>
                          <option value="round-price">Round price</option>
                          <option value="mfn">MFN</option>
                        </select>
                      </div>
                      <div className="repeater-col repeater-col--cap">
                        {isFixedPercentSafe ? (
                          <FormInput
                            label="Fixed %"
                            type="number"
                            value={safe.fixedOwnershipPercent || 0}
                            onChange={(value) => updateSafe(safe.id, 'fixedOwnershipPercent', value)}
                            suffix="%"
                            step="0.1"
                            min="0"
                            max="100"
                            id={`safe-fixed-percent-${safe.id}`}
                            compact
                          />
                        ) : isRoundPriceSafe ? (
                          <span className="repeater-muted-cell">round</span>
                        ) : (
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
                        )}
                      </div>
                      <div className="repeater-col repeater-col--discount">
                        {isFixedPercentSafe ? (
                          <span className="repeater-muted-cell">fixed</span>
                        ) : isRoundPriceSafe ? (
                          <span className="repeater-muted-cell">price</span>
                        ) : (
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
                        )}
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
                      <div className="repeater-col repeater-col--actions">
                        <button
                          type="button"
                          className="remove-safe-btn"
                          onClick={() => removeSafe(safe.id)}
                          title="Remove SAFE"
                        >
                          ×
                        </button>
                      </div>
                      {(conversionInfo || proRataBlock || safeNotes) && (
                        <div className="repeater-row-caption">
                          <div className="safe-row-explainer">
                            <div className="safe-term-line">
                              <span className="safe-term-pill">{termLabel}</span>
                              {Boolean(safe.proRata) && <span className="safe-term-pill safe-term-pill--positive">Pro-rata</span>}
                              {safeNotes && <span className="safe-term-pill safe-term-pill--note">Side letter</span>}
                            </div>
                            <span className="repeater-row-caption-text">
                              {conversionInfo}
                              {!conversionInfo && proRataBlock?.matchesLead && `Pro-rata handled via ${values.investorName || 'US'} round portion`}
                            </span>
                            {proRataBlock?.suppressed && (
                              <span className="repeater-row-caption-text">
                                Pro-rata suppressed for SAFE round
                              </span>
                            )}
                            {safeNotes && (
                              <span className="safe-row-note">{safeNotes}</span>
                            )}
                          </div>
                          {proRataBlock && !proRataBlock.matchesLead && !proRataBlock.suppressed && (
                            <span className="repeater-row-caption-action">
                              <span className="repeater-row-caption-label">Allocation</span>
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
                              {proRataBlock.hasOverride && (
                                <button
                                  type="button"
                                  className="reset-pro-rata-btn"
                                  onClick={() => updateSafe(safe.id, 'proRataOverride', null)}
                                  title={`Reset to calculated ($${parseFloat(proRataBlock.calculatedProRata.toPrecision(10))}M)`}
                                >
                                  ↺
                                </button>
                              )}
                            </span>
                          )}
                        </div>
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
            safes={values.safes || []}
            postMoneyVal={values.postMoneyVal}
            investorPortion={values.investorPortion}
            roundInstrument={values.roundInstrument || 'priced'}
          />

          <FoundersSection
            founders={values.founders || []}
            onUpdate={handleFoundersUpdate}
          />

        </div>
      </div>

      {undoNotice && (
        <div className="repeater-undo-toast" role="status">
          <span>{undoNotice.label}</span>
          <button
            type="button"
            onClick={() => {
              undoNotice.onUndo()
              setUndoNotice(null)
            }}
          >
            Undo
          </button>
        </div>
      )}

      <div className="validation-info">
        {!isNaN(values.investorPortion) && !isNaN(values.otherPortion) && !isNaN(values.roundSize) && 
         (values.investorPortion + values.otherPortion).toFixed(2) !== values.roundSize.toFixed(2) && (
          <div className="warning warning-attention">
            ⚠️ {values.investorName || 'Investor'} + Other ({(values.investorPortion + values.otherPortion).toFixed(2)}M) doesn't equal Round Size ({values.roundSize.toFixed(2)}M)
          </div>
        )}
        {!isNaN(values.postMoneyVal) && !isNaN(values.roundSize) && values.postMoneyVal <= values.roundSize && values.postMoneyVal > 0 && (
          <div className="warning warning-attention">
            ⚠️ Post-Money Valuation must be greater than Round Size for valid pre-money calculation
          </div>
        )}
        {!isNaN(values.postMoneyVal) && values.postMoneyVal <= 0 && (
          <div className="warning warning-attention">
            ⚠️ Post-Money Valuation must be greater than 0
          </div>
        )}
      </div>
    </div>
  )
}

export default InputForm
