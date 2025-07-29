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
    
    // ESOP parameters (inherited from scenario mode)
    esopPool: 0,
    
    // Advanced features from existing system (inherited)
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
    <div className="input-form">
      <div className="form-header">
        <h3>Pro-Forma Cap Table Modeling</h3>
        <div className="header-controls">
          <div className="investor-name-input">
            <label htmlFor="pro-forma-investor-name">Lead Investor:</label>
            <input
              id="pro-forma-investor-name"
              type="text"
              value={values.newInvestorName || 'Lead Investor'}
              onChange={(e) => handleChange('newInvestorName', e.target.value)}
              placeholder="Lead Investor"
            />
          </div>
          <div className="calculated-money-toggle">
            Pre-Money: <span className="value">${preMoneyVal.toFixed(1)}M</span>
          </div>
        </div>
      </div>

      <div className="input-grid">
        <div className="input-group">
          <label htmlFor="pro-forma-post-money">Post-Money Valuation</label>
          <div className="input-wrapper">
            <span className="currency">$</span>
            <input
              id="pro-forma-post-money"
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
          <label htmlFor="pro-forma-round-size">Round Size</label>
          <div className="input-wrapper">
            <span className="currency">$</span>
            <input
              id="pro-forma-round-size"
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
          <label htmlFor="pro-forma-new-investor">Lead Investment</label>
          <div className="input-wrapper">
            <span className="currency">$</span>
            <input
              id="pro-forma-new-investor"
              type="number"
              value={values.newInvestorAmount}
              onChange={(e) => handleChange('newInvestorAmount', e.target.value)}
              step="0.1"
              min="0"
            />
            <span className="unit">M</span>
          </div>
        </div>
      </div>

      {/* Pro-Forma Advanced Features Toggle */}
      <div className="advanced-toggle">
        <button 
          type="button"
          className="toggle-advanced-btn"
          onClick={() => handleChange('showAdvanced', !values.showAdvanced)}
        >
          {values.showAdvanced ? '▼' : '▶'} Pro-Forma Details
        </button>
      </div>

      {/* Pro-Forma Advanced Features Section */}
      {values.showAdvanced && (
        <div className="advanced-section">
          <h4>Detailed Cap Table Modeling</h4>
          
          {/* Existing Investors Section */}
          <div className="stakeholders-section">
            <div className="stakeholders-header">
              <h5>Existing Investors</h5>
              <button 
                type="button"
                className="add-safe-btn"
                onClick={addExistingInvestor}
                title="Add Existing Investor"
              >
                + Add Investor
              </button>
            </div>

            {(!values.existingInvestors || values.existingInvestors.length === 0) && (
              <div className="no-safes-message">
                No existing investors added. Click "Add Investor" to model current cap table.
              </div>
            )}

            {values.existingInvestors && values.existingInvestors.map((investor, index) => (
              <div key={investor.id} className="safe-row">
                <div className="safe-row-header">
                  <span className="safe-label">Investor #{index + 1}</span>
                  <button 
                    type="button"
                    className="remove-safe-btn"
                    onClick={() => removeExistingInvestor(investor.id)}
                    title="Remove Investor"
                  >
                    ×
                  </button>
                </div>
                
                <div className="safe-inputs">
                  <div className="input-group">
                    <label htmlFor={`investor-name-${investor.id}`}>Name</label>
                    <div className="input-wrapper">
                      <input
                        id={`investor-name-${investor.id}`}
                        type="text"
                        value={investor.name}
                        onChange={(e) => updateExistingInvestor(investor.id, 'name', e.target.value)}
                        placeholder={`Investor ${index + 1}`}
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor={`investor-ownership-${investor.id}`}>Current Ownership</label>
                    <div className="input-wrapper">
                      <input
                        id={`investor-ownership-${investor.id}`}
                        type="number"
                        value={investor.ownershipPercent}
                        onChange={(e) => updateExistingInvestor(investor.id, 'ownershipPercent', e.target.value)}
                        step="0.1"
                        min="0"
                        max="100"
                      />
                      <span className="unit">%</span>
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor={`investor-prorata-${investor.id}`}>Pro-Rata Commitment</label>
                    <div className="input-wrapper">
                      <span className="currency">$</span>
                      <input
                        id={`investor-prorata-${investor.id}`}
                        type="number"
                        value={investor.proRataCommitment || 0}
                        onChange={(e) => updateExistingInvestor(investor.id, 'proRataCommitment', e.target.value)}
                        step="0.1"
                        min="0"
                        placeholder="0 = no participation"
                      />
                      <span className="unit">M</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Founders Section */}
          <div className="stakeholders-section">
            <div className="stakeholders-header">
              <h5>Founders</h5>
              <button 
                type="button"
                className="add-safe-btn"
                onClick={addFounder}
                title="Add Founder"
              >
                + Add Founder
              </button>
            </div>

            {(!values.founders || values.founders.length === 0) && (
              <div className="no-safes-message">
                No founders added. Click "Add Founder" to model founder ownership.
              </div>
            )}

            {values.founders && values.founders.map((founder, index) => (
              <div key={founder.id} className="safe-row">
                <div className="safe-row-header">
                  <span className="safe-label">Founder #{index + 1}</span>
                  <button 
                    type="button"
                    className="remove-safe-btn"
                    onClick={() => removeFounder(founder.id)}
                    title="Remove Founder"
                  >
                    ×
                  </button>
                </div>
                
                <div className="safe-inputs">
                  <div className="input-group">
                    <label htmlFor={`founder-name-${founder.id}`}>Name</label>
                    <div className="input-wrapper">
                      <input
                        id={`founder-name-${founder.id}`}
                        type="text"
                        value={founder.name}
                        onChange={(e) => updateFounder(founder.id, 'name', e.target.value)}
                        placeholder={`Founder ${index + 1}`}
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor={`founder-ownership-${founder.id}`}>Ownership</label>
                    <div className="input-wrapper">
                      <input
                        id={`founder-ownership-${founder.id}`}
                        type="number"
                        value={founder.ownershipPercent}
                        onChange={(e) => updateFounder(founder.id, 'ownershipPercent', e.target.value)}
                        step="0.1"
                        min="0"
                        max="100"
                      />
                      <span className="unit">%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ESOP inherited from scenario mode - show current value */}
          <div className="input-grid">
            <div className="input-group">
              <label>ESOP Pool (from scenario)</label>
              <div className="calculated-value">
                {values.esopPool > 0 ? `${values.esopPool}% post-round` : 'None set'}
              </div>
              <small>Set in Scenario Analysis advanced features</small>
            </div>
          </div>

          {/* SAFEs inherited from scenario mode */}
          <div className="stakeholders-section">
            <div className="stakeholders-header">
              <h5>SAFE Notes (from scenario)</h5>
              <span className="inherited-note">Managed in Scenario Analysis</span>
            </div>

            {(!values.safes || values.safes.length === 0) && (
              <div className="no-safes-message">
                No SAFE notes set. Configure in Scenario Analysis advanced features.
              </div>
            )}

            {values.safes && values.safes.map((safe, index) => (
              <div key={safe.id} className="safe-display">
                <span className="safe-label">SAFE #{index + 1}:</span>
                <span className="safe-details">
                  ${safe.amount}M
                  {safe.cap > 0 && ` (${safe.cap}M cap)`}
                  {safe.discount > 0 && ` (${safe.discount}% discount)`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProFormaInputForm