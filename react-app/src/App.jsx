import { useState, useEffect, useCallback, useMemo } from 'react'
import './App.css'
import CompanyTabs from './components/CompanyTabs'
import InputForm from './components/InputForm'
import ScenarioCard from './components/ScenarioCard'
import ScenarioControls from './components/ScenarioControls'
import Logo from './components/Logo'
import NotificationContainer from './components/NotificationContainer'
import ExitMathModule from './components/ExitMathModule'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useNotifications } from './hooks/useNotifications'
import { calculateEnhancedScenarios } from './utils/multiPartyCalculations'
import { copyPermalinkToClipboard, loadScenarioFromURL } from './utils/permalink'
import { updateSocialSharingMeta } from './utils/socialSharing'
import { createDefaultCompany, nextUniqueName, normalizeStoredCompanies } from './utils/dataStructures'

function getFirstCompanyId(companies) {
  return Object.keys(companies || {})[0] || 'company1'
}

function getNextCompanyNumber(companies) {
  const maxExisting = Object.keys(companies || {}).reduce((max, id) => {
    const match = /^company(\d+)$/.exec(id)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return Math.max(2, maxExisting + 1)
}

function App() {
  const [storedCompanies, setStoredCompanies] = useLocalStorage('valuationFramework', {
    company1: createDefaultCompany('Startup Alpha')
  })
  const companies = useMemo(() => normalizeStoredCompanies(storedCompanies), [storedCompanies])
  const [activeCompany, setActiveCompany] = useState(() => getFirstCompanyId(companies))
  const [nextCompanyId, setNextCompanyId] = useState(() => getNextCompanyNumber(companies))
  const [selectedCompanyIds, setSelectedCompanyIds] = useLocalStorage('valuationFrameworkSelected', [])
  const [hasLoadedFromURL, setHasLoadedFromURL] = useState(false)

  const [scenarios, setScenarios] = useState([])
  const [baseScenariosById, setBaseScenariosById] = useState({})
  const { notifications, removeNotification, showSuccess, showInfo, showError } = useNotifications()

  const updateCompany = useCallback((companyId, data) => {
    setStoredCompanies((prev) => {
      const normalizedPrev = normalizeStoredCompanies(prev)
      return {
        ...normalizedPrev,
        [companyId]: { ...normalizedPrev[companyId], ...data }
      }
    })
  }, [setStoredCompanies])

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

    setStoredCompanies(prev => ({ ...normalizeStoredCompanies(prev), [newCompanyId]: newCompany }))
    setActiveCompany(newCompanyId)
    setNextCompanyId(prev => prev + 1)
  }

  const duplicateCompany = (companyId) => {
    const source = companies[companyId]
    if (!source) return
    const newCompanyId = `company${nextCompanyId}`
    const copy = typeof structuredClone === 'function'
      ? structuredClone(source)
      : JSON.parse(JSON.stringify(source))
    copy.name = nextUniqueName(source.name, companies)
    setStoredCompanies(prev => ({ ...normalizeStoredCompanies(prev), [newCompanyId]: copy }))
    setActiveCompany(newCompanyId)
    setNextCompanyId(prev => prev + 1)
  }

  const removeCompany = (companyId) => {
    if (Object.keys(companies).length <= 1) return

    const newCompanies = { ...companies }
    delete newCompanies[companyId]
    setStoredCompanies(newCompanies)

    setSelectedCompanyIds(prev => prev.filter(id => id !== companyId))

    if (activeCompany === companyId) {
      setActiveCompany(Object.keys(newCompanies)[0])
    }
  }

  const toggleCompareSelection = (companyId) => {
    setSelectedCompanyIds(prev => (
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    ))
  }

  useEffect(() => {
    const raw = JSON.stringify(storedCompanies)
    const normalized = JSON.stringify(companies)

    if (raw !== normalized) {
      setStoredCompanies(companies)
    }
  }, [storedCompanies, companies, setStoredCompanies])

  // Load scenario from URL on mount (only once)
  useEffect(() => {
    const companyIds = Object.keys(companies || {})

    if (companyIds.length === 0) {
      const fallback = { company1: createDefaultCompany('Startup Alpha') }
      setStoredCompanies(fallback)
      setActiveCompany('company1')
      setNextCompanyId(2)
      return
    }

    if (!companies[activeCompany]) {
      setActiveCompany(companyIds[0])
    }

    const derivedNextCompanyId = getNextCompanyNumber(companies)
    if (nextCompanyId !== derivedNextCompanyId) {
      setNextCompanyId(derivedNextCompanyId)
    }
  }, [companies, activeCompany, nextCompanyId, setStoredCompanies])

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
      const newScenarios = calculateEnhancedScenarios(currentCompany, {
        offsets: currentCompany.scenarioOffsets
      })

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

  useEffect(() => {
    const validSelected = selectedCompanyIds.filter(id => companies[id])
    const idsToCompute = validSelected.length >= 2 ? validSelected : [activeCompany]
    const next = {}
    for (const id of idsToCompute) {
      const co = companies[id]
      if (!co) continue
      const s = calculateEnhancedScenarios(co)
      if (Array.isArray(s) && s.length > 0) {
        next[id] = s[0]
      }
    }
    setBaseScenariosById(next)
  }, [companies, activeCompany, selectedCompanyIds])

  const compareIds = selectedCompanyIds.filter(id => companies[id])
  const isCompareMode = compareIds.length >= 2
  const cardIds = isCompareMode ? compareIds : [activeCompany]
  const showExitMath = Boolean(companies[activeCompany]?.showExitMath)
  const advancedOpen = !isCompareMode && !showExitMath && Boolean(companies[activeCompany]?.showAdvanced)

  return (
    <div className="app">
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
      <header className="app-header">
        <Logo size={40} />
        <button
          type="button"
          className="exit-math-toggle header-exit-math-toggle"
          onClick={() => updateCompany(activeCompany, { showExitMath: !(companies[activeCompany]?.showExitMath) })}
          aria-pressed={companies[activeCompany]?.showExitMath || false}
        >
          {companies[activeCompany]?.showExitMath ? '▼' : '▶'} Exit Math
        </button>
      </header>

      <main className="app-main">
        <CompanyTabs
          companies={companies}
          activeCompany={activeCompany}
          onCompanyChange={setActiveCompany}
          onAddCompany={addCompany}
          onRemoveCompany={removeCompany}
          onUpdateCompany={updateCompany}
          onDuplicateCompany={duplicateCompany}
          selectedCompanyIds={selectedCompanyIds}
          onToggleCompareSelection={toggleCompareSelection}
        />

        <div className={`top-row${showExitMath ? ' with-exit-math' : ''}${isCompareMode ? ' compare-mode' : ''}${advancedOpen ? ' advanced-open' : ''}`}>
          <InputForm
            company={companies[activeCompany]}
            onUpdate={(data) => updateCompany(activeCompany, data)}
          />

          <div className={`base-result${isCompareMode ? ' base-result-compare' : ''}`}>
            {cardIds.map((cid, idx) => {
              const base = baseScenariosById[cid]
              if (!base) return null
              return (
                <ScenarioCard
                  key={cid}
                  scenario={base}
                  index={0}
                  isBase={true}
                  onApplyScenario={(data) => updateCompany(cid, data)}
                  onCopyPermalink={handleCopyPermalink}
                  investorName={companies[cid]?.investorName || 'US'}
                  showAdvanced={companies[cid]?.showAdvanced || false}
                  percentPrecision={companies[cid]?.percentPrecision || 2}
                  onPercentPrecisionChange={(pp) => updateCompany(cid, { percentPrecision: pp })}
                  company={companies[cid]}
                  onUpdateBase={(patch) => updateCompany(cid, patch)}
                  companyName={isCompareMode ? companies[cid]?.name : undefined}
                  compareActive={isCompareMode ? cid === activeCompany : undefined}
                  compareIndex={isCompareMode ? idx : undefined}
                />
              )
            })}
          </div>

          {showExitMath && (
            <ExitMathModule
              baseScenario={scenarios[0]}
              investorName={companies[activeCompany]?.investorName || 'US'}
              exitMath={companies[activeCompany]?.exitMath}
              onUpdate={(exitMath) => updateCompany(activeCompany, { exitMath })}
              companyName={isCompareMode ? companies[activeCompany]?.name : undefined}
            />
          )}
        </div>

        {!isCompareMode && scenarios.length > 1 && (
          <ScenarioControls
            offsets={companies[activeCompany]?.scenarioOffsets || []}
            onChange={(next) => updateCompany(activeCompany, { scenarioOffsets: next })}
          />
        )}

        {!isCompareMode && (
          <div className="scenarios-rows">
            {scenarios.slice(1).map((scenario, index) => (
              <ScenarioCard
                key={scenario.offsetPercent ?? index + 1}
                scenario={scenario}
                index={index + 1}
                isBase={false}
                onApplyScenario={applyScenario}
                investorName={companies[activeCompany]?.investorName || 'US'}
                showAdvanced={companies[activeCompany]?.showAdvanced || false}
                percentPrecision={companies[activeCompany]?.percentPrecision || 2}
                onPercentPrecisionChange={(pp) => updateCompany(activeCompany, { percentPrecision: pp })}
                baseScenario={scenarios[0]}
                company={companies[activeCompany]}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
