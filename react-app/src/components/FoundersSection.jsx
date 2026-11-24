import { createFounder, calculateTotalOwnership } from '../utils/dataStructures'
import FormInput from './FormInput'
import { useTimeouts } from '../hooks/useTimeouts'
import { useEffect, useRef, useState } from 'react'

function FoundersSection({ founders = [], onUpdate }) {
  const [recentRowKey, setRecentRowKey] = useState(null)
  const [removingRows, setRemovingRows] = useState({})
  const [undoNotice, setUndoNotice] = useState(null)

  // Deferred callbacks (removal timer, Undo) read the latest list and handler
  // so they never write back a stale snapshot over newer edits.
  const listRef = useRef(founders)
  listRef.current = founders
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  // Cleared on unmount, so a pending removal can't fire against another company.
  const schedule = useTimeouts()

  const markRecentRow = (key) => {
    setRecentRowKey(key)
    schedule(() => {
      setRecentRowKey((current) => (current === key ? null : current))
    }, 850)
  }

  const markRemovingRow = (key) => {
    setRemovingRows(prev => ({ ...prev, [key]: true }))
    schedule(() => {
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
    schedule(() => {
      setUndoNotice((current) => (current?.id === notice.id ? null : current))
    }, 4200)
  }

  // Focus the new row's name once. This must not re-run as the list changes,
  // or it re-selects the field on every keystroke and typed characters are lost.
  useEffect(() => {
    if (!recentRowKey) return
    const rowId = recentRowKey.replace('founder-', 'founder-name-')
    const id = setTimeout(() => {
      const el = document.getElementById(rowId)
      if (el && typeof el.focus === 'function') {
        el.focus()
        if (typeof el.select === 'function') el.select()
      }
    }, 60)
    return () => clearTimeout(id)
  }, [recentRowKey])

  const addFounder = () => {
    const newFounder = createFounder('New Founder', 0)
    onUpdate([...founders, newFounder])
    markRecentRow(`founder-${newFounder.id}`)
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
    const removed = founders.find(founder => founder.id === founderId)
    if (!removed) return
    const originalIndex = founders.findIndex(founder => founder.id === founderId)
    markRemovingRow(`founder-${founderId}`)
    schedule(() => {
      onUpdateRef.current(listRef.current.filter(founder => founder.id !== founderId))
      showRowUndo('Founder removed', () => {
        const restored = listRef.current.filter(founder => founder.id !== founderId)
        restored.splice(Math.min(Math.max(0, originalIndex), restored.length), 0, removed)
        onUpdateRef.current(restored)
        markRecentRow(`founder-${founderId}`)
      })
    }, 180)
  }

  const totalOwnership = calculateTotalOwnership(founders)

  return (
    <div className="founders-section">
      <div className="founders-investors-header">
        <div className="section-title-row">
          <h5 className="section-label">Founders</h5>
          <div className="section-header-actions">
            {totalOwnership > 0 && (
              <span className="section-total-pill">
                Total: <strong>{totalOwnership.toFixed(1)}%</strong>
              </span>
            )}
            <button
              className="add-founder-btn"
              onClick={addFounder}
              type="button"
            >
              + Add Founder
            </button>
          </div>
        </div>
      </div>

      {founders.length === 0 ? (
        <div className="no-founders-message">
          No founders yet. Add the founding team to track each person’s dilution through the round.
        </div>
      ) : (
        <div className="repeater-table repeater-table--founders">
          <div className="repeater-header">
            <span className="repeater-col repeater-col--name">Name</span>
            <span className="repeater-col repeater-col--pct">Ownership</span>
            <span className="repeater-col repeater-col--actions" aria-hidden="true" />
          </div>
          {founders.map((founder, index) => (
            <div
              key={founder.id}
              className={[
                'repeater-row',
                recentRowKey === `founder-${founder.id}` ? 'repeater-row--new' : '',
                removingRows[`founder-${founder.id}`] ? 'repeater-row--removing' : '',
              ].filter(Boolean).join(' ')}
            >
              <div className="repeater-col repeater-col--name">
                <FormInput
                  label="Name"
                  type="text"
                  value={founder.name}
                  onChange={(value) => updateFounder(founder.id, 'name', value)}
                  placeholder={`Founder ${index + 1}`}
                  id={`founder-name-${founder.id}`}
                  compact
                />
              </div>
              <div className="repeater-col repeater-col--pct">
                <FormInput
                  label="Ownership"
                  type="number"
                  value={founder.ownershipPercent}
                  onChange={(value) => updateFounder(founder.id, 'ownershipPercent', value)}
                  suffix="%"
                  min="0"
                  max="100"
                  step="0.1"
                  compact
                />
              </div>
              <div className="repeater-col repeater-col--actions">
                <button
                  className="remove-founder-btn"
                  onClick={() => removeFounder(founder.id)}
                  type="button"
                  title="Remove founder"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
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

      <div className="founders-note founders-note--compact">
        <div className="note-icon">💡</div>
        <div className="note-text">
          Founders are diluted by the new round, SAFEs, and ESOP per the timing you pick. Pre-round (founders + prior investors) should total ≤ 100%.
        </div>
      </div>
    </div>
  )
}

export default FoundersSection
