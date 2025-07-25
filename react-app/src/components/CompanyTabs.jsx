import { useState } from 'react'

const CompanyTabs = ({ companies, activeCompany, onCompanyChange }) => {
  const [editingTab, setEditingTab] = useState(null)

  const handleTabClick = (companyId) => {
    if (editingTab !== companyId) {
      onCompanyChange(companyId)
    }
  }

  return (
    <div className="company-tabs">
      {Object.entries(companies).map(([companyId, company]) => (
        <div 
          key={companyId}
          className={`tab ${activeCompany === companyId ? 'active' : ''}`}
          onClick={() => handleTabClick(companyId)}
        >
          <span className="tab-name">{company.name}</span>
          <div className="tab-indicator" />
        </div>
      ))}
    </div>
  )
}

export default CompanyTabs