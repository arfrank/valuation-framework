export const calculateScenario = (inputs) => {
  const { 
    postMoneyVal, 
    roundSize, 
    investorPortion, 
    otherPortion,
    // Advanced features
    proRataPercent = 0,
    // N SAFEs support
    safes = [],
    preRoundFounderOwnership = 0,
    // ESOP modeling
    currentEsopPercent = 0,
    targetEsopPercent = 0,
    esopTiming = 'pre-close'
  } = inputs
  
  // Validate inputs to prevent division by zero and negative pre-money
  if (postMoneyVal <= 0 || roundSize <= 0 || postMoneyVal <= roundSize) {
    return null
  }
  
  const preMoneyVal = Math.round((postMoneyVal - roundSize) * 100) / 100
  
  // Calculate SAFE conversions - handle both new array and legacy single SAFE
  let totalSafePercent = 0
  let totalSafeAmount = 0
  let safeDetails = []
  
  // Process new N SAFEs array
  if (safes && safes.length > 0) {
    safes.forEach((safe, index) => {
      if (safe.amount > 0) {
        let conversionPrice = 0
        
        if (safe.cap > 0 && safe.discount > 0) {
          // SAFE with both cap and discount - use the more favorable (lower price)
          const capPrice = safe.cap
          const discountPrice = preMoneyVal * (1 - safe.discount / 100)
          conversionPrice = Math.min(capPrice, discountPrice)
        } else if (safe.cap > 0) {
          // SAFE with cap only
          conversionPrice = Math.min(safe.cap, preMoneyVal)
        } else if (safe.discount > 0) {
          // SAFE with discount only
          conversionPrice = preMoneyVal * (1 - safe.discount / 100)
        } else {
          // SAFE with no cap or discount - converts at current round price
          conversionPrice = preMoneyVal
        }
        
        if (conversionPrice > 0) {
          const safePercent = Math.round((safe.amount / conversionPrice) * 10000) / 100
          
          // Validate that SAFE doesn't result in impossible ownership percentage
          // Cap individual SAFE at 95% ownership to prevent mathematical impossibilities
          if (safePercent <= 95) {
            totalSafePercent += safePercent
            totalSafeAmount += safe.amount
            
            safeDetails.push({
              id: safe.id,
              index: index + 1,
              amount: safe.amount,
              cap: safe.cap,
              discount: safe.discount,
              conversionPrice: Math.round(conversionPrice * 100) / 100,
              percent: safePercent
            })
          }
          // SAFEs with >95% ownership are silently filtered out as invalid
        }
      }
    })
  }
  
  
  // Use aggregated values for calculations
  const safePercent = Math.round(totalSafePercent * 100) / 100
  
  // Calculate pro-rata portion of round
  const proRataAmount = Math.round((roundSize * (proRataPercent || 0) / 100) * 100) / 100
  // const newMoneyAmount = Math.round((roundSize - proRataAmount) * 100) / 100
  
  // Adjust new investor portions - pro-rata comes from "Other" bucket
  let adjustedInvestorPortion = investorPortion  // US portion stays the same
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
  // const investorPercent = Math.round((adjustedInvestorPortion / totalValue) * 10000) / 100
  // const otherPercent = Math.round((adjustedOtherPortion / totalValue) * 10000) / 100
  const proRataPercent_final = Math.round((actualProRataAmount / totalValue) * 10000) / 100
  
  // Calculate total dilution (round + SAFE)
  const totalNewOwnership = roundPercent + safePercent
  
  // Calculate founder dilution (proportional dilution based on new ownership issued)
  const preRoundFounderPercent = preRoundFounderOwnership ?? 0  // Use 0 as default instead of 70
  
  // Calculate other pre-round ownership (previous investors, employees, etc.)
  // This represents the remaining ownership not held by founders before the round
  const preRoundOtherPercent = Math.max(0, 100 - preRoundFounderPercent - (currentEsopPercent || 0))
  
  // All pre-round holders (founders + others + existing ESOP) get diluted proportionally
  const postRoundFounderPercent = Math.round((preRoundFounderPercent * (100 - totalNewOwnership) / 100) * 100) / 100
  const postRoundOtherPercent = Math.round((preRoundOtherPercent * (100 - totalNewOwnership) / 100) * 100) / 100
  const founderDilution = Math.round((preRoundFounderPercent - postRoundFounderPercent) * 100) / 100

  // Calculate final ESOP percentage based on target first
  let finalEsopPercent
  if (targetEsopPercent === 0) {
    // When target is 0, calculate natural dilution of current ESOP
    finalEsopPercent = Math.round((currentEsopPercent * (100 - roundPercent) / 100) * 100) / 100
  } else if (targetEsopPercent > 0) {
    // When target is positive, use the target
    finalEsopPercent = targetEsopPercent
  } else {
    // When no target specified, keep current
    finalEsopPercent = currentEsopPercent
  }

  // Calculate ESOP modeling with iterative dilution for pre-close
  let esopIncrease = 0
  let esopIncreasePreClose = 0
  let esopIncreasePostClose = 0
  let adjustedRoundPercent = roundPercent
  // let adjustedTotalNewOwnership = totalNewOwnership
  let adjustedPostRoundFounderPercent = postRoundFounderPercent
  let adjustedPostRoundOtherPercent = postRoundOtherPercent
  let adjustedFounderDilution = founderDilution
  
  if (targetEsopPercent > 0) {
    if (esopTiming === 'pre-close') {
      // Pre-close: In post-money framework, round percentage stays fixed
      // ESOP dilution is calculated independently without affecting round %
      
      // Calculate what ESOP percentage would be after round dilution
      const esopAfterDilution = currentEsopPercent * (100 - roundPercent) / 100
      esopIncrease = Math.max(0, targetEsopPercent - esopAfterDilution)
      esopIncreasePreClose = esopIncrease
      
      // Round percentage remains unchanged in post-money framework
      adjustedRoundPercent = roundPercent
      
      // Calculate dilution: round + SAFE + ESOP increase dilute existing holders
      const totalDilutionWithEsop = roundPercent + safePercent + esopIncrease
      adjustedPostRoundFounderPercent = Math.round((preRoundFounderPercent * (100 - totalDilutionWithEsop) / 100) * 100) / 100
      
      // Calculate adjustedPostRoundOtherPercent to ensure total adds up to 100%
      // This prevents floating point precision errors from causing totals != 100%
      // const calculatedOtherPercent = Math.round((preRoundOtherPercent * (100 - totalDilutionWithEsop) / 100) * 100) / 100
      const totalSoFar = adjustedRoundPercent + safePercent + adjustedPostRoundFounderPercent + finalEsopPercent
      adjustedPostRoundOtherPercent = Math.round((100 - totalSoFar) * 100) / 100
      
      adjustedFounderDilution = Math.round((preRoundFounderPercent - adjustedPostRoundFounderPercent) * 100) / 100
      
    } else {
      // Post-close: Calculate ESOP increase needed after everyone is diluted by the round
      // The existing ESOP and all other ownership gets diluted by the round first
      // Then we add ESOP shares to reach the target percentage
      const esopAfterRoundDilution = currentEsopPercent * (100 - roundPercent) / 100
      const targetEsopAfterRound = targetEsopPercent
      esopIncrease = Math.max(0, targetEsopAfterRound - esopAfterRoundDilution)
      esopIncreasePostClose = esopIncrease
      
      // Post-close ESOP dilutes everyone proportionally after the round
      // This includes new investors - their percentage should be reduced
      const dilutionFactor = (100 - esopIncrease) / 100
      adjustedRoundPercent = Math.round((roundPercent * dilutionFactor) * 100) / 100
      adjustedPostRoundFounderPercent = Math.round((postRoundFounderPercent * dilutionFactor) * 100) / 100
      adjustedPostRoundOtherPercent = Math.round((postRoundOtherPercent * dilutionFactor) * 100) / 100
      adjustedFounderDilution = Math.round((preRoundFounderPercent - adjustedPostRoundFounderPercent) * 100) / 100
    }
  }

  // Calculate total round investment (just the cash round, SAFE is conversion not new cash)
  const totalInvestmentAmount = Math.round(roundSize * 100) / 100
  const totalInvestmentPercent = adjustedRoundPercent

  // Recalculate investor and other percentages based on adjusted round percentage
  // For post-close ESOP, these should be diluted proportionally
  const adjustedInvestorPercent = Math.round((adjustedInvestorPortion / totalValue) * (adjustedRoundPercent / roundPercent) * 10000) / 100
  const adjustedOtherPercent = Math.round((adjustedOtherPortion / totalValue) * (adjustedRoundPercent / roundPercent) * 10000) / 100

  return {
    roundSize: Math.round(roundSize * 100) / 100,
    roundPercent: adjustedRoundPercent,
    investorAmount: Math.round(adjustedInvestorPortion * 100) / 100,
    investorPercent: adjustedInvestorPercent,
    otherAmount: Math.round(adjustedOtherPortion * 100) / 100,
    otherPercent: adjustedOtherPercent,
    totalAmount: totalInvestmentAmount,
    totalPercent: totalInvestmentPercent,
    preMoneyVal: preMoneyVal,
    postMoneyVal: Math.round(postMoneyVal * 100) / 100,
    // N SAFEs metrics
    safes: safes, // Pass through the input SAFEs array
    safeDetails: safeDetails, // Individual SAFE calculation results
    totalSafeAmount: Math.round(totalSafeAmount * 100) / 100,
    totalSafePercent: safePercent,
    proRataAmount: actualProRataAmount,
    proRataPercent: proRataPercent_final,
    proRataPercentInput: proRataPercent,  // Include input percentage for apply scenario
    preRoundFounderPercent: preRoundFounderPercent,
    postRoundFounderPercent: adjustedPostRoundFounderPercent,
    founderDilution: adjustedFounderDilution,
    // Other pre-round ownership (previous investors, employees, etc.)
    preRoundOtherPercent: preRoundOtherPercent,
    postRoundOtherPercent: adjustedPostRoundOtherPercent,
    // ESOP modeling results
    currentEsopPercent: currentEsopPercent,
    targetEsopPercent: targetEsopPercent,
    finalEsopPercent: finalEsopPercent,
    esopIncrease: esopIncrease,
    esopIncreasePreClose: esopIncreasePreClose,
    esopIncreasePostClose: esopIncreasePostClose,
    esopTiming: esopTiming
  }
}

