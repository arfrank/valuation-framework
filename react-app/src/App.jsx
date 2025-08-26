import { useState, useEffect, useCallback } from 'react'
import './App.css'
import CompanyTabs from './components/CompanyTabs'
import InputForm from './components/InputForm'
import ScenarioCard from './components/ScenarioCard'
import Logo from './components/Logo'
import GeometricBackground from './components/GeometricBackground'
import NotificationContainer from './components/NotificationContainer'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useNotifications } from './hooks/useNotifications'
import { calculateEnhancedScenarios } from './utils/multiPartyCalculations'
import { copyPermalinkToClipboard, loadScenarioFromURL } from './utils/permalink'
import { updateSocialSharingMeta } from './utils/socialSharing'
import { createDefaultCompany } from './utils/dataStructures'

function App() {
  const [activeCompany, setActiveCompany] = useState('company1')
  const [companies, setCompanies] = useLocalStorage('valuationFramework', {
    company1: createDefaultCompany('Startup Alpha')
  })
  const [nextCompanyId, setNextCompanyId] = useState(2)
  const [showGeometricBackground, setShowGeometricBackground] = useState(false)
  const [hasLoadedFromURL, setHasLoadedFromURL] = useState(false)

  const [scenarios, setScenarios] = useState([])
  const { notifications, removeNotification, showSuccess, showInfo, showError } = useNotifications()

  const updateCompany = useCallback((companyId, data) => {
    setCompanies(prev => ({
      ...prev,
      [companyId]: { ...prev[companyId], ...data }
    }))
  }, [setCompanies])

  const applyScenario = (scenarioData) => {
    updateCompany(activeCompany, scenarioData)
    showSuccess('Scenario applied successfully')
  }

  const handleCopyPermalink = async (scenarioData) => {
    return await copyPermalinkToClipboard(scenarioData)
  }


  const addCompany = () => {
    const newCompanyId = `company${nextCompanyId}`
    const companyName = nextCompanyId <= 26 
      ? `Startup ${String.fromCharCode(64 + nextCompanyId)}`
      : `Startup ${nextCompanyId}`
    const newCompany = createDefaultCompany(companyName)
    
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

  // Load scenario from URL on mount (only once)
  useEffect(() => {
    if (!hasLoadedFromURL) {
      const urlScenario = loadScenarioFromURL()
      if (urlScenario) {
        updateCompany(activeCompany, urlScenario)
        showInfo('Scenario loaded from shared link')
      }
      setHasLoadedFromURL(true)
    }
  }, [hasLoadedFromURL, activeCompany, showInfo, updateCompany])


  useEffect(() => {
    const currentCompany = companies[activeCompany]
    if (currentCompany) {
      const newScenarios = calculateEnhancedScenarios(currentCompany)
      
      // Check if the result is an error object
      if (newScenarios && newScenarios.error) {
        showError(newScenarios.errorMessage)
        setScenarios([]) // Clear scenarios
      } else if (!newScenarios || newScenarios.length === 0) {
        // Check if ownership exceeds 100%
        const totalPriorOwnership = (currentCompany.priorInvestors || []).reduce((sum, inv) => sum + (inv.ownershipPercent || 0), 0)
        const totalFounderOwnership = (currentCompany.founders || []).reduce((sum, f) => sum + (f.ownershipPercent || 0), 0)
        const totalOwnership = totalPriorOwnership + totalFounderOwnership
        
        if (totalOwnership > 100) {
          showError(`Cannot calculate scenarios: Total pre-round ownership is ${totalOwnership.toFixed(1)}% (exceeds 100%). Please adjust prior investor and founder ownership percentages.`)
        }
        setScenarios([]) // Clear scenarios
      } else {
        setScenarios(newScenarios)
      }
      
      // Update page metadata for permalinks
      updateSocialSharingMeta()
    } else {
      setScenarios([]) // Clear scenarios if no valid company
    }
  }, [companies, activeCompany, showError])

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
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
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
                onCopyPermalink={handleCopyPermalink}
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
