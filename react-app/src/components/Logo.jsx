const Logo = ({ size = 32 }) => {
  return (
    <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background circle */}
        <circle cx="16" cy="16" r="15" fill="#3182ce" stroke="#2c5aa0" strokeWidth="2"/>
        
        {/* Chart bars representing growth */}
        <rect x="8" y="20" width="3" height="6" fill="white" rx="1"/>
        <rect x="12" y="16" width="3" height="10" fill="white" rx="1"/>
        <rect x="16" y="12" width="3" height="14" fill="white" rx="1"/>
        <rect x="20" y="8" width="3" height="18" fill="white" rx="1"/>
        
        {/* Dollar sign */}
        <text x="16" y="10" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="bold">$</text>
      </svg>
      
      <div className="logo-text">
        <span className="logo-title">ValuFrame</span>
        <span className="logo-subtitle">Valuation Framework</span>
      </div>
    </div>
  )
}

export default Logo