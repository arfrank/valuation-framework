import { useEffect, useLayoutEffect, useRef, useState } from 'react'

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
  tabActivity,
}) => {
  const [editingTab, setEditingTab] = useState(null)
  const [editName, setEditName] = useState('')
  const [confirmedTab, setConfirmedTab] = useState(null)
  const [rejectedTab, setRejectedTab] = useState(null)
  const [visibleTabActivity, setVisibleTabActivity] = useState(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ opacity: 0, width: 0, x: 0 })
  const tabsScrollRef = useRef(null)
  const tabsListRef = useRef(null)
  const editInputRef = useRef(null)
  const companyEntries = Object.entries(companies)
  const companyCount = companyEntries.length
  const compareCount = selectedCompanyIds.filter(id => companies[id]).length

  useEffect(() => {
    const tabsScroll = tabsScrollRef.current
    if (!tabsScroll) return

    const activeTab = tabsScroll.querySelector(`[data-company-id="${activeCompany}"]`)
    if (typeof activeTab?.scrollIntoView === 'function') {
      activeTab.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  }, [activeCompany, companyCount])

  useLayoutEffect(() => {
    const tabsScroll = tabsScrollRef.current
    const tabsList = tabsListRef.current
    if (!tabsScroll || !tabsList) return undefined

    const updateIndicator = () => {
      const activeTab = tabsList.querySelector(`[data-company-id="${activeCompany}"]`)
      if (!activeTab) {
        setIndicatorStyle(prev => ({ ...prev, opacity: 0 }))
        return
      }
      const activeRect = activeTab.getBoundingClientRect()
      const listRect = tabsList.getBoundingClientRect()
      setIndicatorStyle({
        opacity: 1,
        width: activeRect.width,
        x: activeRect.left - listRect.left + tabsScroll.scrollLeft
      })
    }

    updateIndicator()
    tabsScroll.addEventListener('scroll', updateIndicator, { passive: true })
    window.addEventListener('resize', updateIndicator)

    let resizeObserver
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateIndicator)
      resizeObserver.observe(tabsList)
    }

    return () => {
      tabsScroll.removeEventListener('scroll', updateIndicator)
      window.removeEventListener('resize', updateIndicator)
      resizeObserver?.disconnect()
    }
  }, [activeCompany, companyCount, editingTab])

  useEffect(() => {
    if (!editingTab || !editInputRef.current) return
    editInputRef.current.focus()
    editInputRef.current.select()
  }, [editingTab])

  useEffect(() => {
    if (!tabActivity) return undefined
    setVisibleTabActivity(tabActivity)
    const id = setTimeout(() => setVisibleTabActivity(null), 1600)
    return () => clearTimeout(id)
  }, [tabActivity])

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
      setConfirmedTab(companyId)
      setTimeout(() => setConfirmedTab((id) => (id === companyId ? null : id)), 900)
    } else {
      setRejectedTab(companyId)
      setTimeout(() => setRejectedTab((id) => (id === companyId ? null : id)), 900)
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
          <div className="tabs-list" ref={tabsListRef}>
            <div
              className="tabs-glide-indicator"
              style={{
                opacity: indicatorStyle.opacity,
                width: `${indicatorStyle.width}px`,
                transform: `translateX(${indicatorStyle.x}px)`
              }}
              aria-hidden="true"
            />
            {companyEntries.map(([companyId, company]) => (
              <div
                key={companyId}
                data-company-id={companyId}
                className={[
                  'tab',
                  activeCompany === companyId ? 'active' : '',
                  selectedCompanyIds.includes(companyId) ? 'compare-selected' : '',
                  visibleTabActivity?.companyId === companyId ? `tab-activity tab-activity-${visibleTabActivity.type}` : '',
                  confirmedTab === companyId ? 'tab-edit-confirmed' : '',
                  rejectedTab === companyId ? 'tab-edit-rejected' : '',
                ].filter(Boolean).join(' ')}
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
                    ref={editInputRef}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <span className="tab-name" title={company.name}>{company.name}</span>
                    {visibleTabActivity?.companyId === companyId && visibleTabActivity.type === 'duplicate' && (
                      <span className="tab-copy-badge">Copy</span>
                    )}
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
          {compareCount > 0 && (
            <span className="compare-count-chip" aria-label={`${compareCount} scenarios selected for compare`}>
              Compare {compareCount}
            </span>
          )}
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
