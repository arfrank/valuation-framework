import { createFounder, calculateTotalOwnership } from '../utils/dataStructures'
import FormInput from './FormInput'

function FoundersSection({ founders = [], onUpdate }) {
  const addFounder = () => {
    const newFounder = createFounder('New Founder', 0)
    const updatedFounders = [...founders, newFounder]
    onUpdate(updatedFounders)
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
    const updatedFounders = founders.filter(founder => founder.id !== founderId)
    onUpdate(updatedFounders)
  }
  
  const totalOwnership = calculateTotalOwnership(founders)
  
  return (
    <div className="founders-section">
      <div className="founders-investors-header">
        <div className="section-title-row">
          <h5 className="section-label">Founders</h5>
          <button 
            className="add-founder-btn"
            onClick={addFounder}
            type="button"
          >
            + Add Founder
          </button>
        </div>
        
        {totalOwnership > 0 && (
          <div className="ownership-summary">
            <span className="summary-label">Total Founder Ownership:</span>
            <span className="summary-value">{totalOwnership.toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      {founders.length === 0 ? (
        <div className="no-founders-message">
          No founders added. Click "Add Founder" to add founding team members.
        </div>
      ) : (
        <div className="founders-list">
          {founders.map((founder, index) => (
            <div key={founder.id} className="founder-row">
              <div className="founder-row-header">
                <span className="founder-label">Founder #{index + 1}</span>
                <button
                  className="remove-founder-btn"
                  onClick={() => removeFounder(founder.id)}
                  type="button"
                  title="Remove founder"
                >
                  ×
                </button>
              </div>
              
              <div className="founder-inputs">
                <FormInput
                  label="Name"
                  type="text"
                  value={founder.name}
                  onChange={(value) => updateFounder(founder.id, 'name', value)}
                  placeholder={`Founder ${index + 1}`}
                />
                <FormInput
                  label="Ownership"
                  type="number"
                  value={founder.ownershipPercent}
                  onChange={(value) => updateFounder(founder.id, 'ownershipPercent', value)}
                  suffix="%"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="founders-note">
        <div className="note-icon">💡</div>
        <div className="note-text">
          Founder ownership will be diluted by the new round, SAFEs, and ESOP according to the timing you specify.
          Total pre-round ownership (founders + prior investors) should not exceed 100%.
        </div>
      </div>
    </div>
  )
}

export default FoundersSection