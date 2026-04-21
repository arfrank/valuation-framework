import { useState } from 'react'

const PRESETS = [
  { label: '±10', offsets: [-10, 10] },
  { label: '±20', offsets: [-20, -10, 10, 20] },
  { label: '±30', offsets: [-30, -20, -10, 10, 20, 30] }
]

const formatOffset = (n) => {
  if (n > 0) return `+${n}%`
  return `−${Math.abs(n)}%`
}

const arraysEqual = (a, b) => {
  if (a.length !== b.length) return false
  const sa = [...a].sort((x, y) => x - y)
  const sb = [...b].sort((x, y) => x - y)
  return sa.every((v, i) => v === sb[i])
}

const ScenarioControls = ({ offsets = [], onChange }) => {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const sorted = [...offsets].sort((a, b) => a - b)
  const allKnown = Array.from(new Set([...sorted, -30, -20, -10, 10, 20, 30])).sort((a, b) => a - b)

  const toggle = (n) => {
    const next = sorted.includes(n) ? sorted.filter(x => x !== n) : [...sorted, n]
    onChange(next.sort((a, b) => a - b))
  }

  const applyPreset = (presetOffsets) => {
    onChange([...presetOffsets])
  }

  const commitDraft = () => {
    const parsed = Number(draft)
    if (Number.isFinite(parsed) && parsed !== 0 && parsed > -100) {
      const rounded = Math.round(parsed)
      if (!sorted.includes(rounded)) {
        onChange([...sorted, rounded].sort((a, b) => a - b))
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
        {allKnown.map(n => {
          const active = sorted.includes(n)
          const direction = n < 0 ? 'down' : 'up'
          return (
            <button
              key={n}
              type="button"
              className={`scenario-pill scenario-pill-${direction}${active ? ' active' : ''}`}
              onClick={() => toggle(n)}
              aria-pressed={active}
            >
              {formatOffset(n)}
            </button>
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
              placeholder="±%"
              step="5"
            />
          </span>
        ) : (
          <button
            type="button"
            className="scenario-pill scenario-pill-add"
            onClick={() => setAdding(true)}
            aria-label="Add custom offset"
          >
            +
          </button>
        )}
      </div>
      <div className="scenario-presets" aria-label="Range presets">
        {PRESETS.map(p => {
          const active = arraysEqual(sorted, p.offsets)
          return (
            <button
              key={p.label}
              type="button"
              className={`scenario-preset${active ? ' active' : ''}`}
              onClick={() => applyPreset(p.offsets)}
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
