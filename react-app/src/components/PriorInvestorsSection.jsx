import { createPriorInvestor, calculateTotalOwnership } from '../utils/dataStructures'
import FormInput from './FormInput'

function PriorInvestorsSection({ priorInvestors = [], onUpdate, roundSize = 0, investorName = '' }) {
  const addPriorInvestor = () => {
    const newInvestor = createPriorInvestor('New Investor', 0, false)
    onUpdate([...priorInvestors, newInvestor])
  }

  const updateInvestor = (investorId, field, value) => {
    const updatedInvestors = priorInvestors.map(investor => {
      if (investor.id === investorId) {
        const updated = { ...investor }
        if (field === 'ownershipPercent') {
          updated.ownershipPercent = Math.max(0, Math.min(100, Number(value) || 0))
          if (updated.proRataOverride != null) {
            updated.proRataOverride = null
          }
        } else if (field === 'proRataOverride') {
          const numVal = parseFloat(value)
          updated.proRataOverride = (isNaN(numVal) || value === '' || value === null) ? null : Math.max(0, numVal)
        } else if (field === 'hasProRataRights') {
          updated.hasProRataRights = value
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
    onUpdate(priorInvestors.filter(investor => investor.id !== investorId))
  }

  const getCalculatedProRata = (investor) => {
    if (!investor.ownershipPercent || !roundSize) return 0
    return (investor.ownershipPercent / 100) * roundSize
  }

  const totalOwnership = calculateTotalOwnership(priorInvestors)
  const hasProRataInvestors = priorInvestors.some(inv => inv.hasProRataRights)

  return (
    <div className="prior-investors-section">
      <div className="founders-investors-header">
        <div className="section-title-row">
          <h5 className="section-label">Prior Investors</h5>
          <div className="section-header-actions">
            {totalOwnership > 0 && (
              <span className="section-total-pill">
                Total: <strong>{totalOwnership.toFixed(1)}%</strong>
              </span>
            )}
            <button
              className="add-investor-btn"
              onClick={addPriorInvestor}
              type="button"
            >
              + Add Investor
            </button>
          </div>
        </div>
      </div>

      {priorInvestors.length === 0 ? (
        <div className="no-investors-message">
          No prior investors added. Click "Add Investor" to include previous round participants.
        </div>
      ) : (
        <div className="repeater-table repeater-table--investors">
          <div className="repeater-header">
            <span className="repeater-col repeater-col--name">Name</span>
            <span className="repeater-col repeater-col--pct">Ownership</span>
            <span className="repeater-col repeater-col--prorata">Pro-rata</span>
            <span className="repeater-col repeater-col--alloc">Allocation</span>
            <span className="repeater-col repeater-col--actions" aria-hidden="true" />
          </div>
          {priorInvestors.map(investor => {
            const calculatedProRata = getCalculatedProRata(investor)
            const hasOverride = investor.proRataOverride != null
            const displayAmount = hasOverride ? investor.proRataOverride : calculatedProRata
            const matchesLead = investor.name === investorName && investor.name
            const allocActive = investor.hasProRataRights && investor.ownershipPercent > 0 && roundSize > 0
            return (
              <div key={investor.id} className="repeater-row">
                <div className="repeater-col repeater-col--name">
                  <FormInput
                    label="Name"
                    type="text"
                    value={investor.name}
                    onChange={(value) => updateInvestor(investor.id, 'name', value)}
                    placeholder="Investor name"
                    compact
                  />
                </div>
                <div className="repeater-col repeater-col--pct">
                  <FormInput
                    label="Ownership"
                    type="number"
                    value={investor.ownershipPercent}
                    onChange={(value) => updateInvestor(investor.id, 'ownershipPercent', value)}
                    suffix="%"
                    min="0"
                    max="100"
                    step="0.1"
                    compact
                  />
                </div>
                <div className="repeater-col repeater-col--prorata">
                  <label className="repeater-checkbox" title="Pro-rata rights">
                    <input
                      type="checkbox"
                      checked={investor.hasProRataRights}
                      onChange={(e) => updateInvestor(investor.id, 'hasProRataRights', e.target.checked)}
                    />
                  </label>
                </div>
                <div className="repeater-col repeater-col--alloc">
                  {allocActive && !matchesLead ? (
                    <FormInput
                      label="Allocation"
                      type="number"
                      value={displayAmount}
                      onChange={(value) => updateInvestor(investor.id, 'proRataOverride', value)}
                      prefix="$"
                      suffix="M"
                      step="0.01"
                      min="0"
                      compact
                    />
                  ) : (
                    <span className="repeater-alloc-placeholder" title={matchesLead ? `Handled via ${investorName} round portion` : 'Enable pro-rata to set allocation'}>
                      {matchesLead ? 'via lead' : '—'}
                    </span>
                  )}
                </div>
                <div className="repeater-col repeater-col--actions">
                  {hasOverride && allocActive && !matchesLead && (
                    <button
                      type="button"
                      className="reset-pro-rata-btn"
                      onClick={() => updateInvestor(investor.id, 'proRataOverride', null)}
                      title={`Reset to calculated ($${parseFloat(calculatedProRata.toPrecision(10))}M)`}
                    >
                      ↺
                    </button>
                  )}
                  <button
                    className="remove-investor-btn"
                    onClick={() => removeInvestor(investor.id)}
                    type="button"
                    title="Remove investor"
                  >
                    ×
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {hasProRataInvestors && (
        <div className="pro-rata-explanation pro-rata-explanation--compact">
          <div className="explanation-icon">ℹ️</div>
          <div className="explanation-text">
            Pro-rata participants buy in proportional to ownership; allocation is deducted from the "Other" portion. Edit inline to adjust.
          </div>
        </div>
      )}
    </div>
  )
}

export default PriorInvestorsSection
