import { useState } from 'react'

const CompanyTabs = ({ companies, activeCompany, onCompanyChange, onAddCompany, onRemoveCompany, onUpdateCompany }) => {
  const [editingTab, setEditingTab] = useState(null)
  const [editName, setEditName] = useState('')

  const handleTabClick = (companyId) => {
    if (editingTab !== companyId) {
      onCompanyChange(companyId)
    }
  }

  const startEditing = (companyId, currentName) => {
    setEditingTab(companyId)
    setEditName(currentName)
  }

  const saveEdit = (companyId) => {
    if (editName.trim()) {
      onUpdateCompany(companyId, { name: editName.trim() })
    }
    setEditingTab(null)
    setEditName('')
  }

  const cancelEdit = () => {
    setEditingTab(null)
    setEditName('')
  }

  const handleKeyPress = (e, companyId) => {
    if (e.key === 'Enter') {
      saveEdit(companyId)
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  return (
    <div className="company-tabs">
      <div className="tabs-container">
        {Object.entries(companies).map(([companyId, company]) => (
          <div 
            key={companyId}
            className={`tab ${activeCompany === companyId ? 'active' : ''}`}
            onClick={() => handleTabClick(companyId)}
          >
            {editingTab === companyId ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => saveEdit(companyId)}
                onKeyDown={(e) => handleKeyPress(e, companyId)}
                className="tab-edit-input"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span className="tab-name">{company.name}</span>
                <div className="tab-actions">
                  <button 
                    className="tab-edit-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      startEditing(companyId, company.name)
                    }}
                    title="Edit name"
                  >
                    ✏️
                  </button>
                  {Object.keys(companies).length > 1 && (
                    <button 
                      className="tab-remove-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveCompany(companyId)
                      }}
                      title="Remove company"
                    >
                      ×
                    </button>
                  )}
                </div>
              </>
            )}
            <div className="tab-indicator" />
            <div className="tab-stripe-pattern" />
          </div>
        ))}
        
        <button className="add-company-btn" onClick={onAddCompany} title="Add new company">
          <span className="add-icon">+</span>
          <span className="add-text">Add Company</span>
          <div className="btn-glow" />
        </button>
      </div>
    </div>
  )
}

export default CompanyTabs