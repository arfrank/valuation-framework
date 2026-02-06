/**
 * Enhanced calculation engine supporting multiple prior investors and founders
 * This replaces the legacy single pro-rata and founder ownership calculations
 */

import { migrateLegacyCompany, validateCompanyData } from './dataStructures'

/**
 * Calculate pro-rata allocation for prior investors with pro-rata rights
 * @param {Array} priorInvestors - Array of prior investor objects
 * @param {number} roundSize - Total round size
 * @returns {Object} Pro-rata calculation results
 */
function calculateProRataAllocations(priorInvestors, roundSize) {
  const proRataResults = []
  let totalProRataAmount = 0
  let totalProRataPercent = 0
  
  if (!Array.isArray(priorInvestors)) {
    return { proRataResults: [], totalProRataAmount: 0, totalProRataPercent: 0 }
  }
  
  priorInvestors.forEach(investor => {
    if (investor.hasProRataRights && investor.ownershipPercent > 0) {
      // Pro-rata amount = (their ownership % / 100) * round size
      const proRataAmount = Math.round((investor.ownershipPercent / 100) * roundSize * 100) / 100
      const proRataPercent = Math.round((proRataAmount / roundSize) * 10000) / 100
      
      proRataResults.push({
        id: investor.id,
        name: investor.name,
        preRoundOwnership: investor.ownershipPercent,
        proRataAmount,
        proRataPercent,
        hasRights: true
      })
      
      totalProRataAmount += proRataAmount
      totalProRataPercent += proRataPercent
    } else {
      // Include non-pro-rata investors for completeness
      proRataResults.push({
        id: investor.id,
        name: investor.name,
        preRoundOwnership: investor.ownershipPercent,
        proRataAmount: 0,
        proRataPercent: 0,
        hasRights: investor.hasProRataRights
      })
    }
  })
  
  return {
    proRataResults,
    totalProRataAmount: Math.round(totalProRataAmount * 100) / 100,
    totalProRataPercent: Math.round(totalProRataPercent * 100) / 100
  }
}

/**
 * Calculate SAFE conversions (unchanged from original logic)
 */
function calculateSafeConversions(safes, preMoneyVal) {
  let totalSafePercent = 0
  let totalSafeAmount = 0
  let safeDetails = []
  
  if (safes && safes.length > 0) {
    safes.forEach((safe, index) => {
      if (safe.amount > 0) {
        let conversionPrice = 0
        
        if (safe.cap > 0 && safe.discount > 0) {
          const capPrice = safe.cap
          const discountPrice = preMoneyVal * (1 - safe.discount / 100)
          conversionPrice = Math.min(capPrice, discountPrice)
        } else if (safe.cap > 0) {
          conversionPrice = Math.min(safe.cap, preMoneyVal)
        } else if (safe.discount > 0) {
          conversionPrice = preMoneyVal * (1 - safe.discount / 100)
        } else {
          conversionPrice = preMoneyVal
        }
        
        if (conversionPrice > 0) {
          const safePercent = Math.round((safe.amount / conversionPrice) * 10000) / 100
          
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
        }
      }
    })
  }
  
  return {
    totalSafePercent: Math.round(totalSafePercent * 100) / 100,
    totalSafeAmount: Math.round(totalSafeAmount * 100) / 100,
    safeDetails
  }
}

/**
 * Calculate ESOP dilution and timing effects (unchanged from original logic)
 */
function calculateEsopEffects(currentEsopPercent, targetEsopPercent, esopTiming, roundPercent) {
  let esopIncrease = 0
  let esopIncreasePreClose = 0
  let esopIncreasePostClose = 0
  let finalEsopPercent = targetEsopPercent
  
  if (targetEsopPercent > 0) {
    const naturalDilutedEsop = Math.round(currentEsopPercent * (100 - roundPercent) / 100 * 100) / 100
    
    if (targetEsopPercent > naturalDilutedEsop) {
      esopIncrease = Math.round((targetEsopPercent - naturalDilutedEsop) * 100) / 100
      
      if (esopTiming === 'pre-close') {
        esopIncreasePreClose = esopIncrease
      } else {
        esopIncreasePostClose = esopIncrease
      }
    }
  } else if (targetEsopPercent === 0 && currentEsopPercent > 0) {
    finalEsopPercent = Math.round(currentEsopPercent * (100 - roundPercent) / 100 * 100) / 100
  }
  
  return {
    esopIncrease,
    esopIncreasePreClose,
    esopIncreasePostClose,
    finalEsopPercent
  }
}

/**
 * Main calculation function for enhanced multi-party scenarios
 * @param {Object} inputs - Company data with new multi-party structures
 * @returns {Object} Calculation results
 */
