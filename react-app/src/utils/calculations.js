export const calculateScenario = (inputs) => {
  const { postMoneyVal, roundSize, lsvpPortion, otherPortion } = inputs
  const preMoneyVal = postMoneyVal - roundSize
  
  // Calculate percentages based on post-money valuation
  const roundPercent = (roundSize / postMoneyVal) * 100
  const lsvpPercent = (lsvpPortion / postMoneyVal) * 100
  const otherPercent = (otherPortion / postMoneyVal) * 100
  const totalPercent = roundPercent

  return {
    roundSize: roundSize,
    roundPercent: roundPercent,
    lsvpAmount: lsvpPortion,
    lsvpPercent: lsvpPercent,
    otherAmount: otherPortion,
    otherPercent: otherPercent,
    totalAmount: roundSize,
    totalPercent: totalPercent,
    preMoneyVal: preMoneyVal,
    postMoneyVal: postMoneyVal
  }
}

export const generateScenarioVariations = (baseInputs) => {
  const variations = [
    // Round size variations
    { roundSize: baseInputs.roundSize + 0.25 },
    { roundSize: baseInputs.roundSize - 0.25 },
    { roundSize: baseInputs.roundSize + 0.5 },
    { roundSize: baseInputs.roundSize - 0.5 },
    
    // Post-money valuation variations
    { postMoneyVal: baseInputs.postMoneyVal + 1 },
    { postMoneyVal: baseInputs.postMoneyVal - 1 },
    { postMoneyVal: baseInputs.postMoneyVal + 2 },
    
    // LSVP portion variations
    { lsvpPortion: baseInputs.lsvpPortion + 0.25, otherPortion: baseInputs.otherPortion - 0.25 },
    { lsvpPortion: baseInputs.lsvpPortion - 0.25, otherPortion: baseInputs.otherPortion + 0.25 },
  ]

  return variations.map(variation => {
    const scenarioInputs = { ...baseInputs, ...variation }
    // Ensure otherPortion is calculated correctly if not explicitly set
    if (!variation.otherPortion && variation.lsvpPortion) {
      scenarioInputs.otherPortion = scenarioInputs.roundSize - scenarioInputs.lsvpPortion
    }
    // Ensure valid values
    if (scenarioInputs.postMoneyVal <= 0 || scenarioInputs.roundSize <= 0) {
      return null
    }
    return scenarioInputs
  }).filter(Boolean)
}

export const calculateScenarios = (baseInputs) => {
  if (!baseInputs) return []
  
  const scenarios = []
  
  // Base scenario
  scenarios.push(calculateScenario(baseInputs))
  
  // Generate variations
  const variations = generateScenarioVariations(baseInputs)
  variations.forEach(variation => {
    scenarios.push(calculateScenario(variation))
  })
  
  return scenarios
}