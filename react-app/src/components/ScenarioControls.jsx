import { useState } from 'react'
import { buildScenarioOffsets, formatScenarioOffsetValue, normalizeScenarioOffsets } from '../utils/scenarioOffsets'

const PRESETS = [
  { label: '±10', max: 10 },
  { label: '±20', max: 20 },
  { label: '±30', max: 30 }
]

const formatOffset = (n) => {
  const value = formatScenarioOffsetValue(Math.abs(n))
  if (n > 0) return `+${value}%`
  return `−${value}%`
}

const isSameBand = (a, b) => JSON.stringify(a) === JSON.stringify(b)

const ScenarioControls = ({ offsets = [], onChange }) => {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const currentBand = normalizeScenarioOffsets(offsets)

  const applyPreset = (max) => {
    onChange(buildScenarioOffsets(max))
  }

  const commitDraft = () => {
    const parsed = Number(draft)
    if (Number.isFinite(parsed)) {
      const max = Math.abs(parsed)
      if (max > 0 && max < 100) {
        onChange(buildScenarioOffsets(max))
      }
    }
    setDraft('')
    setAdding(false)
  }

  const cancelDraft = () => {
    setDraft('')
    setAdding(false)
  }

  return (
    <div className="scenario-controls" role="group" aria-label="Sensitivity scenarios">
      <span className="scenario-controls-label">Sensitivity</span>
      <div className="scenario-pills">
        {currentBand.map(n => {
          const direction = n < 0 ? 'down' : 'up'
          return (
            <span
              key={n}
              className={`scenario-pill scenario-pill-${direction} active`}
            >
              {formatOffset(n)}
            </span>
          )
        })}
        {adding ? (
          <span className="scenario-pill-add-input">
            <input
              type="number"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitDraft() }
                if (e.key === 'Escape') { e.preventDefault(); cancelDraft() }
              }}
              placeholder="max %"
              step="2.5"
            />
          </span>
        ) : (
          <button
            type="button"
            className="scenario-pill scenario-pill-add"
            onClick={() => setAdding(true)}
            aria-label="Set custom max delta"
          >
            +
          </button>
        )}
      </div>
      <div className="scenario-presets" aria-label="Range presets">
        {PRESETS.map(p => {
          const active = isSameBand(currentBand, buildScenarioOffsets(p.max))
          return (
            <button
              key={p.label}
              type="button"
              className={`scenario-preset${active ? ' active' : ''}`}
              onClick={() => applyPreset(p.max)}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ScenarioControls