export function calculateEnhancedScenario(inputs) {
  // First migrate any legacy data
  const migratedInputs = migrateLegacyCompany(inputs)
  
  // Validate the company data - but don't fail hard on validation errors for now
  const validation = validateCompanyData(migratedInputs)
  if (!validation.success) {
    console.warn('Company data validation failed (continuing anyway):', validation.errors)
    // Continue with calculation anyway for backwards compatibility
  }
  
  const { 
    postMoneyVal, 
    roundSize, 
    investorPortion, 
    otherPortion,
    investorName = 'US',
    showAdvanced = false,
    // New multi-party structures
    priorInvestors = [],
    founders = [],
    // SAFE and ESOP (unchanged)
    safes = [],
    currentEsopPercent = 0,
    targetEsopPercent = 0,
    esopTiming = 'pre-close'
  } = migratedInputs
  
  // When showAdvanced is false, ignore all advanced inputs
  const effectivePriorInvestors = showAdvanced ? priorInvestors : []
  const effectiveFounders = showAdvanced ? founders : []
  const effectiveSafes = showAdvanced ? safes : []
  const effectiveCurrentEsopPercent = showAdvanced ? currentEsopPercent : 0
  const effectiveTargetEsopPercent = showAdvanced ? targetEsopPercent : 0
  
  // Check if pre-round ownership exceeds 100% and return error if so
  const totalPreRoundOwnership = (effectivePriorInvestors.reduce((sum, inv) => sum + (inv.ownershipPercent || 0), 0)) +
                                  (effectiveFounders.reduce((sum, f) => sum + (f.ownershipPercent || 0), 0))
  
  if (totalPreRoundOwnership > 100) {
    console.error(`Pre-round ownership totals ${totalPreRoundOwnership.toFixed(1)}% which exceeds 100%. Cannot calculate scenario.`)
    return null
  }
  
  // Use effective values (will be empty arrays when showAdvanced is false)
  const scaledPriorInvestors = effectivePriorInvestors
  const scaledFounders = effectiveFounders
  
  // Validate basic inputs
  if (postMoneyVal <= 0 || roundSize <= 0 || postMoneyVal <= roundSize) {
    return null
  }
  
  const preMoneyVal = Math.round((postMoneyVal - roundSize) * 100) / 100
  
  // Calculate pro-rata allocations for prior investors (using scaled values)
  const proRataCalc = calculateProRataAllocations(scaledPriorInvestors, roundSize)
  
  // Pro-rata comes from the "Other" portion, not from round size
  // Validate that pro-rata doesn't exceed the "Other" portion
  if (proRataCalc.totalProRataAmount > otherPortion) {
    // Return an error object that can be handled by the UI
    return {
      error: true,
      errorMessage: `Total pro-rata amount ($${proRataCalc.totalProRataAmount.toFixed(2)}M) exceeds available "Other" portion ($${otherPortion.toFixed(2)}M). Please reduce pro-rata rights or increase "Other" portion.`,
      proRataAmount: proRataCalc.totalProRataAmount,
      otherPortion,
      roundSize,
      postMoneyVal,
      preMoneyVal
    }
  }
  
  const actualProRataAmount = proRataCalc.totalProRataAmount
  
  // Adjust investor portions - investor stays the same, other is reduced by pro-rata
  const adjustedInvestorPortion = investorPortion
  const adjustedOtherPortion = Math.round((otherPortion - actualProRataAmount) * 100) / 100
  
  // Calculate SAFE conversions
  const safeCalc = calculateSafeConversions(effectiveSafes, preMoneyVal)
  
  // Calculate ownership percentages on post-money basis
  const roundPercent = Math.round((roundSize / postMoneyVal) * 10000) / 100
  const investorPercent = Math.round((adjustedInvestorPortion / postMoneyVal) * 10000) / 100
  const otherPercent = Math.round((adjustedOtherPortion / postMoneyVal) * 10000) / 100
  
  // Calculate ESOP effects
  const esopCalc = calculateEsopEffects(effectiveCurrentEsopPercent, effectiveTargetEsopPercent, esopTiming, roundPercent)
  
  // Adjust round percentage for post-close ESOP dilution
  let finalRoundPercent = roundPercent
  if (esopCalc.esopIncreasePostClose > 0) {
    finalRoundPercent = Math.round(roundPercent * (100 - esopCalc.esopIncreasePostClose) / 100 * 100) / 100
  }
  
  // Calculate post-round ownership for each stakeholder group
  const totalNewOwnership = finalRoundPercent + safeCalc.totalSafePercent + esopCalc.esopIncreasePreClose
  
  // Calculate post-round ownership for prior investors (with pro-rata)
  const postRoundPriorInvestors = scaledPriorInvestors.map(investor => {
    const preRoundPercent = investor.ownershipPercent
    let postRoundPercent = Math.round(preRoundPercent * (100 - totalNewOwnership) / 100 * 100) / 100
    
    // Add pro-rata participation
    const proRataEntry = proRataCalc.proRataResults.find(pr => pr.id === investor.id)
    if (proRataEntry && proRataEntry.proRataAmount > 0) {
      const proRataOwnershipPercent = Math.round((proRataEntry.proRataAmount / postMoneyVal) * 10000) / 100
      postRoundPercent += proRataOwnershipPercent
    }
    
    // Apply post-close ESOP dilution
    if (esopCalc.esopIncreasePostClose > 0) {
      postRoundPercent = Math.round(postRoundPercent * (100 - esopCalc.esopIncreasePostClose) / 100 * 100) / 100
    }
    
    return {
      ...investor,
      postRoundPercent: Math.round(postRoundPercent * 100) / 100,
      proRataAmount: proRataEntry ? proRataEntry.proRataAmount : 0,
      dilution: Math.round((preRoundPercent - postRoundPercent) * 100) / 100
    }
  })
  
  // Calculate post-round ownership for founders
  const postRoundFounders = scaledFounders.map(founder => {
    const preRoundPercent = founder.ownershipPercent
    let postRoundPercent = Math.round(preRoundPercent * (100 - totalNewOwnership) / 100 * 100) / 100
    
    // Apply post-close ESOP dilution
    if (esopCalc.esopIncreasePostClose > 0) {
      postRoundPercent = Math.round(postRoundPercent * (100 - esopCalc.esopIncreasePostClose) / 100 * 100) / 100
    }
    
    return {
      ...founder,
      postRoundPercent: Math.round(postRoundPercent * 100) / 100,
      dilution: Math.round((preRoundPercent - postRoundPercent) * 100) / 100
    }
  })
  
  // Calculate total ownership for verification
  const totalPriorInvestorOwnership = postRoundPriorInvestors.reduce((sum, inv) => sum + inv.postRoundPercent, 0)
  const totalFounderOwnership = postRoundFounders.reduce((sum, founder) => sum + founder.postRoundPercent, 0)
  const totalAccountedOwnership = finalRoundPercent + safeCalc.totalSafePercent + totalPriorInvestorOwnership + totalFounderOwnership + esopCalc.finalEsopPercent
  
  // Calculate unknown ownership (what's not accounted for)
  const unknownOwnership = Math.round((100 - totalAccountedOwnership) * 100) / 100

  // Detect if investorName matches a prior investor - combine them in results
  const matchedPriorInvestor = postRoundPriorInvestors.find(inv => inv.name === investorName)
  let combinedInvestor = null

  if (matchedPriorInvestor) {
    // Apply post-close ESOP dilution to investor's round ownership for consistency
    let adjustedInvestorRoundPercent = investorPercent
    if (esopCalc.esopIncreasePostClose > 0) {
      adjustedInvestorRoundPercent = Math.round(investorPercent * (100 - esopCalc.esopIncreasePostClose) / 100 * 100) / 100
    }

    combinedInvestor = {
      id: matchedPriorInvestor.id,
      name: investorName,
      // Total new money this round (investor portion + pro-rata)
      totalNewInvestment: Math.round((adjustedInvestorPortion + (matchedPriorInvestor.proRataAmount || 0)) * 100) / 100,
      // Total post-round ownership (new round ownership + diluted prior ownership including pro-rata)
      totalOwnership: Math.round((adjustedInvestorRoundPercent + matchedPriorInvestor.postRoundPercent) * 100) / 100,
      // Breakdown components
      investorPortion: adjustedInvestorPortion,
      proRataAmount: matchedPriorInvestor.proRataAmount || 0,
      investorRoundPercent: adjustedInvestorRoundPercent,
      priorDilutedPercent: matchedPriorInvestor.postRoundPercent,
      priorOriginalPercent: matchedPriorInvestor.ownershipPercent,
    }
  }

  return {
    // Basic valuation info
    postMoneyVal: postMoneyVal || 13,
    roundSize: roundSize || 3,
    preMoneyVal: preMoneyVal || 10,
    investorName: investorName || 'US',
    
    // Round composition - ensure no undefined values
    newMoneyAmount: roundSize || 0,
    investorAmount: adjustedInvestorPortion || 0,
    investorPercent: investorPercent || 0,
    otherAmount: adjustedOtherPortion || 0,
    otherPercent: otherPercent || 0,
    otherAmountOriginal: otherPortion || 0, // Original other amount before pro-rata adjustment
    roundPercent: finalRoundPercent || 0,
    
    // Total round details for legacy compatibility
    totalAmount: roundSize || 3,
    totalPercent: finalRoundPercent || 0,
    
    // Pro-rata details
    totalProRataAmount: actualProRataAmount || 0,
    totalProRataPercent: Math.round((actualProRataAmount / postMoneyVal) * 10000) / 100,
    proRataAmount: actualProRataAmount || 0,
    proRataPercent: Math.round((actualProRataAmount / postMoneyVal) * 10000) / 100,
    proRataDetails: proRataCalc.proRataResults || [],
    
    // SAFE details
    totalSafeAmount: safeCalc.totalSafeAmount || 0,
    totalSafePercent: safeCalc.totalSafePercent || 0,
    safeDetails: safeCalc.safeDetails || [],
    safes: effectiveSafes || [],
    
    // ESOP details
    currentEsopPercent: effectiveCurrentEsopPercent || 0,
    targetEsopPercent: effectiveTargetEsopPercent || 0,
    finalEsopPercent: esopCalc.finalEsopPercent || 0,
    esopIncrease: esopCalc.esopIncrease || 0,
    esopIncreasePreClose: esopCalc.esopIncreasePreClose || 0,
    esopIncreasePostClose: esopCalc.esopIncreasePostClose || 0,
    esopTiming: esopTiming || 'pre-close',
    
    // Multi-party ownership results
    priorInvestors: postRoundPriorInvestors || [],
    founders: postRoundFounders || [],
    combinedInvestor: combinedInvestor,
    
    // Legacy compatibility (aggregate founder data) - ensure no undefined
    postRoundFounderPercent: Math.round((postRoundFounders.reduce((sum, f) => sum + (f.postRoundPercent || 0), 0)) * 100) / 100,
    preRoundFounderPercent: Math.round((scaledFounders.reduce((sum, f) => sum + (f.ownershipPercent || 0), 0)) * 100) / 100,
    founderDilution: Math.round((scaledFounders.reduce((sum, f) => sum + (f.ownershipPercent || 0), 0) - postRoundFounders.reduce((sum, f) => sum + (f.postRoundPercent || 0), 0)) * 100) / 100,
    
    // Total verification and unknown ownership
    totalOwnership: Math.round(totalAccountedOwnership * 100) / 100,
    unknownOwnership: unknownOwnership
  }
}

