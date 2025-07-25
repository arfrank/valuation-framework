export const calculateScenario = (inputs) => {
  const { 
    postMoneyVal, 
    roundSize, 
    lsvpPortion, 
    otherPortion,
    // Advanced features
    proRataPercent = 0,
    safeAmount = 0,
    safeCap = 0,
    preRoundFounderOwnership = 70
  } = inputs
  
  // Validate inputs to prevent division by zero and negative pre-money
  if (postMoneyVal <= 0 || roundSize <= 0 || postMoneyVal <= roundSize) {
    return null
  }
  
  const preMoneyVal = Math.round((postMoneyVal - roundSize) * 100) / 100
  
  // Calculate SAFE conversion if applicable
  let safePercent = 0
  if (safeAmount > 0 && safeCap > 0) {
    // SAFE converts at the lower of: (1) safe cap, or (2) current round pre-money
    const conversionVal = Math.min(safeCap, preMoneyVal)
    safePercent = Math.round((safeAmount / conversionVal) * 10000) / 100
  }
  
  // Calculate pro-rata portion of round
  const proRataAmount = Math.round((roundSize * (proRataPercent || 0) / 100) * 100) / 100
  const newMoneyAmount = Math.round((roundSize - proRataAmount) * 100) / 100
  
  // Adjust new investor portions - pro-rata comes from "Other" bucket
  let adjustedLsvpPortion = lsvpPortion  // US portion stays the same
  let adjustedOtherPortion = Math.round((otherPortion - proRataAmount) * 100) / 100
  
  // Calculate actual pro-rata amount (limited by available "Other" portion)
  let actualProRataAmount = proRataAmount
  if (adjustedOtherPortion < 0) {
    actualProRataAmount = otherPortion  // Can't exceed what's available in "Other"
    adjustedOtherPortion = 0
  }
  
  // Calculate ownership percentages (post-money basis including SAFEs)
  const totalValue = postMoneyVal
  const roundPercent = Math.round((roundSize / totalValue) * 10000) / 100
  const lsvpPercent = Math.round((adjustedLsvpPortion / totalValue) * 10000) / 100
  const otherPercent = Math.round((adjustedOtherPortion / totalValue) * 10000) / 100
  const proRataPercent_final = Math.round((actualProRataAmount / totalValue) * 10000) / 100
  
  // Calculate total dilution (round + SAFE)
  const totalNewOwnership = roundPercent + safePercent
  
  // Calculate founder dilution (proportional dilution based on new ownership issued)
  const preRoundFounderPercent = preRoundFounderOwnership || 70
  // Founders retain their percentage of the remaining ownership after new issuance
  const postRoundFounderPercent = Math.round((preRoundFounderPercent * (100 - totalNewOwnership) / 100) * 100) / 100
  const founderDilution = Math.round((preRoundFounderPercent - postRoundFounderPercent) * 100) / 100

  // Calculate total round investment (just the cash round, SAFE is conversion not new cash)
  const totalInvestmentAmount = Math.round(roundSize * 100) / 100
  const totalInvestmentPercent = roundPercent

  return {
    roundSize: Math.round(roundSize * 100) / 100,
    roundPercent: roundPercent,
    lsvpAmount: Math.round(adjustedLsvpPortion * 100) / 100,
    lsvpPercent: lsvpPercent,
    otherAmount: Math.round(adjustedOtherPortion * 100) / 100,
    otherPercent: otherPercent,
    totalAmount: totalInvestmentAmount,
    totalPercent: totalInvestmentPercent,
    preMoneyVal: preMoneyVal,
    postMoneyVal: Math.round(postMoneyVal * 100) / 100,
    // Advanced metrics
    safeAmount: Math.round(safeAmount * 100) / 100,
    safePercent: safePercent,
    safeCap: Math.round(safeCap * 100) / 100,  // Include input cap for apply scenario
    proRataAmount: actualProRataAmount,
    proRataPercent: proRataPercent_final,
    proRataPercentInput: proRataPercent,  // Include input percentage for apply scenario
    preRoundFounderPercent: preRoundFounderPercent,
    postRoundFounderPercent: postRoundFounderPercent,
    founderDilution: founderDilution
  }
}

