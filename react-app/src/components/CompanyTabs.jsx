import { useEffect, useRef, useState } from 'react'

const CompanyTabs = ({
  companies,
  activeCompany,
  onCompanyChange,
  onAddCompany,
  onRemoveCompany,
  onUpdateCompany,
  onDuplicateCompany,
  onLoadExample,
  selectedCompanyIds = [],
  onToggleCompareSelection,
}) => {
  const [editingTab, setEditingTab] = useState(null)
  const [editName, setEditName] = useState('')
  const tabsScrollRef = useRef(null)
  const companyEntries = Object.entries(companies)
  const companyCount = companyEntries.length

  useEffect(() => {
    const tabsScroll = tabsScrollRef.current
    if (!tabsScroll) return

    const activeTab = tabsScroll.querySelector(`[data-company-id="${activeCompany}"]`)
    if (typeof activeTab?.scrollIntoView === 'function') {
      activeTab.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  }, [activeCompany, companyCount])

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
    if (editingTab !== companyId) return // Prevent duplicate saves
    const trimmedName = editName.trim()
    if (trimmedName) {
      onUpdateCompany(companyId, { name: trimmedName })
    }
    // If trimmed name is empty, editing simply cancels (no change to original name)
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
    <div className="company-tabs" data-tour="company-tabs">
      <div className="tabs-container">
        <div className="tabs-scroll" ref={tabsScrollRef}>
          <div className="tabs-list">
            {companyEntries.map(([companyId, company]) => (
              <div
                key={companyId}
                data-company-id={companyId}
                className={`tab ${activeCompany === companyId ? 'active' : ''}`}
                aria-current={activeCompany === companyId ? 'page' : undefined}
                onClick={() => handleTabClick(companyId)}
              >
                {onToggleCompareSelection && (
                  <input
                    type="checkbox"
                    className="tab-compare-checkbox"
                    checked={selectedCompanyIds.includes(companyId)}
                    onChange={() => onToggleCompareSelection(companyId)}
                    onClick={(e) => e.stopPropagation()}
                    title="Include in compare view"
                    aria-label={`Include ${company.name} in compare view`}
                  />
                )}
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
                      {onDuplicateCompany && (
                        <button
                          className="tab-duplicate-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDuplicateCompany(companyId)
                          }}
                          title="Duplicate scenario"
                          aria-label="Duplicate scenario"
                        >
                          ⧉
                        </button>
                      )}
                      {companyCount > 1 && (
                        <button
                          className="tab-remove-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            const name = company.name || 'this scenario'
                            if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
                              onRemoveCompany(companyId)
                            }
                          }}
                          title="Delete scenario"
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
          </div>
        </div>

        <div className="tabs-actions">
          {onLoadExample && (
            <button
              type="button"
              className="load-example-btn"
              onClick={onLoadExample}
              title="Load a populated example scenario that exercises every feature"
            >
              <span className="load-example-icon" aria-hidden="true">★</span>
              <span className="load-example-text">Load Example</span>
            </button>
          )}
          <button className="add-company-btn" onClick={onAddCompany} title="Add new scenario">
            <span className="add-icon">+</span>
            <span className="add-text">Add Scenario</span>
            <div className="btn-glow" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default CompanyTabs