/**
 * Generate scenarios using the enhanced calculation engine
 * @param {Object} company - Company data
 * @returns {Array} Array of scenario results
 */
export function calculateEnhancedScenarios(company) {
  const baseScenario = calculateEnhancedScenario(company)
  
  if (!baseScenario) {
    return []
  }
  
  // Check if base scenario is an error
  if (baseScenario.error) {
    return baseScenario  // Return the error object directly
  }
  
  const scenarios = [{
    ...baseScenario,
    title: 'Base Case',
    isBase: true
  }]
  
  // Generate 10 alternative scenarios with varied parameters
  const scenarioVariations = [
    { multiplier: 0.5, roundMultiplier: 1.0, title: '0.5x Valuation' },
    { multiplier: 0.75, roundMultiplier: 1.0, title: '0.75x Valuation' },
    { multiplier: 0.9, roundMultiplier: 1.0, title: '0.9x Valuation' },
    { multiplier: 1.1, roundMultiplier: 1.0, title: '1.1x Valuation' },
    { multiplier: 1.25, roundMultiplier: 1.0, title: '1.25x Valuation' },
    { multiplier: 1.5, roundMultiplier: 1.0, title: '1.5x Valuation' },
    { multiplier: 2.0, roundMultiplier: 1.0, title: '2x Valuation' },
    { multiplier: 1.0, roundMultiplier: 0.5, title: 'Half Round Size' },
    { multiplier: 1.0, roundMultiplier: 1.5, title: '1.5x Round Size' },
    { multiplier: 1.5, roundMultiplier: 1.5, title: '1.5x Val & Round' }
  ]
  
  scenarioVariations.forEach((variation, _index) => {
    const adjustedPostMoney = Math.round(company.postMoneyVal * variation.multiplier * 100) / 100
    const adjustedRoundSize = Math.round(company.roundSize * variation.roundMultiplier * 100) / 100
    const adjustedInvestorPortion = Math.round(company.investorPortion * variation.roundMultiplier * 100) / 100
    const adjustedOtherPortion = Math.round((adjustedRoundSize - adjustedInvestorPortion) * 100) / 100
    
    const scenarioInputs = {
      ...company,
      postMoneyVal: adjustedPostMoney,
      roundSize: adjustedRoundSize,
      investorPortion: adjustedInvestorPortion,
      otherPortion: adjustedOtherPortion
    }
    
    const scenario = calculateEnhancedScenario(scenarioInputs)
    if (scenario && !scenario.error) {  // Skip error scenarios
      scenarios.push({
        ...scenario,
        title: variation.title,
        isBase: false
      })
    }
  })
  
  return scenarios
}