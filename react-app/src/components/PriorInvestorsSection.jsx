import { createPriorInvestor, calculateTotalOwnership } from '../utils/dataStructures'
import { calculateSafeConversions } from '../utils/multiPartyCalculations'
import FormInput from './FormInput'

function PriorInvestorsSection({
  priorInvestors = [],
  onUpdate,
  roundSize = 0,
  investorName = '',
  safes = [],
  postMoneyVal = 0,
  investorPortion = 0
}) {
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

  const getCalculatedProRata = (ownershipPercent) => {
    if (!ownershipPercent || !roundSize) return 0
    return (ownershipPercent / 100) * roundSize
  }

  const totalOwnership = calculateTotalOwnership(priorInvestors)
  const hasProRataInvestors = priorInvestors.some(inv => inv.hasProRataRights)

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

  return (
    <div className="prior-investors-section">
      <div className="founders-investors-header">
        <div className="section-title-row">
          <h5 className="section-label">Investors — sorted by FDO</h5>
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
          No investors yet. Click "Add Investor" to include prior round participants.
        </div>
      ) : (
        <div className="repeater-table repeater-table--investors">
          <div className="repeater-header">
            <span className="repeater-col repeater-col--name">Name</span>
            <span className="repeater-col repeater-col--pct">FDO</span>
            <span className="repeater-col repeater-col--prorata">Pro-rata</span>
            <span className="repeater-col repeater-col--alloc">Allocation</span>
            <span className="repeater-col repeater-col--actions" aria-hidden="true" />
          </div>

          {allRows.map(row => {
            if (row.kind === 'prior') {
              const investor = row.investor
              const calculatedProRata = getCalculatedProRata(investor.ownershipPercent)
              const hasOverride = investor.proRataOverride != null
              const displayAmount = hasOverride ? investor.proRataOverride : calculatedProRata
              const matchesLead = investor.name === investorName && investor.name
              const allocActive = investor.hasProRataRights && investor.ownershipPercent > 0 && roundSize > 0
              return (
                <div key={row.key} className="repeater-row">
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
                    {matchesLead ? (
                      <span className="repeater-alloc-placeholder" title={`Handled via ${investorName} round portion`}>
                        via lead
                      </span>
                    ) : allocActive ? (
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
                    ) : calculatedProRata > 0 ? (
                      <span
                        className="repeater-prorata-readonly"
                        title="Calculated pro-rata (not enabled). Toggle the checkbox to commit."
                      >
                        ${calculatedProRata.toFixed(2)}M
                      </span>
                    ) : (
                      <span className="repeater-alloc-placeholder">—</span>
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
            }

            if (row.kind === 'safe') {
              const safe = row.safe
              const safeLabel = safe.investorName ? safe.investorName : `#${safe.index}`
              const safeProRata$ = safe.proRata ? getCalculatedProRata(safe.percent) : 0
              const matchesLead = safe.investorName && investorName && safe.investorName.trim() === investorName.trim()
              return (
                <div key={row.key} className="repeater-row repeater-row--safe">
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
                  <div className="repeater-col repeater-col--alloc">
                    {matchesLead ? (
                      <span className="repeater-alloc-placeholder" title={`Handled via ${investorName} round portion`}>via lead</span>
                    ) : safe.proRata && safeProRata$ > 0 ? (
                      <span className="repeater-prorata-active" title="SAFE pro-rata (edit in SAFE section)">
                        ${safeProRata$.toFixed(2)}M
                      </span>
                    ) : safeProRata$ > 0 ? (
                      <span className="repeater-prorata-readonly" title="Calculated pro-rata (SAFE pro-rata disabled)">
                        ${safeProRata$.toFixed(2)}M
                      </span>
                    ) : (
                      <span className="repeater-alloc-placeholder">—</span>
                    )}
                  </div>
                  <div className="repeater-col repeater-col--actions" aria-hidden="true" />
                </div>
              )
            }

            // lead row
            return (
              <div key={row.key} className="repeater-row repeater-row--lead">
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
                <div className="repeater-col repeater-col--alloc">
                  <span className="repeater-alloc-placeholder" title="Lead is taking the round">taking round</span>
                </div>
                <div className="repeater-col repeater-col--actions" aria-hidden="true" />
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
