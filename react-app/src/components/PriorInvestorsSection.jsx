import { useState } from 'react'
import { createPriorInvestor, calculateTotalOwnership } from '../utils/dataStructures'
import FormInput from './FormInput'

function PriorInvestorsSection({ priorInvestors = [], onUpdate, roundSize = 0 }) {
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
        const updated = { ...investor }
        if (field === 'ownershipPercent') {
          updated.ownershipPercent = Math.max(0, Math.min(100, Number(value) || 0))
          // Reset override when ownership changes so it recalculates
          if (updated.proRataOverride != null) {
            updated.proRataOverride = null
          }
        } else if (field === 'proRataOverride') {
          const numVal = parseFloat(value)
          updated.proRataOverride = (isNaN(numVal) || value === '' || value === null) ? null : Math.max(0, numVal)
        } else if (field === 'hasProRataRights') {
          updated.hasProRataRights = value
          // Clear override when toggling pro-rata off
          if (!value) {
            updated.proRataOverride = null
          }
        } else {
          updated[field] = value
        }
        return updated
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

  const getCalculatedProRata = (investor) => {
    if (!investor.ownershipPercent || !roundSize) return 0
    return Math.round((investor.ownershipPercent / 100) * roundSize * 100) / 100
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
          {priorInvestors.map(investor => {
            const calculatedProRata = getCalculatedProRata(investor)
            const hasOverride = investor.proRataOverride != null
            const displayAmount = hasOverride ? investor.proRataOverride : calculatedProRata

            return (
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

                {/* Show allocation field when pro-rata is enabled and they have ownership */}
                {investor.hasProRataRights && investor.ownershipPercent > 0 && roundSize > 0 && (
                  <div className="pro-rata-allocation">
                    <div className="pro-rata-allocation-row">
                      <FormInput
                        label="Allocation"
                        type="number"
                        value={displayAmount}
                        onChange={(value) => updateInvestor(investor.id, 'proRataOverride', value)}
                        prefix="$"
                        suffix="M"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    {hasOverride && (
                      <div className="pro-rata-hint">
                        <span className="hint-text">
                          Pro-rata right: ${calculatedProRata.toFixed(2)}M
                          {investor.proRataOverride < calculatedProRata
                            ? ` (taking less)`
                            : investor.proRataOverride > calculatedProRata
                              ? ` (taking more)`
                              : ''}
                        </span>
                        <button
                          type="button"
                          className="reset-pro-rata-btn"
                          onClick={() => updateInvestor(investor.id, 'proRataOverride', null)}
                          title="Reset to calculated pro-rata"
                        >
                          reset
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )
          })}
        </div>
      )}

      {hasProRataInvestors && (
        <div className="pro-rata-explanation">
          <div className="explanation-icon">ℹ️</div>
          <div className="explanation-text">
            Investors with pro-rata rights can participate in the new round proportional to their current ownership.
            Their allocation is deducted from the "Other" portion. Edit the allocation to adjust.
          </div>
        </div>
      )}
    </div>
  )
}

export default PriorInvestorsSection
