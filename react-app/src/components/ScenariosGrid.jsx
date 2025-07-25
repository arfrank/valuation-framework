import ScenarioCard from './ScenarioCard'

const ScenariosGrid = ({ scenarios, companyName }) => {
  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="scenarios-grid">
        <div className="no-scenarios">
          No scenarios to display. Enter values to see calculations.
        </div>
      </div>
    )
  }

  return (
    <div className="scenarios-section">
      <div className="scenarios-header">
        <h3>Alternative Scenarios</h3>
        <span className="company-label">{companyName}</span>
      </div>
      
      <div className="scenarios-grid">
        {scenarios.map((scenario, index) => (
          <ScenarioCard 
            key={index}
            scenario={scenario}
            index={index}
            isBase={index === 0}
          />
        ))}
      </div>
    </div>
  )
}

export default ScenariosGrid