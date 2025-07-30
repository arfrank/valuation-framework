import { useState } from 'react'

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
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false)
  
  // Generate unique ID if not provided
  const inputId = id || `form-input-${label.toLowerCase().replace(/\s+/g, '-')}`
  
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
  }

  const showClearButton = clearable && value && (type === 'number' ? value > 0 : value.length > 0)

  return (
    <div className={`form-input-group ${className}`}>
      <div className={`form-input-wrapper ${isFocused ? 'focused' : ''} ${disabled ? 'disabled' : ''} ${showClearButton ? 'with-clear' : ''}`}>
        <label htmlFor={inputId} className="form-input-label">
          {label}
        </label>
        
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
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className="form-input-control"
            {...props}
          />
          
          {suffix && <span className="form-input-suffix">{suffix}</span>}
        </div>
      </div>
    </div>
  )
}

export default FormInput