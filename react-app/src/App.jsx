import { useState, useEffect, useCallback } from 'react'
import './App.css'
import CompanyTabs from './components/CompanyTabs'
import InputForm from './components/InputForm'
import ScenarioCard from './components/ScenarioCard'
import Logo from './components/Logo'
import NotificationContainer from './components/NotificationContainer'
import ExitMathModule from './components/ExitMathModule'
import AppFooter from './components/AppFooter'
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

  return (
    <div className="app">
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
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
        
        <div className={`top-row${companies[activeCompany]?.showExitMath ? ' with-exit-math' : ''}`}>
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
                percentPrecision={companies[activeCompany]?.percentPrecision || 2}
                onPercentPrecisionChange={(pp) => updateCompany(activeCompany, { percentPrecision: pp })}
              />
            )}
          </div>

          {companies[activeCompany]?.showExitMath && (
            <ExitMathModule
              baseScenario={scenarios[0]}
              investorName={companies[activeCompany]?.investorName || 'US'}
              exitMath={companies[activeCompany]?.exitMath}
              onUpdate={(exitMath) => updateCompany(activeCompany, { exitMath })}
            />
          )}
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
              percentPrecision={companies[activeCompany]?.percentPrecision || 2}
              onPercentPrecisionChange={(pp) => updateCompany(activeCompany, { percentPrecision: pp })}
            />
          ))}
        </div>
      </main>

      <AppFooter
        showExitMath={companies[activeCompany]?.showExitMath || false}
        onToggleExitMath={(v) => updateCompany(activeCompany, { showExitMath: v })}
      />
    </div>
  )
}

export default App
