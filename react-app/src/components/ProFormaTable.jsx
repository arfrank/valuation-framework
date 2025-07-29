import { useState } from 'react'
import { exportProFormaToCSV } from '../utils/proFormaCalculations'

const ProFormaTable = ({ proFormaResults, onExport }) => {
  const [showDetails, setShowDetails] = useState(true)

  if (!proFormaResults || !proFormaResults.isValid) {
    return (
      <div className="pro-forma-table error">
        <h3>Pro-Forma Cap Table</h3>
        <div className="error-message">
          {proFormaResults?.errors?.length > 0 ? (
            <ul>
              {proFormaResults.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          ) : (
            <p>Unable to calculate pro-forma. Please check your inputs.</p>
          )}
        </div>
      </div>
    )
  }

  const handleExportCSV = () => {
    const csvContent = exportProFormaToCSV(proFormaResults)
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pro-forma-cap-table.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const formatPercent = (value) => `${value.toFixed(2)}%`
  const formatDollar = (value) => `$${value.toFixed(2)}M`
  const formatShares = (value) => value.toLocaleString()

  return (
    <div className="pro-forma-table">
      <div className="table-header">
        <h3>Pro-Forma Cap Table</h3>
        <div className="table-controls">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="toggle-details"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
          <button onClick={handleExportCSV} className="export-button">
            Export CSV
          </button>
        </div>
      </div>

      {/* Round Summary */}
      <div className="round-summary">
        <div className="summary-item">
          <span className="label">Pre-Money Valuation:</span>
          <span className="value">{formatDollar(proFormaResults.preMoneyVal)}</span>
        </div>
        <div className="summary-item">
          <span className="label">Round Size:</span>
          <span className="value">{formatDollar(proFormaResults.roundSize)}</span>
        </div>
        <div className="summary-item">
          <span className="label">Post-Money Valuation:</span>
          <span className="value">{formatDollar(proFormaResults.postMoneyVal)}</span>
        </div>
        <div className="summary-item">
          <span className="label">Share Price:</span>
          <span className="value">${proFormaResults.sharePrice.toFixed(4)}</span>
        </div>
        <div className="summary-item">
          <span className="label">Total Shares Outstanding:</span>
          <span className="value">{formatShares(proFormaResults.totalSharesOutstanding)}</span>
        </div>
      </div>

      {/* Main Cap Table */}
      <div className="cap-table">
        <table>
          <thead>
            <tr>
              <th>Stakeholder</th>
              <th>Type</th>
              {showDetails && <th>Pre-Round Shares</th>}
              {showDetails && <th>Pre-Round %</th>}
              <th>Investment</th>
              {showDetails && <th>New Shares</th>}
              <th>Post-Round Shares</th>
              <th>Post-Round %</th>
              {showDetails && <th>Dilution</th>}
            </tr>
          </thead>
          <tbody>
            {/* Founders */}
            {proFormaResults.foundersDetail.map((founder, index) => (
              <tr key={`founder-${index}`} className="founder-row">
                <td>{founder.name}</td>
                <td>Founder</td>
                {showDetails && <td>{formatShares(founder.preRoundShares)}</td>}
                {showDetails && <td>{formatPercent(founder.preRoundPercent)}</td>}
                <td>-</td>
                {showDetails && <td>-</td>}
                <td>{formatShares(founder.postRoundShares)}</td>
                <td className="ownership-percent">{formatPercent(founder.postRoundPercent)}</td>
                {showDetails && (
                  <td className={founder.dilution > 0 ? 'dilution negative' : 'dilution'}>
                    {founder.dilution > 0 ? '-' : ''}{formatPercent(Math.abs(founder.dilution))}
                  </td>
                )}
              </tr>
            ))}

            {/* Existing Investors */}
            {proFormaResults.existingInvestorsDetail.map((investor, index) => (
              <tr key={`existing-${index}`} className="existing-investor-row">
                <td>{investor.name}</td>
                <td>Existing Investor</td>
                {showDetails && <td>{formatShares(investor.preRoundShares)}</td>}
                {showDetails && <td>{formatPercent(investor.preRoundPercent)}</td>}
                <td>{investor.proRataInvestment > 0 ? formatDollar(investor.proRataInvestment) : '-'}</td>
                {showDetails && (
                  <td>{investor.proRataShares > 0 ? formatShares(investor.proRataShares) : '-'}</td>
                )}
                <td>{formatShares(investor.totalShares)}</td>
                <td className="ownership-percent">{formatPercent(investor.postRoundPercent)}</td>
                {showDetails && (
                  <td className={investor.dilution > 0 ? 'dilution negative' : 'dilution'}>
                    {investor.dilution > 0 ? '-' : ''}{formatPercent(Math.abs(investor.dilution))}
                  </td>
                )}
              </tr>
            ))}

            {/* New Investor */}
            <tr className="new-investor-row highlight">
              <td>{proFormaResults.newInvestor.name}</td>
              <td>New Investor</td>
              {showDetails && <td>-</td>}
              {showDetails && <td>-</td>}
              <td className="investment-amount">{formatDollar(proFormaResults.newInvestor.investment)}</td>
              {showDetails && <td>{formatShares(proFormaResults.newInvestor.shares)}</td>}
              <td>{formatShares(proFormaResults.newInvestor.shares)}</td>
              <td className="ownership-percent highlight">{formatPercent(proFormaResults.newInvestor.percent)}</td>
              {showDetails && <td>-</td>}
            </tr>

            {/* ESOP Pool */}
            {proFormaResults.esopDetail.totalShares > 0 && (
              <tr className="esop-row">
                <td>ESOP Pool</td>
                <td>Employee Options</td>
                {showDetails && <td>{formatShares(proFormaResults.esopDetail.preCloseShares)}</td>}
                {showDetails && <td>-</td>}
                <td>{proFormaResults.esopDetail.poolValue > 0 ? formatDollar(proFormaResults.esopDetail.poolValue) : '-'}</td>
                {showDetails && <td>{formatShares(proFormaResults.esopDetail.inRoundShares)}</td>}
                <td>{formatShares(proFormaResults.esopDetail.totalShares)}</td>
                <td className="ownership-percent">{formatPercent(proFormaResults.esopDetail.totalPercent)}</td>
                {showDetails && <td>-</td>}
              </tr>
            )}

            {/* SAFEs */}
            {proFormaResults.safesDetail.map((safe, index) => (
              <tr key={`safe-${index}`} className="safe-row">
                <td>SAFE #{index + 1}</td>
                <td>SAFE Note</td>
                {showDetails && <td>-</td>}
                {showDetails && <td>-</td>}
                <td>{formatDollar(safe.amount)}</td>
                {showDetails && <td>{formatShares(safe.shares)}</td>}
                <td>{formatShares(safe.shares)}</td>
                <td className="ownership-percent">{formatPercent(safe.percent)}</td>
                {showDetails && <td>-</td>}
              </tr>
            ))}

            {/* Total Row */}
            <tr className="total-row">
              <td><strong>TOTAL</strong></td>
              <td>-</td>
              {showDetails && <td>-</td>}
              {showDetails && <td>-</td>}
              <td><strong>{formatDollar(proFormaResults.roundSize)}</strong></td>
              {showDetails && <td>-</td>}
              <td><strong>{formatShares(proFormaResults.totalSharesOutstanding)}</strong></td>
              <td className="ownership-percent"><strong>100.00%</strong></td>
              {showDetails && <td>-</td>}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Ownership Summary */}
      <div className="ownership-summary">
        <h4>Ownership Summary</h4>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="label">Founders:</span>
            <span className="value">{formatPercent(proFormaResults.totalFounderOwnership)}</span>
          </div>
          <div className="summary-item">
            <span className="label">Existing Investors:</span>
            <span className="value">{formatPercent(proFormaResults.totalExistingOwnership)}</span>
          </div>
          <div className="summary-item highlight">
            <span className="label">New Investor:</span>
            <span className="value">{formatPercent(proFormaResults.newInvestor.percent)}</span>
          </div>
          {proFormaResults.esopDetail.totalShares > 0 && (
            <div className="summary-item">
              <span className="label">ESOP Pool:</span>
              <span className="value">{formatPercent(proFormaResults.totalEsopOwnership)}</span>
            </div>
          )}
          {proFormaResults.safesDetail.length > 0 && (
            <div className="summary-item">
              <span className="label">SAFE Notes:</span>
              <span className="value">{formatPercent(proFormaResults.totalSafeOwnership)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Pro-Rata Analysis */}
      {proFormaResults.existingInvestorsDetail.some(inv => inv.hasProRata) && (
        <div className="pro-rata-analysis">
          <h4>Pro-Rata Analysis</h4>
          <table>
            <thead>
              <tr>
                <th>Investor</th>
                <th>Pro-Rata Entitlement</th>
                <th>Committed Amount</th>
                <th>Participation Rate</th>
              </tr>
            </thead>
            <tbody>
              {proFormaResults.existingInvestorsDetail
                .filter(inv => inv.hasProRata)
                .map((investor, index) => (
                  <tr key={index}>
                    <td>{investor.name}</td>
                    <td>{formatDollar(investor.proRataEntitlement || 0)}</td>
                    <td>{formatDollar(investor.proRataInvestment || 0)}</td>
                    <td>
                      {investor.proRataEntitlement > 0
                        ? formatPercent((investor.proRataInvestment / investor.proRataEntitlement) * 100)
                        : '0%'
                      }
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Validation Status */}
      {proFormaResults.errors && proFormaResults.errors.length > 0 && (
        <div className="validation-errors">
          <h4>Validation Warnings</h4>
          <ul>
            {proFormaResults.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default ProFormaTable