export const generateScenarioVariations = (baseInputs) => {
  // Calculate proportional changes based on round size
  const roundSizeBase = baseInputs.roundSize
  const postMoneyBase = baseInputs.postMoneyVal
  const investorBase = baseInputs.investorPortion
  const investorName = baseInputs.investorName || 'US'
  
  // Scale factors: 10%, 20%, 25% for round size; 15%, 25%, 40% for valuation; 20%, 40% for investor
  const roundChange1 = Math.round((roundSizeBase * 0.1) * 4) / 4 // 10% rounded to nearest 0.25
  const roundChange2 = Math.round((roundSizeBase * 0.2) * 4) / 4 // 20% rounded to nearest 0.25
  const roundChange3 = Math.round((roundSizeBase * 0.25) * 4) / 4 // 25% rounded to nearest 0.25
  const roundChange4 = Math.round((roundSizeBase * 0.15) * 4) / 4 // 15% rounded to nearest 0.25
  
  const valChange1 = Math.round((postMoneyBase * 0.15) * 2) / 2 // 15% rounded to nearest 0.5
  const valChange2 = Math.round((postMoneyBase * 0.25) * 2) / 2 // 25% rounded to nearest 0.5
  const valChange3 = Math.round((postMoneyBase * 0.1) * 2) / 2 // 10% rounded to nearest 0.5
  const valChange4 = Math.round((postMoneyBase * 0.4) * 2) / 2 // 40% rounded to nearest 0.5
  
  const investorChange1 = Math.round((investorBase * 0.2) * 4) / 4 // 20% rounded to nearest 0.25
  const investorChange2 = Math.round((investorBase * 0.4) * 4) / 4 // 40% rounded to nearest 0.25
  
  // Calculate proportional splits for round size changes
  const getProportionalSplit = (newRoundSize) => {
    const investorRatio = baseInputs.investorPortion / baseInputs.roundSize
    const otherRatio = baseInputs.otherPortion / baseInputs.roundSize
    return {
      investorPortion: Math.round(newRoundSize * investorRatio * 100) / 100,
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
      const newInvestorPortion = baseInputs.investorPortion + investorChange1
      const newOtherPortion = Math.max(0, Math.round((baseInputs.otherPortion - investorChange1) * 100) / 100)
      return {
        investorPortion: newInvestorPortion,
        otherPortion: newOtherPortion,
        roundSize: Math.round((newInvestorPortion + newOtherPortion) * 100) / 100,
        title: `+$${investorChange1}M ${investorName} (+20%)`
      }
    })(),
    (() => {
      const newInvestorPortion = baseInputs.investorPortion + investorChange2
      const newOtherPortion = Math.max(0, Math.round((baseInputs.otherPortion - investorChange2) * 100) / 100)
      return {
        investorPortion: newInvestorPortion,
        otherPortion: newOtherPortion,
        roundSize: Math.round((newInvestorPortion + newOtherPortion) * 100) / 100,
        title: `+$${investorChange2}M ${investorName} (+40%)`
      }
    })(),
  ]

  return variations.map(variation => {
    const scenarioInputs = { 
      ...baseInputs, 
      ...variation,
      // Ensure advanced features are always passed through
      proRataPercent: baseInputs.proRataPercent || 0,
      // N SAFEs support
      safes: baseInputs.safes || [],
      preRoundFounderOwnership: baseInputs.preRoundFounderOwnership || 0,
      // ESOP modeling
      currentEsopPercent: baseInputs.currentEsopPercent || 0,
      targetEsopPercent: baseInputs.targetEsopPercent || 0,
      esopTiming: baseInputs.esopTiming || 'pre-close',
      showAdvanced: baseInputs.showAdvanced || false
    }
    
    // Ensure otherPortion is calculated correctly if not explicitly set
    if (variation.otherPortion === undefined && variation.investorPortion !== undefined) {
      scenarioInputs.otherPortion = Math.round((scenarioInputs.roundSize - scenarioInputs.investorPortion) * 100) / 100
    }
    
    // Validate that investor + other = round size (within rounding tolerance)
    const totalCheck = Math.round((scenarioInputs.investorPortion + scenarioInputs.otherPortion) * 100) / 100
    const roundSizeCheck = Math.round(scenarioInputs.roundSize * 100) / 100
    
    // Ensure valid values - no negative numbers and math adds up
    if (scenarioInputs.postMoneyVal <= 0 || 
        scenarioInputs.roundSize <= 0 || 
        scenarioInputs.investorPortion < 0 || 
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