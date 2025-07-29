import { useState, useEffect } from 'react'

const ProFormaInputForm = ({ company, onUpdate }) => {
  const [values, setValues] = useState({
    // Basic round parameters (inherited from regular mode)
    postMoneyVal: 13,
    roundSize: 3,
    newInvestorAmount: 2.5,
    newInvestorName: 'Lead Investor',
    
    // Existing investors with pro-rata rights
    existingInvestors: [],
    
    // Multiple founders
    founders: [],
    
    // ESOP parameters
    esopPoolPreClose: 0,
    esopPoolInRound: 0,
    
    // Advanced features from existing system
    safes: [],
    proRataPercent: 0,
    preRoundFounderOwnership: 0,
    
    // Pro-forma mode flag
    isProFormaMode: true
  })

  useEffect(() => {
    if (company) {
      setValues({
        ...values,
        ...company,
        // Ensure arrays are always present
        existingInvestors: company.existingInvestors || [],
        founders: company.founders || [],
        safes: company.safes || [],
        isProFormaMode: true
      })
    }
  }, [company])

  const handleChange = (field, value) => {
    let numValue = ['newInvestorName'].includes(field) ? value : parseFloat(value)
    
    // Input validation for numeric fields
    if (!['newInvestorName'].includes(field)) {
      if (isNaN(numValue) || value === '' || value === null || value === undefined) {
        numValue = 0
      }
      if (numValue < 0) numValue = 0
      if (numValue > 1000000) numValue = 1000000
    }
    
    const newValues = { ...values, [field]: numValue }
    
    // Auto-calculate other amounts when round size or new investor amount changes
    if (field === 'roundSize' || field === 'newInvestorAmount') {
      // Adjust other portions based on existing commitments
      const totalExistingCommitments = values.existingInvestors.reduce(
        (sum, inv) => sum + (inv.proRataCommitment || 0), 0
      )
      const totalSafeAmount = values.safes.reduce((sum, safe) => sum + (safe.amount || 0), 0)
      
      if (field === 'roundSize') {
        const remaining = numValue - totalExistingCommitments - totalSafeAmount - values.esopPoolInRound
        newValues.newInvestorAmount = Math.max(0, remaining)
      }
    }
    
    setValues(newValues)
    onUpdate(newValues)
  }

  // Existing investor management
  const addExistingInvestor = () => {
    const newInvestor = {
      id: Date.now(),
      name: '',
      ownershipPercent: 0,
      hasProRata: true,
      proRataCommitment: 0
    }
    
    const newValues = {
      ...values,
      existingInvestors: [...values.existingInvestors, newInvestor]
    }
    setValues(newValues)
    onUpdate(newValues)
  }

  const updateExistingInvestor = (id, field, value) => {
    const numValue = ['name'].includes(field) ? value : parseFloat(value) || 0
    
    const updatedInvestors = values.existingInvestors.map(investor =>
      investor.id === id ? { ...investor, [field]: numValue } : investor
    )
    
    const newValues = { ...values, existingInvestors: updatedInvestors }
    setValues(newValues)
    onUpdate(newValues)
  }

  const removeExistingInvestor = (id) => {
    const newValues = {
      ...values,
      existingInvestors: values.existingInvestors.filter(investor => investor.id !== id)
    }
    setValues(newValues)
    onUpdate(newValues)
  }

  // Founder management
  const addFounder = () => {
    const newFounder = {
      id: Date.now(),
      name: '',
      ownershipPercent: 0,
      isFounder: true
    }
    
    const newValues = {
      ...values,
      founders: [...values.founders, newFounder]
    }
    setValues(newValues)
    onUpdate(newValues)
  }

  const updateFounder = (id, field, value) => {
    const numValue = ['name'].includes(field) ? value : parseFloat(value) || 0
    
    const updatedFounders = values.founders.map(founder =>
      founder.id === id ? { ...founder, [field]: numValue } : founder
    )
    
    const newValues = { ...values, founders: updatedFounders }
    setValues(newValues)
    onUpdate(newValues)
  }

  const removeFounder = (id) => {
    const newValues = {
      ...values,
      founders: values.founders.filter(founder => founder.id !== id)
    }
    setValues(newValues)
    onUpdate(newValues)
  }

  // SAFE management (inherited from existing system)
  const addSafe = () => {
    const newSafe = {
      id: Date.now(),
      amount: 0,
      cap: 0,
      discount: 0
    }
    
    const newValues = {
      ...values,
      safes: [...values.safes, newSafe]
    }
    setValues(newValues)
    onUpdate(newValues)
  }

  const updateSafe = (id, field, value) => {
    const numValue = parseFloat(value) || 0
    
    const updatedSafes = values.safes.map(safe =>
      safe.id === id ? { ...safe, [field]: numValue } : safe
    )
    
    const newValues = { ...values, safes: updatedSafes }
    setValues(newValues)
    onUpdate(newValues)
  }

  const removeSafe = (id) => {
    const newValues = {
      ...values,
      safes: values.safes.filter(safe => safe.id !== id)
    }
    setValues(newValues)
    onUpdate(newValues)
  }

  const preMoneyVal = Math.round((values.postMoneyVal - values.roundSize) * 100) / 100
  const totalExistingCommitments = values.existingInvestors.reduce(
    (sum, inv) => sum + (inv.proRataCommitment || 0), 0
  )
  const totalSafeAmount = values.safes.reduce((sum, safe) => sum + (safe.amount || 0), 0)

  return (
    <div className="input-form pro-forma-input">
      <h3>Pro-Forma Cap Table Modeling</h3>
      
      {/* Basic Round Parameters */}
      <div className="form-section">
        <h4>Round Parameters</h4>
        <div className="form-group">
          <label htmlFor="postMoneyVal">Post-Money Valuation ($M)</label>
          <input
            id="postMoneyVal"
            type="number"
            step="0.1"
            value={values.postMoneyVal}
            onChange={(e) => handleChange('postMoneyVal', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="roundSize">Round Size ($M)</label>
          <input
            id="roundSize"
            type="number"
            step="0.1"
            value={values.roundSize}
            onChange={(e) => handleChange('roundSize', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label>Pre-Money Valuation</label>
          <div className="calculated-value">${preMoneyVal}M</div>
        </div>
      </div>

      {/* New Investor */}
      <div className="form-section">
        <h4>New Lead Investor</h4>
        <div className="form-group">
          <label htmlFor="newInvestorName">Investor Name</label>
          <input
            id="newInvestorName"
            type="text"
            value={values.newInvestorName}
            onChange={(e) => handleChange('newInvestorName', e.target.value)}
            placeholder="Enter investor name"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="newInvestorAmount">Investment Amount ($M)</label>
          <input
            id="newInvestorAmount"
            type="number"
            step="0.1"
            value={values.newInvestorAmount}
            onChange={(e) => handleChange('newInvestorAmount', e.target.value)}
          />
        </div>
      </div>

      {/* Existing Investors */}
      <div className="form-section">
        <div className="section-header">
          <h4>Existing Investors</h4>
          <button type="button" onClick={addExistingInvestor} className="add-button">
            + Add Investor
          </button>
        </div>
        
        {values.existingInvestors.map((investor, index) => (
          <div key={investor.id} className="investor-row">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={investor.name}
                onChange={(e) => updateExistingInvestor(investor.id, 'name', e.target.value)}
                placeholder={`Investor ${index + 1}`}
              />
            </div>
            
            <div className="form-group">
              <label>Current Ownership (%)</label>
              <input
                type="number"
                step="0.1"
                value={investor.ownershipPercent}
                onChange={(e) => updateExistingInvestor(investor.id, 'ownershipPercent', e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={investor.hasProRata}
                  onChange={(e) => updateExistingInvestor(investor.id, 'hasProRata', e.target.checked)}
                />
                Has Pro-Rata Rights
              </label>
            </div>
            
            {investor.hasProRata && (
              <div className="form-group">
                <label htmlFor={`proRataCommitment-${investor.id}`}>Pro-Rata Commitment ($M)</label>
                <input
                  id={`proRataCommitment-${investor.id}`}
                  type="number"
                  step="0.1"
                  value={investor.proRataCommitment || 0}
                  onChange={(e) => updateExistingInvestor(investor.id, 'proRataCommitment', e.target.value)}
                />
              </div>
            )}
            
            <button
              type="button"
              onClick={() => removeExistingInvestor(investor.id)}
              className="remove-button"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Founders */}
      <div className="form-section">
        <div className="section-header">
          <h4>Founders</h4>
          <button type="button" onClick={addFounder} className="add-button">
            + Add Founder
          </button>
        </div>
        
        {values.founders.map((founder, index) => (
          <div key={founder.id} className="founder-row">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={founder.name}
                onChange={(e) => updateFounder(founder.id, 'name', e.target.value)}
                placeholder={`Founder ${index + 1}`}
              />
            </div>
            
            <div className="form-group">
              <label>Ownership (%)</label>
              <input
                type="number"
                step="0.1"
                value={founder.ownershipPercent}
                onChange={(e) => updateFounder(founder.id, 'ownershipPercent', e.target.value)}
              />
            </div>
            
            <button
              type="button"
              onClick={() => removeFounder(founder.id)}
              className="remove-button"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* ESOP */}
      <div className="form-section">
        <h4>Employee Stock Option Pool (ESOP)</h4>
        <div className="form-group">
          <label htmlFor="esopPoolPreClose">Pre-Close ESOP Pool (%)</label>
          <input
            id="esopPoolPreClose"
            type="number"
            step="0.1"
            value={values.esopPoolPreClose}
            onChange={(e) => handleChange('esopPoolPreClose', e.target.value)}
          />
          <small>Percentage of shares allocated before the round</small>
        </div>
        
        <div className="form-group">
          <label htmlFor="esopPoolInRound">ESOP Pool in Round ($M)</label>
          <input
            id="esopPoolInRound"
            type="number"
            step="0.1"
            value={values.esopPoolInRound}
            onChange={(e) => handleChange('esopPoolInRound', e.target.value)}
          />
          <small>Dollar amount allocated as part of the round</small>
        </div>
      </div>

      {/* SAFEs */}
      <div className="form-section">
        <div className="section-header">
          <h4>SAFE Notes</h4>
          <button type="button" onClick={addSafe} className="add-button">
            + Add SAFE
          </button>
        </div>
        
        {values.safes.map((safe, index) => (
          <div key={safe.id} className="safe-row">
            <div className="form-group">
              <label>Amount ($M)</label>
              <input
                type="number"
                step="0.1"
                value={safe.amount}
                onChange={(e) => updateSafe(safe.id, 'amount', e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Valuation Cap ($M)</label>
              <input
                type="number"
                step="0.1"
                value={safe.cap}
                onChange={(e) => updateSafe(safe.id, 'cap', e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Discount (%)</label>
              <input
                type="number"
                step="1"
                value={safe.discount}
                onChange={(e) => updateSafe(safe.id, 'discount', e.target.value)}
              />
            </div>
            
            <button
              type="button"
              onClick={() => removeSafe(safe.id)}
              className="remove-button"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="form-section summary">
        <h4>Round Summary</h4>
        <div className="summary-row">
          <span>Total Existing Commitments:</span>
          <span>${totalExistingCommitments.toFixed(2)}M</span>
        </div>
        <div className="summary-row">
          <span>Total SAFE Amount:</span>
          <span>${totalSafeAmount.toFixed(2)}M</span>
        </div>
        <div className="summary-row">
          <span>ESOP in Round:</span>
          <span>${values.esopPoolInRound.toFixed(2)}M</span>
        </div>
        <div className="summary-row">
          <span>New Investor Amount:</span>
          <span>${values.newInvestorAmount.toFixed(2)}M</span>
        </div>
        <div className="summary-row total">
          <span>Total Round:</span>
          <span>${(totalExistingCommitments + totalSafeAmount + values.esopPoolInRound + values.newInvestorAmount).toFixed(2)}M</span>
        </div>
        <div className="summary-row">
          <span>Target Round Size:</span>
          <span>${values.roundSize.toFixed(2)}M</span>
        </div>
      </div>
    </div>
  )
}

export default ProFormaInputForm