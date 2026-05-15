import { createPriorInvestor, calculateTotalOwnership } from '../utils/dataStructures'
import { calculateSafeConversions } from '../utils/multiPartyCalculations'
import FormInput from './FormInput'
import { useEffect, useRef, useState } from 'react'

function PriorInvestorsSection({
  priorInvestors = [],
  onUpdate,
  roundSize = 0,
  investorName = '',
  safes = [],
  postMoneyVal = 0,
  investorPortion = 0,
  roundInstrument = 'priced'
}) {
  const [recentRowKey, setRecentRowKey] = useState(null)
  const [removingRows, setRemovingRows] = useState({})
  const [undoNotice, setUndoNotice] = useState(null)
  const [reorderTick, setReorderTick] = useState(0)
  const orderSignatureRef = useRef('')

  const markRecentRow = (key) => {
    setRecentRowKey(key)
    setTimeout(() => {
      setRecentRowKey((current) => (current === key ? null : current))
    }, 850)
  }

  const markRemovingRow = (key) => {
    setRemovingRows(prev => ({ ...prev, [key]: true }))
    setTimeout(() => {
      setRemovingRows(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }, 260)
  }

  const showRowUndo = (label, onUndo) => {
    const notice = { id: Date.now(), label, onUndo }
    setUndoNotice(notice)
    setTimeout(() => {
      setUndoNotice((current) => (current?.id === notice.id ? null : current))
    }, 4200)
  }

  useEffect(() => {
    if (!recentRowKey) return
    const rowId = recentRowKey.replace('prior-', 'prior-name-')
    const id = setTimeout(() => {
      const el = document.getElementById(rowId)
      if (el && typeof el.focus === 'function') {
        el.focus()
        if (typeof el.select === 'function') el.select()
      }
    }, 60)
    return () => clearTimeout(id)
  }, [recentRowKey, priorInvestors])

  const addPriorInvestor = () => {
    const newInvestor = createPriorInvestor('New Investor', 0, false)
    onUpdate([...priorInvestors, newInvestor])
    markRecentRow(`prior-${newInvestor.id}`)
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
    const removed = priorInvestors.find(investor => investor.id === investorId)
    if (!removed) return
    const originalIndex = priorInvestors.findIndex(investor => investor.id === investorId)
    markRemovingRow(`prior-${investorId}`)
    setTimeout(() => {
      onUpdate(priorInvestors.filter(investor => investor.id !== investorId))
      showRowUndo('Investor removed', () => {
        const restored = priorInvestors.filter(investor => investor.id !== investorId)
        restored.splice(Math.max(0, originalIndex), 0, removed)
        onUpdate(restored)
        markRecentRow(`prior-${investorId}`)
      })
    }, 180)
  }

  const getCalculatedProRata = (ownershipPercent) => {
    if (!ownershipPercent || !roundSize) return 0
    return (ownershipPercent / 100) * roundSize
  }

  const totalOwnership = calculateTotalOwnership(priorInvestors)
  const hasProRataInvestors = priorInvestors.some(inv => inv.hasProRataRights)
  const isSafeRound = roundInstrument === 'safe'

  // Build unified row list: prior investors + SAFEs (post-conversion) + new lead
  const preMoneyVal = Math.max(0, (postMoneyVal || 0) - (roundSize || 0))
  const { safeDetails } = calculateSafeConversions(safes, preMoneyVal)

  const priorRows = priorInvestors.map(investor => ({
    kind: 'prior',
    key: `prior-${investor.id}`,
    fdoPct: investor.ownershipPercent || 0,
    investor
  }))

  const safeRows = safeDetails.map(safe => ({
    kind: 'safe',
    key: `safe-${safe.id}`,
    fdoPct: safe.percent || 0,
    safe
  }))

  const leadFdoPct = postMoneyVal > 0 ? (investorPortion / postMoneyVal) * 100 : 0
  const showLeadRow = investorPortion > 0 && postMoneyVal > 0
  const leadRows = showLeadRow
    ? [{ kind: 'lead', key: 'lead', fdoPct: leadFdoPct, name: (investorName || 'Lead').trim() || 'Lead' }]
    : []

  const allRows = [...priorRows, ...safeRows, ...leadRows].sort((a, b) => b.fdoPct - a.fdoPct)
  const orderSignature = allRows.map(row => row.key).join('|')

  useEffect(() => {
    if (orderSignatureRef.current && orderSignatureRef.current !== orderSignature) {
      setReorderTick(v => v + 1)
    }
    orderSignatureRef.current = orderSignature
  }, [orderSignature])

  return (
    <div className="prior-investors-section" data-tour="prior-investors">
      <div className="founders-investors-header">
        <div className="section-title-row">
          <h5 className="section-label" title="Fully-Diluted Ownership — % of company assuming all SAFEs, warrants, and granted options have converted/vested.">
            Investors — sorted by Fully-Diluted Ownership (FDO)
          </h5>
          <div className="section-header-actions">
            {totalOwnership > 0 && (
              <span className="section-total-pill">
                Prior total: <strong>{totalOwnership.toFixed(1)}%</strong>
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

      {allRows.length === 0 ? (
        <div className="no-investors-message">
          No prior investors yet. Add existing cap-table holders to model their dilution and pro-rata participation in this round.
        </div>
      ) : (
        <div className="repeater-table repeater-table--investors">
          <div className="repeater-header">
            <span className="repeater-col repeater-col--name">Name</span>
            <span
              className="repeater-col repeater-col--pct"
              title="Fully-Diluted Ownership — % of company assuming all SAFEs, warrants, and granted options have converted/vested."
            >FDO</span>
            <span
              className="repeater-col repeater-col--prorata"
              title="Pro-rata: right to invest in this round in proportion to existing ownership, preserving stake."
            >Pro-rata</span>
            <span className="repeater-col repeater-col--actions" aria-hidden="true" />
          </div>

          {allRows.map((row, rowIndex) => {
            if (row.kind === 'prior') {
              const investor = row.investor
              const calculatedProRata = getCalculatedProRata(investor.ownershipPercent)
              const hasOverride = investor.proRataOverride != null
              const displayAmount = hasOverride ? investor.proRataOverride : calculatedProRata
              const matchesLead = investor.name === investorName && investor.name
              const allocActive = investor.hasProRataRights && investor.ownershipPercent > 0 && roundSize > 0
              return (
                <div
                  key={row.key}
                  className={[
                    'repeater-row',
                    reorderTick > 0 ? `repeater-row--settle repeater-row--settle-${reorderTick % 2}` : '',
                    recentRowKey === row.key ? 'repeater-row--new' : '',
                    removingRows[row.key] ? 'repeater-row--removing' : '',
                  ].filter(Boolean).join(' ')}
                  style={{ '--row-index': rowIndex }}
                >
                  <div className="repeater-col repeater-col--name">
                    <FormInput
                      label="Name"
                      type="text"
                      value={investor.name}
                      onChange={(value) => updateInvestor(investor.id, 'name', value)}
                      placeholder="Investor name"
                      id={`prior-name-${investor.id}`}
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
                  <div className="repeater-col repeater-col--actions">
                    <button
                      className="remove-investor-btn"
                      onClick={() => removeInvestor(investor.id)}
                      type="button"
                      title="Remove investor"
                    >
                      ×
                    </button>
                  </div>
                  {isSafeRound && investor.hasProRataRights ? (
                    <div className="repeater-row-caption">
                      <span className="repeater-row-caption-text" title="SAFE rounds do not trigger pro-rata participation">
                        Pro-rata suppressed for SAFE round
                      </span>
                    </div>
                  ) : matchesLead ? (
                    <div className="repeater-row-caption">
                      <span className="repeater-row-caption-text" title={`Handled via ${investorName} round portion`}>
                        Pro-rata handled via {investorName} round portion
                      </span>
                    </div>
                  ) : allocActive ? (
                    <div className="repeater-row-caption is-allocation-active">
                      <span className="repeater-row-caption-text">Pro-rata allocation</span>
                      <span className="repeater-row-caption-action">
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
                        {hasOverride && (
                          <button
                            type="button"
                            className="reset-pro-rata-btn"
                            onClick={() => updateInvestor(investor.id, 'proRataOverride', null)}
                            title={`Reset to calculated ($${parseFloat(calculatedProRata.toPrecision(10))}M)`}
                          >
                            ↺
                          </button>
                        )}
                      </span>
                    </div>
                  ) : calculatedProRata > 0 ? (
                    <div className="repeater-row-caption">
                      <span className="repeater-row-caption-text" title="Calculated pro-rata (not enabled). Toggle the checkbox to commit.">
                        Calculated pro-rata: <span key={calculatedProRata} className="calculated-allocation money-roll">${calculatedProRata.toFixed(2)}M</span> (not enabled)
                      </span>
                    </div>
                  ) : null}
                </div>
              )
            }

            if (row.kind === 'safe') {
              const safe = row.safe
              const safeLabel = safe.investorName ? safe.investorName : `#${safe.index}`
              const safeProRata$ = safe.proRata ? getCalculatedProRata(safe.percent) : 0
              const matchesLead = safe.investorName && investorName && safe.investorName.trim() === investorName.trim()
              return (
                <div
                  key={row.key}
                  className={`repeater-row repeater-row--safe ${reorderTick > 0 ? `repeater-row--settle repeater-row--settle-${reorderTick % 2}` : ''}`}
                  style={{ '--row-index': rowIndex }}
                >
                  <div className="repeater-col repeater-col--name">
                    <span className="repeater-readonly-name">
                      <span className="repeater-kind-tag">SAFE</span> {safeLabel}
                    </span>
                  </div>
                  <div className="repeater-col repeater-col--pct">
                    <span className="repeater-readonly-value">{safe.percent.toFixed(2)}%</span>
                  </div>
                  <div className="repeater-col repeater-col--prorata">
                    <label className="repeater-checkbox" title="Pro-rata rights on SAFE (edit in SAFE section)">
                      <input type="checkbox" checked={Boolean(safe.proRata)} readOnly disabled />
                    </label>
                  </div>
                  <div className="repeater-col repeater-col--actions" aria-hidden="true" />
                  {isSafeRound && safe.proRata ? (
                    <div className="repeater-row-caption">
                      <span className="repeater-row-caption-text" title="SAFE rounds do not trigger pro-rata participation">
                        Pro-rata suppressed for SAFE round
                      </span>
                    </div>
                  ) : matchesLead ? (
                    <div className="repeater-row-caption">
                      <span className="repeater-row-caption-text" title={`Handled via ${investorName} round portion`}>
                        Pro-rata handled via {investorName} round portion
                      </span>
                    </div>
                  ) : safe.proRata && safeProRata$ > 0 ? (
                    <div className="repeater-row-caption">
                      <span className="repeater-row-caption-text" title="SAFE pro-rata (edit in SAFE section)">
                        SAFE pro-rata: <span key={safeProRata$} className="calculated-allocation money-roll">${safeProRata$.toFixed(2)}M</span>
                      </span>
                    </div>
                  ) : safeProRata$ > 0 ? (
                    <div className="repeater-row-caption">
                      <span className="repeater-row-caption-text" title="Calculated pro-rata (SAFE pro-rata disabled)">
                        Calculated pro-rata: <span key={safeProRata$} className="calculated-allocation money-roll">${safeProRata$.toFixed(2)}M</span> (disabled)
                      </span>
                    </div>
                  ) : null}
                </div>
              )
            }

            // lead row
            return (
              <div
                key={row.key}
                className={`repeater-row repeater-row--lead ${reorderTick > 0 ? `repeater-row--settle repeater-row--settle-${reorderTick % 2}` : ''}`}
                style={{ '--row-index': rowIndex }}
              >
                <div className="repeater-col repeater-col--name">
                  <span className="repeater-readonly-name">
                    <span className="repeater-kind-tag repeater-kind-tag--lead">LEAD</span> {row.name}
                  </span>
                </div>
                <div className="repeater-col repeater-col--pct">
                  <span className="repeater-readonly-value">{row.fdoPct.toFixed(2)}%</span>
                </div>
                <div className="repeater-col repeater-col--prorata">
                  <span className="repeater-alloc-placeholder" title="Lead is taking the round">—</span>
                </div>
                <div className="repeater-col repeater-col--actions" aria-hidden="true" />
                <div className="repeater-row-caption">
                  <span className="repeater-row-caption-text">Taking the round</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {undoNotice && (
        <div className="repeater-undo-toast" role="status">
          <span>{undoNotice.label}</span>
          <button
            type="button"
            onClick={() => {
              undoNotice.onUndo()
              setUndoNotice(null)
            }}
          >
            Undo
          </button>
        </div>
      )}

      {hasProRataInvestors && (
        <div className="pro-rata-explanation pro-rata-explanation--compact">
          <div className="explanation-icon">ℹ️</div>
          <div className="explanation-text">
            {isSafeRound
              ? 'SAFE rounds model pro-forma dilution without triggering pro-rata participation.'
              : 'Pro-rata participants buy in proportional to ownership; allocation is deducted from the "Other" portion. Edit inline to adjust.'}
          </div>
        </div>
      )}
    </div>
  )
}

export default PriorInvestorsSection
