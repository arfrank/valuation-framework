import { useState, useEffect } from 'react'
import './App.css'
import CompanyTabs from './components/CompanyTabs'
import InputForm from './components/InputForm'
import ScenariosGrid from './components/ScenariosGrid'
import { useLocalStorage } from './hooks/useLocalStorage'
import { calculateScenarios } from './utils/calculations'

function App() {
  const [activeCompany, setActiveCompany] = useState('company1')
  const [companies, setCompanies] = useLocalStorage('valuationFramework', {
    company1: {
      name: 'Startup Alpha',
      postMoneyVal: 13,
      roundSize: 3,
      lsvpPortion: 2.75,
      otherPortion: 0.25
    }
  })
  const [nextCompanyId, setNextCompanyId] = useState(2)

  const [scenarios, setScenarios] = useState([])

  const updateCompany = (companyId, data) => {
    setCompanies(prev => ({
      ...prev,
      [companyId]: { ...prev[companyId], ...data }
    }))
  }

  const addCompany = () => {
    const newCompanyId = `company${nextCompanyId}`
    const newCompany = {
      name: `Startup ${String.fromCharCode(64 + nextCompanyId)}`,
      postMoneyVal: 13,
      roundSize: 3,
      lsvpPortion: 2.75,
      otherPortion: 0.25
    }
    setCompanies(prev => ({ ...prev, [newCompanyId]: newCompany }))
    setActiveCompany(newCompanyId)
    setNextCompanyId(prev => prev + 1)
  }

  const removeCompany = (companyId) => {
    if (Object.keys(companies).length <= 1) return
    
    const newCompanies = { ...companies }
    delete newCompanies[companyId]
    setCompanies(newCompanies)
    
    if (activeCompany === companyId) {
      setActiveCompany(Object.keys(newCompanies)[0])
    }
  }

  useEffect(() => {
    const currentCompany = companies[activeCompany]
    if (currentCompany) {
      const newScenarios = calculateScenarios(currentCompany)
      setScenarios(newScenarios)
    }
  }, [companies, activeCompany])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Valuation Framework</h1>
        <p>Dynamic valuation analysis with live calculations</p>
      </header>

      <main className="app-main">
        <CompanyTabs 
          companies={companies}
          activeCompany={activeCompany}
          onCompanyChange={setActiveCompany}
          onAddCompany={addCompany}
          onRemoveCompany={removeCompany}
          onUpdateCompany={updateCompany}
        />
        
        <div className="content-layout">
          <InputForm 
            company={companies[activeCompany]}
            onUpdate={(data) => updateCompany(activeCompany, data)}
          />
          
          <ScenariosGrid 
            scenarios={scenarios}
            companyName={companies[activeCompany]?.name}
          />
        </div>
      </main>
    </div>
  )
}

export default App
