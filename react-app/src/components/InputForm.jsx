import { useState, useEffect } from 'react'

const InputForm = ({ company, onUpdate }) => {
  const [values, setValues] = useState({
    postMoneyVal: 13,
    roundSize: 3,
    lsvpPortion: 2.75,
    otherPortion: 0.25
  })

  useEffect(() => {
    if (company) {
      setValues(company)
    }
  }, [company])

  const handleChange = (field, value) => {
    const numValue = parseFloat(value) || 0
    const newValues = { ...values, [field]: numValue }
    
    // Auto-calculate other portion when round size or LSVP portion changes
    if (field === 'roundSize' || field === 'lsvpPortion') {
      if (field === 'roundSize') {
        newValues.otherPortion = Math.max(0, numValue - values.lsvpPortion)
      } else if (field === 'lsvpPortion') {
        newValues.otherPortion = Math.max(0, values.roundSize - numValue)
      }
    }
    
    setValues(newValues)
    onUpdate(newValues)
  }

  const preMoneyVal = values.postMoneyVal - values.roundSize

  return (
    <div className="input-form">
      <div className="form-header">
        <h3>Investment Parameters</h3>
        <div className="calculated-pre-money">
          Pre-Money: <span className="value">${preMoneyVal.toFixed(1)}M</span>
        </div>
      </div>

      <div className="input-grid">
        <div className="input-group">
          <label htmlFor="post-money">Post-Money Valuation</label>
          <div className="input-wrapper">
            <span className="currency">$</span>
            <input
              id="post-money"
              type="number"
              value={values.postMoneyVal}
              onChange={(e) => handleChange('postMoneyVal', e.target.value)}
              step="0.1"
              min="0"
            />
            <span className="unit">M</span>
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="round-size">Round Size</label>
          <div className="input-wrapper">
            <span className="currency">$</span>
            <input
              id="round-size"
              type="number"
              value={values.roundSize}
              onChange={(e) => handleChange('roundSize', e.target.value)}
              step="0.1"
              min="0"
            />
            <span className="unit">M</span>
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="lsvp-portion">LSVP Portion</label>
          <div className="input-wrapper">
            <span className="currency">$</span>
            <input
              id="lsvp-portion"
              type="number"
              value={values.lsvpPortion}
              onChange={(e) => handleChange('lsvpPortion', e.target.value)}
              step="0.01"
              min="0"
              max={values.roundSize}
            />
            <span className="unit">M</span>
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="other-portion">Other Portion</label>
          <div className="input-wrapper">
            <span className="currency">$</span>
            <input
              id="other-portion"
              type="number"
              value={values.otherPortion}
              onChange={(e) => handleChange('otherPortion', e.target.value)}
              step="0.01"
              min="0"
            />
            <span className="unit">M</span>
          </div>
        </div>
      </div>

      <div className="validation-info">
        {(values.lsvpPortion + values.otherPortion).toFixed(2) !== values.roundSize.toFixed(2) && (
          <div className="warning">
            ⚠️ LSVP + Other ({(values.lsvpPortion + values.otherPortion).toFixed(2)}M) doesn't equal Round Size ({values.roundSize.toFixed(2)}M)
          </div>
        )}
      </div>
    </div>
  )
}

export default InputForm