import { useState, useEffect } from 'react'
import './App.css'
import CompanyTabs from './components/CompanyTabs'
import InputForm from './components/InputForm'
import ScenarioCard from './components/ScenarioCard'
import Logo from './components/Logo'
import GeometricBackground from './components/GeometricBackground'
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
      otherPortion: 0.25,
      investorName: 'US',
      showAdvanced: false,
      proRataPercent: 15,
      safeAmount: 0,
      safeCap: 0,
      preRoundFounderOwnership: 70
    }
  })
  const [nextCompanyId, setNextCompanyId] = useState(2)
  const [showGeometricBackground, setShowGeometricBackground] = useState(false)

  const [scenarios, setScenarios] = useState([])

  const updateCompany = (companyId, data) => {
    setCompanies(prev => ({
      ...prev,
      [companyId]: { ...prev[companyId], ...data }
    }))
  }

  const applyScenario = (scenarioData) => {
    updateCompany(activeCompany, scenarioData)
  }

  const addCompany = () => {
    const newCompanyId = `company${nextCompanyId}`
    const newCompany = {
      name: nextCompanyId <= 26 
        ? `Startup ${String.fromCharCode(64 + nextCompanyId)}`
        : `Startup ${nextCompanyId}`,
      postMoneyVal: 13,
      roundSize: 3,
      lsvpPortion: 2.75,
      otherPortion: 0.25,
      investorName: 'US',
      showAdvanced: false,
      proRataPercent: 15,
      safeAmount: 0,
      safeCap: 0,
      preRoundFounderOwnership: 70
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
      setScenarios(newScenarios || []) // Fallback to empty array if calculation fails
    } else {
      setScenarios([]) // Clear scenarios if no valid company
    }
  }, [companies, activeCompany])

  // Hidden keyboard shortcut: Shift + Space
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.shiftKey && (e.code === 'Space' || e.key === ' ')) {
        setShowGeometricBackground(prev => !prev)
        e.preventDefault()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Add/remove class to body when geometric background is active
  useEffect(() => {
    if (showGeometricBackground) {
      document.body.classList.add('geometric-background-active')
    } else {
      document.body.classList.remove('geometric-background-active')
    }
  }, [showGeometricBackground])

  return (
    <div className="app">
      <GeometricBackground isActive={showGeometricBackground} />
      {/* Debug indicator */}
      {showGeometricBackground && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(99, 91, 255, 0.8)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000
        }}>
          3D Mode Active
        </div>
      )}
      <header className="app-header">
        <Logo size={40} />
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
        
        <div className="top-row">
          <InputForm 
            company={companies[activeCompany]}
            onUpdate={(data) => updateCompany(activeCompany, data)}
          />
          
          <div className="base-result">
            {scenarios.length > 0 && (
              <ScenarioCard 
                scenario={scenarios[0]}
                index={0}
                isBase={true}
                onApplyScenario={applyScenario}
                investorName={companies[activeCompany]?.investorName || 'US'}
                showAdvanced={companies[activeCompany]?.showAdvanced || false}
              />
            )}
          </div>
        </div>
        
        <div className="scenarios-rows">
          {scenarios.slice(1).map((scenario, index) => (
            <ScenarioCard 
              key={index + 1}
              scenario={scenario}
              index={index + 1}
              isBase={false}
              onApplyScenario={applyScenario}
              investorName={companies[activeCompany]?.investorName || 'US'}
              showAdvanced={companies[activeCompany]?.showAdvanced || false}
            />
          ))}
        </div>
      </main>
    </div>
  )
}

export default App
