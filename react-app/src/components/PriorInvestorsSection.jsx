import { useState } from 'react'
import { createPriorInvestor, calculateTotalOwnership } from '../utils/dataStructures'
import FormInput from './FormInput'

function PriorInvestorsSection({ priorInvestors = [], onUpdate }) {
  const [expandedInvestor, setExpandedInvestor] = useState(null)
  
  const addPriorInvestor = () => {
    const newInvestor = createPriorInvestor('New Investor', 0, false)
    const updatedInvestors = [...priorInvestors, newInvestor]
    onUpdate(updatedInvestors)
    setExpandedInvestor(newInvestor.id)
  }
  
  const updateInvestor = (investorId, field, value) => {
    const updatedInvestors = priorInvestors.map(investor => {
      if (investor.id === investorId) {
        return {
          ...investor,
          [field]: field === 'ownershipPercent' ? Math.max(0, Math.min(100, Number(value) || 0)) : value
        }
      }
      return investor
    })
    onUpdate(updatedInvestors)
  }
  
  const removeInvestor = (investorId) => {
    const updatedInvestors = priorInvestors.filter(investor => investor.id !== investorId)
    onUpdate(updatedInvestors)
    if (expandedInvestor === investorId) {
      setExpandedInvestor(null)
    }
  }
  
  const totalOwnership = calculateTotalOwnership(priorInvestors)
  const hasProRataInvestors = priorInvestors.some(inv => inv.hasProRataRights)
  
  return (
    <div className="prior-investors-section">
      <div className="founders-investors-header">
        <div className="section-title-row">
          <h5 className="section-label">Prior Investors</h5>
          <button 
            className="add-investor-btn"
            onClick={addPriorInvestor}
            type="button"
          >
            + Add Investor
          </button>
        </div>
        
        {totalOwnership > 0 && (
          <div className="ownership-summary">
            <span className="summary-label">Total Prior Investor Ownership:</span>
            <span className="summary-value">{totalOwnership.toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      {priorInvestors.length === 0 ? (
        <div className="no-investors-message">
          No prior investors added. Click "Add Investor" to include previous round participants.
        </div>
      ) : (
        <div className="investors-list">
          {priorInvestors.map(investor => (
            <div key={investor.id} className="investor-row">
              <div className="investor-row-header">
                <span className="investor-label">Prior Investor</span>
                <button
                  className="remove-investor-btn"
                  onClick={() => removeInvestor(investor.id)}
                  type="button"
                  title="Remove investor"
                >
                  ×
                </button>
              </div>
              
              <div className="investor-inputs">
                <FormInput
                  label="Name"
                  type="text"
                  value={investor.name}
                  onChange={(value) => updateInvestor(investor.id, 'name', value)}
                  placeholder="Investor name"
                />
                <FormInput
                  label="Ownership"
                  type="number"
                  value={investor.ownershipPercent}
                  onChange={(value) => updateInvestor(investor.id, 'ownershipPercent', value)}
                  suffix="%"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
              
              <div className="investor-pro-rata">
                <label className="pro-rata-checkbox">
                  <input
                    type="checkbox"
                    checked={investor.hasProRataRights}
                    onChange={(e) => updateInvestor(investor.id, 'hasProRataRights', e.target.checked)}
                  />
                  <span className="checkbox-label">Pro-rata rights</span>
                </label>
              </div>
              
            </div>
          ))}
        </div>
      )}
      
      {hasProRataInvestors && (
        <div className="pro-rata-explanation">
          <div className="explanation-icon">ℹ️</div>
          <div className="explanation-text">
            Investors with pro-rata rights can participate in the new round proportional to their current ownership.
            Their allocation will be calculated automatically and deducted from the "Other" portion of the round.
          </div>
        </div>
      )}
    </div>
  )
}

export default PriorInvestorsSection