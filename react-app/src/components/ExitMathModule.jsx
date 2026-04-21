import { useMemo, useState } from 'react'
import { calculateExitReturn, resolveDilutions } from '../utils/exitMath'
import FormInput from './FormInput'

const DEFAULT_EXIT = {
  exitValuation: 5000, // $5B in $M
  numRounds: 3,
  uniformDilution: 20,
  perRoundOverrides: [],
}

function formatMoney(valueM) {
  if (!Number.isFinite(valueM)) return '—'
  if (Math.abs(valueM) >= 1000) {
    return `$${(valueM / 1000).toFixed(2)}B`
  }
  return `$${valueM.toFixed(2)}M`
}

const ExitMathModule = ({ baseScenario, investorName = 'US', exitMath, onUpdate }) => {
  const [showOverrides, setShowOverrides] = useState(false)

  const state = {
    ...DEFAULT_EXIT,
    ...(exitMath || {}),
  }
  const { exitValuation, numRounds, uniformDilution } = state
  const perRoundOverrides = Array.isArray(state.perRoundOverrides) ? state.perRoundOverrides : []

  const initialCheck = baseScenario?.combinedInvestor?.totalNewInvestment ?? baseScenario?.investorAmount ?? 0
  const currentOwnership = baseScenario?.combinedInvestor?.totalOwnership ?? baseScenario?.investorPercent ?? 0

  const dilutions = useMemo(
    () => resolveDilutions(numRounds, uniformDilution, perRoundOverrides),
    [numRounds, uniformDilution, perRoundOverrides]
  )

  const { finalOwnership, exitProceeds, moic, perRound } = useMemo(
    () => calculateExitReturn({ initialCheck, currentOwnership, dilutions, exitValuation }),
    [initialCheck, currentOwnership, dilutions, exitValuation]
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

  const hasData = baseScenario && initialCheck > 0

  return (
    <div className="exit-math-module">
      <div className="exit-math-header">
        <h3>Exit Math</h3>
        <span className="exit-math-subtitle">{investorName} returns at exit</span>
      </div>

      <div className="exit-math-inputs">
        <div className="exit-math-input-group">
          <FormInput
            label="Exit Valuation"
            type="number"
            value={exitValuation}
            onChange={(value) => update({ exitValuation: Number(value) || 0 })}
            prefix="$"
            suffix="M"
            min="0"
            step="100"
          />
          <span className="exit-math-hint">{formatMoney(exitValuation)}</span>
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
              {showOverrides ? '▼' : '▶'} Per-round overrides
            </button>
            {showOverrides && (
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
            )}
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
            <div className="analytics-row">
              <span className="analytics-label">Exit proceeds</span>
              <span className="analytics-value">{formatMoney(exitProceeds)}</span>
            </div>
            <div className="analytics-row investor-summary-total">
              <span className="analytics-label">MOIC</span>
              <span className="analytics-value">{moic.toFixed(2)}x</span>
            </div>
          </div>

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
