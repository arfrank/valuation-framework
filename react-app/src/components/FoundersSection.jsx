import { createFounder, calculateTotalOwnership } from '../utils/dataStructures'
import FormInput from './FormInput'

function FoundersSection({ founders = [], onUpdate }) {
  const addFounder = () => {
    const newFounder = createFounder('New Founder', 0)
    onUpdate([...founders, newFounder])
  }

  const updateFounder = (founderId, field, value) => {
    const updatedFounders = founders.map(founder => {
      if (founder.id === founderId) {
        return {
          ...founder,
          [field]: field === 'ownershipPercent' ? Math.max(0, Math.min(100, Number(value) || 0)) : value
        }
      }
      return founder
    })
    onUpdate(updatedFounders)
  }

  const removeFounder = (founderId) => {
    onUpdate(founders.filter(founder => founder.id !== founderId))
  }

  const totalOwnership = calculateTotalOwnership(founders)

  return (
    <div className="founders-section">
      <div className="founders-investors-header">
        <div className="section-title-row">
          <h5 className="section-label">Founders</h5>
          <div className="section-header-actions">
            {totalOwnership > 0 && (
              <span className="section-total-pill">
                Total: <strong>{totalOwnership.toFixed(1)}%</strong>
              </span>
            )}
            <button
              className="add-founder-btn"
              onClick={addFounder}
              type="button"
            >
              + Add Founder
            </button>
          </div>
        </div>
      </div>

      {founders.length === 0 ? (
        <div className="no-founders-message">
          No founders added. Click "Add Founder" to add founding team members.
        </div>
      ) : (
        <div className="repeater-table repeater-table--founders">
          <div className="repeater-header">
            <span className="repeater-col repeater-col--name">Name</span>
            <span className="repeater-col repeater-col--pct">Ownership</span>
            <span className="repeater-col repeater-col--actions" aria-hidden="true" />
          </div>
          {founders.map((founder, index) => (
            <div key={founder.id} className="repeater-row">
              <div className="repeater-col repeater-col--name">
                <FormInput
                  label="Name"
                  type="text"
                  value={founder.name}
                  onChange={(value) => updateFounder(founder.id, 'name', value)}
                  placeholder={`Founder ${index + 1}`}
                  compact
                />
              </div>
              <div className="repeater-col repeater-col--pct">
                <FormInput
                  label="Ownership"
                  type="number"
                  value={founder.ownershipPercent}
                  onChange={(value) => updateFounder(founder.id, 'ownershipPercent', value)}
                  suffix="%"
                  min="0"
                  max="100"
                  step="0.1"
                  compact
                />
              </div>
              <div className="repeater-col repeater-col--actions">
                <button
                  className="remove-founder-btn"
                  onClick={() => removeFounder(founder.id)}
                  type="button"
                  title="Remove founder"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="founders-note founders-note--compact">
        <div className="note-icon">💡</div>
        <div className="note-text">
          Founders are diluted by the new round, SAFEs, and ESOP per the timing you pick. Pre-round (founders + prior investors) should total ≤ 100%.
        </div>
      </div>
    </div>
  )
}

export default FoundersSection