export const generateScenarioVariations = (baseInputs) => {
  // Calculate proportional changes based on round size
  const roundSizeBase = baseInputs.roundSize
  const postMoneyBase = baseInputs.postMoneyVal
  const lsvpBase = baseInputs.lsvpPortion
  const investorName = baseInputs.investorName || 'US'
  
  // Scale factors: 10%, 20%, 25% for round size; 15%, 25%, 40% for valuation; 20%, 40% for LSVP
  const roundChange1 = Math.round((roundSizeBase * 0.1) * 4) / 4 // 10% rounded to nearest 0.25
  const roundChange2 = Math.round((roundSizeBase * 0.2) * 4) / 4 // 20% rounded to nearest 0.25
  const roundChange3 = Math.round((roundSizeBase * 0.25) * 4) / 4 // 25% rounded to nearest 0.25
  const roundChange4 = Math.round((roundSizeBase * 0.15) * 4) / 4 // 15% rounded to nearest 0.25
  
  const valChange1 = Math.round((postMoneyBase * 0.15) * 2) / 2 // 15% rounded to nearest 0.5
  const valChange2 = Math.round((postMoneyBase * 0.25) * 2) / 2 // 25% rounded to nearest 0.5
  const valChange3 = Math.round((postMoneyBase * 0.1) * 2) / 2 // 10% rounded to nearest 0.5
  const valChange4 = Math.round((postMoneyBase * 0.4) * 2) / 2 // 40% rounded to nearest 0.5
  
  const lsvpChange1 = Math.round((lsvpBase * 0.2) * 4) / 4 // 20% rounded to nearest 0.25
  const lsvpChange2 = Math.round((lsvpBase * 0.4) * 4) / 4 // 40% rounded to nearest 0.25
  
  // Calculate proportional splits for round size changes
  const getProportionalSplit = (newRoundSize) => {
    const investorRatio = baseInputs.lsvpPortion / baseInputs.roundSize
    const otherRatio = baseInputs.otherPortion / baseInputs.roundSize
    return {
      lsvpPortion: Math.round(newRoundSize * investorRatio * 100) / 100,
      otherPortion: Math.round(newRoundSize * otherRatio * 100) / 100
    }
  }

  const variations = [
    // Round size variations (4 scenarios) - with proportional splits
    (() => {
      const newRoundSize = baseInputs.roundSize + roundChange1
      const split = getProportionalSplit(newRoundSize)
      return { roundSize: newRoundSize, ...split, title: `+$${roundChange1}M Round (+10%)` }
    })(),
    (() => {
      const newRoundSize = baseInputs.roundSize + roundChange2
      const split = getProportionalSplit(newRoundSize)
      return { roundSize: newRoundSize, ...split, title: `+$${roundChange2}M Round (+20%)` }
    })(),
    (() => {
      const newRoundSize = baseInputs.roundSize + roundChange3
      const split = getProportionalSplit(newRoundSize)
      return { roundSize: newRoundSize, ...split, title: `+$${roundChange3}M Round (+25%)` }
    })(),
    (() => {
      const newRoundSize = baseInputs.roundSize + (roundChange4 * 2)
      const split = getProportionalSplit(newRoundSize)
      return { roundSize: newRoundSize, ...split, title: `+$${(roundChange4 * 2).toFixed(2)}M Round (+30%)` }
    })(),
    
    // Post-money valuation variations (4 scenarios) - all increases  
    { postMoneyVal: baseInputs.postMoneyVal + valChange1, title: `+$${valChange1}M Valuation (+15%)` },
    { postMoneyVal: baseInputs.postMoneyVal + valChange2, title: `+$${valChange2}M Valuation (+25%)` },
    { postMoneyVal: baseInputs.postMoneyVal + (valChange3 * 2), title: `+$${(valChange3 * 2).toFixed(1)}M Valuation (+20%)` },
    { postMoneyVal: baseInputs.postMoneyVal + valChange4, title: `+$${valChange4}M Valuation (+40%)` },
    
    // Investor portion variations (2 scenarios) - with proper other portion adjustment
    (() => {
      const newLsvpPortion = baseInputs.lsvpPortion + lsvpChange1
      const newOtherPortion = Math.max(0, Math.round((baseInputs.otherPortion - lsvpChange1) * 100) / 100)
      return {
        lsvpPortion: newLsvpPortion,
        otherPortion: newOtherPortion,
        roundSize: Math.round((newLsvpPortion + newOtherPortion) * 100) / 100,
        title: `+$${lsvpChange1}M ${investorName} (+20%)`
      }
    })(),
    (() => {
      const newLsvpPortion = baseInputs.lsvpPortion + lsvpChange2
      const newOtherPortion = Math.max(0, Math.round((baseInputs.otherPortion - lsvpChange2) * 100) / 100)
      return {
        lsvpPortion: newLsvpPortion,
        otherPortion: newOtherPortion,
        roundSize: Math.round((newLsvpPortion + newOtherPortion) * 100) / 100,
        title: `+$${lsvpChange2}M ${investorName} (+40%)`
      }
    })(),
  ]

  return variations.map(variation => {
    const scenarioInputs = { 
      ...baseInputs, 
      ...variation,
      // Ensure advanced features are always passed through
      proRataPercent: baseInputs.proRataPercent || 0,
      safeAmount: baseInputs.safeAmount || 0,
      safeCap: baseInputs.safeCap || 0,
      preRoundFounderOwnership: baseInputs.preRoundFounderOwnership || 70,
      showAdvanced: baseInputs.showAdvanced || false
    }
    
    // Ensure otherPortion is calculated correctly if not explicitly set
    if (variation.otherPortion === undefined && variation.lsvpPortion !== undefined) {
      scenarioInputs.otherPortion = Math.round((scenarioInputs.roundSize - scenarioInputs.lsvpPortion) * 100) / 100
    }
    
    // Validate that investor + other = round size (within rounding tolerance)
    const totalCheck = Math.round((scenarioInputs.lsvpPortion + scenarioInputs.otherPortion) * 100) / 100
    const roundSizeCheck = Math.round(scenarioInputs.roundSize * 100) / 100
    
    // Ensure valid values - no negative numbers and math adds up
    if (scenarioInputs.postMoneyVal <= 0 || 
        scenarioInputs.roundSize <= 0 || 
        scenarioInputs.lsvpPortion < 0 || 
        scenarioInputs.otherPortion < 0 ||
        Math.abs(totalCheck - roundSizeCheck) > 0.01) {
      return null
    }
    
    return scenarioInputs
  }).filter(Boolean)
}

export const calculateScenarios = (baseInputs) => {
  if (!baseInputs) return []
  
  const scenarios = []
  
  // Base scenario
  const baseScenario = calculateScenario(baseInputs)
  if (baseScenario) {
    scenarios.push({...baseScenario, title: "Base Case"})
  }
  
  // Generate variations
  const variations = generateScenarioVariations(baseInputs)
  variations.forEach(variation => {
    const scenario = calculateScenario(variation)
    if (scenario) { // Only process valid scenarios
      scenario.title = variation.title
      scenarios.push(scenario)
    }
  })
  
  // Return all valid scenarios
  return scenarios
}