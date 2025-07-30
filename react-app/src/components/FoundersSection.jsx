import { createFounder, calculateTotalOwnership } from '../utils/dataStructures'

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
    if (founders.length <= 1) {
      // Always keep at least one founder
      return
    }
    const updatedFounders = founders.filter(founder => founder.id !== founderId)
    onUpdate(updatedFounders)
  }
  
  const totalOwnership = calculateTotalOwnership(founders)
  
  return (
    <div className="founders-section">
      <div className="section-header">
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
          At least one founder is required. Click "Add Founder" to add founding team members.
        </div>
      ) : (
        <div className="founders-list">
          {founders.map((founder, index) => (
            <div key={founder.id} className="founder-row">
              <div className="founder-basic-info">
                <input
                  type="text"
                  value={founder.name}
                  onChange={(e) => updateFounder(founder.id, 'name', e.target.value)}
                  placeholder={`Founder ${index + 1}`}
                  className="founder-name-input"
                />
                <div className="ownership-input-wrapper">
                  <input
                    type="number"
                    value={founder.ownershipPercent}
                    onChange={(e) => updateFounder(founder.id, 'ownershipPercent', e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                    className="ownership-input"
                  />
                  <span className="unit">%</span>
                </div>
              </div>
              
              <div className="founder-controls">
                {founders.length > 1 && (
                  <button
                    className="remove-founder-btn"
                    onClick={() => removeFounder(founder.id)}
                    type="button"
                    title="Remove founder"
                  >
                    ×
                  </button>
                )}
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