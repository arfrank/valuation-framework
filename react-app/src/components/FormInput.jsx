import { useId, useState } from 'react'

const FormInput = ({
  label,
  value,
  onChange,
  type = 'number',
  prefix = '',
  suffix = '',
  placeholder = '',
  min,
  max,
  step,
  disabled = false,
  className = '',
  onClear,
  clearable = false,
  id,
  tooltip,
  compact = false,
  ariaLabel,
  onKeyDown,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const [commitPulse, setCommitPulse] = useState(0)

  // Several inputs share a label (e.g. the main round and step 2 both have a
  // "Portion" field), so a label-derived id alone would be duplicated and the
  // second label would focus the first input.
  const autoId = useId()
  const inputId = id || `form-input-${String(label || 'field').toLowerCase().replace(/\s+/g, '-')}-${autoId}`

  const pulseCommit = () => {
    setCommitPulse((v) => v + 1)
  }
  
  const handleChange = (e) => {
    if (type === 'number') {
      const numValue = parseFloat(e.target.value)
      if (isNaN(numValue) && e.target.value !== '') return
    }
    onChange(e.target.value)
  }

  const handleClear = () => {
    if (onClear) {
      onClear()
    } else if (type === 'number') {
      onChange(0)
    } else {
      onChange('')
    }
    pulseCommit()
  }

  const showClearButton = clearable && value && (type === 'number' ? value > 0 : value.length > 0)

  return (
    <div className={`form-input-group ${compact ? 'compact' : ''} ${className}`} title={tooltip || undefined}>
      <div
        className={`form-input-wrapper ${compact ? 'compact' : ''} ${isFocused ? 'focused' : ''} ${disabled ? 'disabled' : ''} ${showClearButton ? 'with-clear' : ''} ${commitPulse > 0 ? `commit-pulse commit-pulse-${commitPulse % 2}` : ''}`}
      >
        {!compact && (
          <label htmlFor={inputId} className="form-input-label" title={tooltip || undefined}>
            {label}
          </label>
        )}

        <div className="form-input-field">
          {showClearButton && (
            <button
              type="button"
              className="form-clear-btn"
              onClick={handleClear}
              tabIndex={-1}
              title={`Clear ${label.toLowerCase()}`}
            >
              ×
            </button>
          )}

          {prefix && <span className="form-input-prefix">{prefix}</span>}

          <input
            id={inputId}
            type={type}
            value={value}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false)
              pulseCommit()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') pulseCommit()
              onKeyDown?.(e)
            }}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className="form-input-control"
            aria-label={compact ? (ariaLabel || label) : undefined}
            {...props}
          />

          {suffix && <span className="form-input-suffix">{suffix}</span>}
        </div>
      </div>
    </div>
  )
}

export default FormInput
