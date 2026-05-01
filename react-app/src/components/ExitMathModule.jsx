import { useMemo, useState } from 'react'
import { calculateExitReturnsForValues, resolveDilutions } from '../utils/exitMath'
import FormInput from './FormInput'

const DEFAULT_EXIT = {
  exitValuations: [100, 500, 1000, 2000, 5000],
  numRounds: 3,
  uniformDilution: 20,
  perRoundOverrides: [],
}

const PRESET_EXITS = [100, 500, 1000, 2000, 5000, 10000]

function formatMoney(valueM) {
  if (!Number.isFinite(valueM)) return '—'
  if (Math.abs(valueM) >= 1000) {
    return `$${(valueM / 1000).toFixed(2)}B`
  }
  return `$${valueM.toFixed(2)}M`
}

function formatPreset(valueM) {
  return valueM >= 1000 ? `${valueM / 1000}B` : `${valueM}M`
}

function sanitizeValuations(list) {
  if (!Array.isArray(list)) return []
  return list
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && v > 0)
}

const ExitMathModule = ({ baseScenario, investorName = 'US', exitMath, onUpdate, companyName }) => {
  const [showOverrides, setShowOverrides] = useState(false)

  const state = {
    ...DEFAULT_EXIT,
    ...(exitMath || {}),
  }
  const { numRounds, uniformDilution } = state
  const exitValuations = Array.isArray(state.exitValuations) ? state.exitValuations : []
  const perRoundOverrides = Array.isArray(state.perRoundOverrides) ? state.perRoundOverrides : []

  const initialCheck = baseScenario?.combinedInvestor?.totalNewInvestment ?? baseScenario?.investorAmount ?? 0
  const currentOwnership = baseScenario?.combinedInvestor?.totalOwnership ?? baseScenario?.investorPercent ?? 0

  const dilutions = useMemo(
    () => resolveDilutions(numRounds, uniformDilution, perRoundOverrides),
    [numRounds, uniformDilution, perRoundOverrides]
  )

  const { finalOwnership, outcomes, perRound } = useMemo(
    () => calculateExitReturnsForValues({ initialCheck, currentOwnership, dilutions, exitValuations }),
    [initialCheck, currentOwnership, dilutions, exitValuations]
  )

  const update = (patch) => {
    if (onUpdate) onUpdate({ ...state, ...patch })
  }

  const handleNumRoundsChange = (raw) => {
    const n = Math.max(0, Math.min(10, Math.floor(Number(raw) || 0)))
    const trimmed = (perRoundOverrides || []).slice(0, n)
    while (trimmed.length < n) trimmed.push(null)
    update({ numRounds: n, perRoundOverrides: trimmed })
  }

  const handleOverrideChange = (i, raw) => {
    const next = [...perRoundOverrides]
    while (next.length <= i) next.push(null)
    if (raw === '' || raw === null || raw === undefined) {
      next[i] = null
    } else {
      const n = Number(raw)
      next[i] = Number.isFinite(n) ? n : null
    }
    update({ perRoundOverrides: next })
  }

  const resetOverrides = () => {
    update({ perRoundOverrides: [] })
  }

  const handleValuationChange = (i, raw) => {
    const next = [...exitValuations]
    const n = Number(raw)
    next[i] = Number.isFinite(n) ? n : 0
    update({ exitValuations: next })
  }

  const handleRemoveValuation = (i) => {
    const next = exitValuations.filter((_, idx) => idx !== i)
    update({ exitValuations: next })
  }

  const handleAddValuation = () => {
    const last = exitValuations[exitValuations.length - 1]
    const seed = Number.isFinite(last) && last > 0 ? last * 2 : 1000
    update({ exitValuations: [...exitValuations, seed] })
  }

  const handlePresetClick = (value) => {
    if (exitValuations.some((v) => Number(v) === value)) return
    const next = [...exitValuations, value].sort((a, b) => Number(a) - Number(b))
    update({ exitValuations: next })
  }

  const hasData = baseScenario && initialCheck > 0
  const sanitizedCount = sanitizeValuations(exitValuations).length

  return (
    <div className="exit-math-module">
      <div className="exit-math-header">
        <h3>{companyName ? `Exit Math — ${companyName}` : 'Exit Math'}</h3>
        <span className="exit-math-subtitle">{investorName} returns at exit</span>
      </div>

      <div className="exit-math-inputs">
        <div className="exit-math-scenarios">
          <div className="exit-math-scenarios-label">Exit Scenarios</div>
          <div className="exit-math-scenarios-list">
            {exitValuations.map((value, i) => (
              <div className="exit-math-scenario-row" key={i}>
                <span className="exit-math-scenario-prefix">$</span>
                <input
                  type="number"
                  className="exit-math-scenario-input"
                  value={value}
                  min="0"
                  step="100"
                  onChange={(e) => handleValuationChange(i, e.target.value)}
                  aria-label={`Exit valuation ${i + 1} in millions`}
                />
                <span className="exit-math-scenario-suffix">M</span>
                <span className="exit-math-scenario-hint">{formatMoney(Number(value) || 0)}</span>
                <button
                  type="button"
                  className="exit-math-scenario-remove"
                  onClick={() => handleRemoveValuation(i)}
                  aria-label={`Remove exit scenario ${i + 1}`}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="exit-math-scenarios-actions">
            <button
              type="button"
              className="exit-math-scenario-add"
              onClick={handleAddValuation}
            >
              + Add scenario
            </button>
            <div className="exit-math-presets">
              {PRESET_EXITS.map((v) => {
                const present = exitValuations.some((x) => Number(x) === v)
                return (
                  <button
                    key={v}
                    type="button"
                    className={`exit-math-preset-chip${present ? ' is-present' : ''}`}
                    disabled={present}
                    onClick={() => handlePresetClick(v)}
                    title={present ? 'Already added' : `Add ${formatPreset(v)}`}
                  >
                    {formatPreset(v)}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <FormInput
          label="# Rounds"
          type="number"
          value={numRounds}
          onChange={handleNumRoundsChange}
          min="0"
          max="10"
          step="1"
        />

        <FormInput
          label="Dilution / Round"
          type="number"
          value={uniformDilution}
          onChange={(value) => update({ uniformDilution: Number(value) || 0 })}
          suffix="%"
          min="0"
          max="100"
          step="1"
        />

        {numRounds > 0 && (
          <div className="exit-math-overrides">
            <button
              type="button"
              className="toggle-advanced-btn"
              onClick={() => setShowOverrides((v) => !v)}
            >
              <span className={`chevron-icon${showOverrides ? '' : ' is-collapsed'}`}>▼</span> Per-round overrides
            </button>
            <div
              className={`exit-math-overrides-wrapper${showOverrides ? '' : ' is-collapsed'}`}
              aria-hidden={!showOverrides}
              {...(!showOverrides ? { inert: true } : {})}
            >
              <div className="exit-math-overrides-grid">
                {Array.from({ length: numRounds }).map((_, i) => (
                  <FormInput
                    key={i}
                    label={`Round ${i + 1}`}
                    type="number"
                    value={perRoundOverrides[i] ?? ''}
                    onChange={(value) => handleOverrideChange(i, value)}
                    suffix="%"
                    placeholder={`${uniformDilution}`}
                    min="0"
                    max="100"
                    step="1"
                  />
                ))}
                <button type="button" className="exit-math-reset-btn" onClick={resetOverrides}>
                  Reset to uniform
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {hasData ? (
        <>
          <div className="investor-summary exit-math-summary">
            <div className="investor-summary-header">Projection</div>
            <div className="analytics-row">
              <span className="analytics-label">Initial check</span>
              <span className="analytics-value">{formatMoney(initialCheck)}</span>
            </div>
            <div className="analytics-row">
              <span className="analytics-label">Starting ownership</span>
              <span className="analytics-value">{currentOwnership.toFixed(2)}%</span>
            </div>
            <div className="analytics-row">
              <span className="analytics-label">Final ownership</span>
              <span className="analytics-value">{finalOwnership.toFixed(2)}%</span>
            </div>
          </div>

          {sanitizedCount > 0 ? (
            <div className="exit-math-outcomes">
              <div className="exit-math-outcomes-header">Outcomes by exit value</div>
              <table>
                <thead>
                  <tr>
                    <th>Exit</th>
                    <th>Proceeds</th>
                    <th>MOIC</th>
                  </tr>
                </thead>
                <tbody>
                  {outcomes.map((o, i) => (
                    <tr key={i}>
                      <td>{formatMoney(o.exitValuation)}</td>
                      <td>{formatMoney(o.exitProceeds)}</td>
                      <td>{o.moic.toFixed(2)}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="exit-math-empty">Add an exit scenario to see outcomes.</div>
          )}

          {perRound.length > 0 && (
            <div className="exit-math-breakdown">
              <div className="exit-math-breakdown-header">Dilution path</div>
              <table>
                <thead>
                  <tr>
                    <th>Round</th>
                    <th>Dilution</th>
                    <th>Ownership</th>
                  </tr>
                </thead>
                <tbody>
                  {perRound.map((r) => (
                    <tr key={r.round}>
                      <td>R{r.round}</td>
                      <td>{(r.dilution * 100).toFixed(1)}%</td>
                      <td>{r.ownership.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="exit-math-empty">
          Enter a valid base scenario to see exit math.
        </div>
      )}
    </div>
  )
}

export default ExitMathModule
