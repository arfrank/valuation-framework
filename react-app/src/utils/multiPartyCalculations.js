/**
 * Enhanced calculation engine supporting multiple prior investors and founders
 * This replaces the legacy single pro-rata and founder ownership calculations
 */

import { migrateLegacyCompany, validateCompanyData } from './dataStructures'

// Use 6 decimal places internally for percentages so the UI can display up to 4
const P = 1e6
function rp(v) { return Math.round(v * P) / P }           // round a percentage value
function r2p(ratio) { return Math.round(ratio * 100 * P) / P } // ratio (0-1) → percentage
function r$(v) { return Math.round(v * 100) / 100 }        // round a dollar value to cents

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
      // Pro-rata amount: use override if set, otherwise calculate from ownership %
      const calculatedAmount = r$((investor.ownershipPercent / 100) * roundSize)
      const proRataAmount = (investor.proRataOverride != null && investor.proRataOverride >= 0)
        ? r$(investor.proRataOverride)
        : calculatedAmount
      const proRataPercent = r2p(proRataAmount / roundSize)

      proRataResults.push({
        id: investor.id,
        name: investor.name,
        preRoundOwnership: investor.ownershipPercent,
        proRataAmount,
        calculatedProRataAmount: calculatedAmount,
        proRataPercent,
        hasRights: true,
        isOverridden: investor.proRataOverride != null && investor.proRataOverride >= 0
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
        calculatedProRataAmount: 0,
        proRataPercent: 0,
        hasRights: investor.hasProRataRights,
        isOverridden: false
      })
    }
  })
  
  return {
    proRataResults,
    totalProRataAmount: r$(totalProRataAmount),
    totalProRataPercent: rp(totalProRataPercent)
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
          const safePercent = r2p(safe.amount / conversionPrice)
          
          if (safePercent <= 95) {
            totalSafePercent += safePercent
            totalSafeAmount += safe.amount
            
            safeDetails.push({
              id: safe.id,
              index: index + 1,
              amount: safe.amount,
              cap: safe.cap,
              discount: safe.discount,
              conversionPrice: r$(conversionPrice),
              percent: safePercent,
              investorName: safe.investorName || ''
            })
          }
        }
      }
    })
  }
  
  return {
    totalSafePercent: rp(totalSafePercent),
    totalSafeAmount: r$(totalSafeAmount),
    safeDetails
  }
}

/**
 * Calculate ESOP dilution and timing effects
 * @param {number} currentEsopPercent - Current ESOP pool percentage
 * @param {number} targetEsopPercent - Target ESOP pool percentage after round
 * @param {string} esopTiming - 'pre-close' or 'post-close'
 * @param {number} baseDilutionPercent - Total dilution from round + SAFEs (not including ESOP)
 */
function calculateEsopEffects(currentEsopPercent, targetEsopPercent, esopTiming, baseDilutionPercent) {
  let esopIncrease = 0
  let esopIncreasePreClose = 0
  let esopIncreasePostClose = 0
  let finalEsopPercent = targetEsopPercent

  if (targetEsopPercent > 0) {
    const naturalDilutedEsop = rp(currentEsopPercent * (100 - baseDilutionPercent) / 100)

    if (targetEsopPercent > naturalDilutedEsop) {
      const rawIncrease = targetEsopPercent - naturalDilutedEsop

      if (esopTiming === 'pre-close') {
        // Pre-close: ESOP increase dilutes existing ESOP pool too
        // Solve: currentEsop * (100 - baseDilution - X) / 100 + X = target
        const denominator = 1 - currentEsopPercent / 100
        esopIncrease = denominator > 0.01
          ? rp(rawIncrease / denominator)
          : rawIncrease
        esopIncreasePreClose = esopIncrease
      } else {
        // Post-close: ESOP increase dilutes everyone including already-diluted ESOP
        // Solve: naturalDiluted * (100 - X) / 100 + X = target
        const denominator = 1 - naturalDilutedEsop / 100
        esopIncrease = denominator > 0.01
          ? rp(rawIncrease / denominator)
          : rawIncrease
        esopIncreasePostClose = esopIncrease
      }

      // Cap at maximum feasible (can't dilute more than available space)
      const maxIncrease = Math.max(0, 100 - baseDilutionPercent)
      esopIncrease = Math.min(esopIncrease, maxIncrease)
      esopIncreasePreClose = Math.min(esopIncreasePreClose, maxIncrease)
      esopIncreasePostClose = Math.min(esopIncreasePostClose, maxIncrease)
    }
  } else if (targetEsopPercent === 0 && currentEsopPercent > 0) {
    finalEsopPercent = rp(currentEsopPercent * (100 - baseDilutionPercent) / 100)
  }

  return {
    esopIncrease,
    esopIncreasePreClose,
    esopIncreasePostClose,
    finalEsopPercent
  }
}

/**
 * Calculate a two-step round scenario where Step 1 is at V1 and Step 2 at V2
 * @param {Object} inputs - Company data with two-step fields
 * @returns {Object} Calculation results with step breakdowns
 */
function calculateTwoStepScenario(inputs) {
  const migratedInputs = migrateLegacyCompany(inputs)

  const {
    postMoneyVal: V1,
    roundSize: S1,
    investorPortion: s1Investor,
    otherPortion: s1Other,
    investorName = 'US',
    showAdvanced = false,
    step2PostMoney: V2,
    step2Amount: S2,
    step2InvestorPortion: s2Investor,
    step2OtherPortion: s2Other,
    priorInvestors = [],
    founders = [],
    safes = [],
    currentEsopPercent = 0,
    targetEsopPercent = 0,
    esopTiming = 'pre-close'
  } = migratedInputs

  if (V1 <= 0 || S1 <= 0 || V1 <= S1 || V2 <= 0 || S2 <= 0 || V2 <= S2) {
    return null
  }

  const preMoneyV1 = r$(V1 - S1)
  const preMoneyV2 = r$(V2 - S2)

  const effectivePriorInvestors = showAdvanced ? priorInvestors : []
  const effectiveFounders = showAdvanced ? founders : []
  const effectiveSafes = showAdvanced ? safes : []
  const effectiveCurrentEsopPercent = showAdvanced ? currentEsopPercent : 0
  const effectiveTargetEsopPercent = showAdvanced ? targetEsopPercent : 0

  // --- SAFE conversions at step 1 pre-money ---
  const safeCalc = calculateSafeConversions(effectiveSafes, preMoneyV1)

  // --- Pro-rata from step 2's other portion ---
  const priorInvestorsForProRata = effectivePriorInvestors.map(inv =>
    inv.name === investorName ? { ...inv, hasProRataRights: false } : inv
  )
  const proRataCalc = calculateProRataAllocations(priorInvestorsForProRata, S2)

  // Pro-rata comes from step 2 other portion
  const actualProRataAmount = Math.min(proRataCalc.totalProRataAmount, s2Other)
  const adjustedS2Other = r$(s2Other - actualProRataAmount)

  // --- Step 1 ownership ---
  // Step 1 investors get S1/V1 of post-step-1 company
  const step1RoundPercent = r2p(S1 / V1)
  const step1InvestorPercent = r2p(s1Investor / V1)
  const step1OtherPercent = r2p(s1Other / V1)
  // Existing shareholders after step 1: (V1 - S1) / V1 minus SAFEs

  // --- Step 2 dilution on step 1 holders ---
  // Step 2 investors get S2/V2 of final company
  const step2RoundPercent = r2p(S2 / V2)
  const step2DilutionFactor = rp((V2 - S2) / V2 * 100) / 100 // fraction remaining after step 2

  // Final ownership after both steps
  const step1InvestorFinal = rp(step1InvestorPercent * step2DilutionFactor)
  const step1OtherFinal = rp(step1OtherPercent * step2DilutionFactor)
  const step1RoundFinal = rp(step1RoundPercent * step2DilutionFactor)

  const step2InvestorPercent = r2p(s2Investor / V2)
  const step2OtherPercent = r2p(adjustedS2Other / V2)
  const step2ProRataPercent = r2p(actualProRataAmount / V2)

  // Combined round ownership (step 1 diluted + step 2)
  const totalRoundPercent = rp(step1RoundFinal + step2RoundPercent)
  const totalInvestorPercent = rp(step1InvestorFinal + step2InvestorPercent)
  const totalOtherPercent = rp(step1OtherFinal + step2OtherPercent)

  // SAFEs diluted by both steps: convert at step 1 pre-money, then diluted by step 2
  const safeFinalPercent = rp(safeCalc.totalSafePercent * step2DilutionFactor)

  // --- ESOP ---
  const baseDilutionPercent = totalRoundPercent + safeFinalPercent
  const esopCalc = calculateEsopEffects(effectiveCurrentEsopPercent, effectiveTargetEsopPercent, esopTiming, baseDilutionPercent)

  // --- Prior investors ---
  const postRoundPriorInvestors = effectivePriorInvestors.map(investor => {
    const preRoundPercent = investor.ownershipPercent
    // Existing shareholders diluted by step 1 then step 2
    let postRoundPercent = rp(preRoundPercent * (100 - step1RoundPercent - safeCalc.totalSafePercent - esopCalc.esopIncreasePreClose) / 100 * step2DilutionFactor)

    // Add pro-rata participation from step 2
    const proRataEntry = proRataCalc.proRataResults.find(pr => pr.id === investor.id)
    if (proRataEntry && proRataEntry.proRataAmount > 0) {
      const proRataOwnershipPercent = r2p(Math.min(proRataEntry.proRataAmount, actualProRataAmount > 0 ? proRataEntry.proRataAmount : 0) / V2)
      postRoundPercent += proRataOwnershipPercent
    }

    // Apply post-close ESOP dilution
    if (esopCalc.esopIncreasePostClose > 0) {
      postRoundPercent = rp(postRoundPercent * (100 - esopCalc.esopIncreasePostClose) / 100)
    }

    return {
      ...investor,
      postRoundPercent: rp(postRoundPercent),
      proRataAmount: proRataEntry ? Math.min(proRataEntry.proRataAmount, actualProRataAmount > 0 ? proRataEntry.proRataAmount : 0) : 0,
      dilution: rp(preRoundPercent - postRoundPercent)
    }
  })

  // --- Founders ---
  const postRoundFounders = effectiveFounders.map(founder => {
    const preRoundPercent = founder.ownershipPercent
    let postRoundPercent = rp(preRoundPercent * (100 - step1RoundPercent - safeCalc.totalSafePercent - esopCalc.esopIncreasePreClose) / 100 * step2DilutionFactor)

    if (esopCalc.esopIncreasePostClose > 0) {
      postRoundPercent = rp(postRoundPercent * (100 - esopCalc.esopIncreasePostClose) / 100)
    }

    return {
      ...founder,
      postRoundPercent: rp(postRoundPercent),
      dilution: rp(preRoundPercent - postRoundPercent)
    }
  })

  // Apply post-close ESOP to round percentages
  let finalRoundPercent = totalRoundPercent
  let finalInvestorPercent = totalInvestorPercent
  let finalOtherPercent = totalOtherPercent
  if (esopCalc.esopIncreasePostClose > 0) {
    finalRoundPercent = rp(totalRoundPercent * (100 - esopCalc.esopIncreasePostClose) / 100)
    finalInvestorPercent = rp(totalInvestorPercent * (100 - esopCalc.esopIncreasePostClose) / 100)
    finalOtherPercent = rp(totalOtherPercent * (100 - esopCalc.esopIncreasePostClose) / 100)
  }

  // --- Combined investor detection ---
  const matchedPriorInvestor = postRoundPriorInvestors.find(inv => inv.name === investorName)
  let combinedInvestor = null
  if (matchedPriorInvestor) {
    combinedInvestor = {
      id: matchedPriorInvestor.id,
      name: investorName,
      totalNewInvestment: r$(s1Investor + s2Investor + (matchedPriorInvestor.proRataAmount || 0)),
      totalOwnership: rp(finalInvestorPercent + matchedPriorInvestor.postRoundPercent),
      investorPortion: s1Investor,
      proRataAmount: matchedPriorInvestor.proRataAmount || 0,
      investorRoundPercent: finalInvestorPercent,
      priorDilutedPercent: matchedPriorInvestor.postRoundPercent,
      priorOriginalPercent: matchedPriorInvestor.ownershipPercent,
      safePercent: 0,
    }
  }

  // Compute diluted SAFE details once (reused in return and SAFE attribution)
  const dilutedSafeDetails = safeCalc.safeDetails.map(d => ({
    ...d,
    percent: rp(d.percent * step2DilutionFactor)
  }))

  // Calculate SAFE ownership attributed to the lead investor
  let investorSafePercent = 0
  dilutedSafeDetails.forEach(safe => {
    if (safe.investorName && safe.investorName === investorName) {
      let safeOwnership = safe.percent
      if (esopCalc.esopIncreasePostClose > 0) {
        safeOwnership = rp(safeOwnership * (100 - esopCalc.esopIncreasePostClose) / 100)
      }
      investorSafePercent = rp(investorSafePercent + safeOwnership)
    }
  })

  if (combinedInvestor) {
    combinedInvestor.safePercent = investorSafePercent
    combinedInvestor.totalOwnership = rp(
      combinedInvestor.investorRoundPercent +
      combinedInvestor.priorDilutedPercent +
      investorSafePercent
    )
  } else {
    // Always create combinedInvestor so the summary section renders
    combinedInvestor = {
      name: investorName,
      totalNewInvestment: r$(s1Investor + s2Investor),
      totalOwnership: rp(finalInvestorPercent + investorSafePercent),
      investorPortion: s1Investor,
      proRataAmount: 0,
      investorRoundPercent: finalInvestorPercent,
      priorDilutedPercent: 0,
      priorOriginalPercent: 0,
      safePercent: investorSafePercent,
    }
  }

  // --- Totals for verification ---
  const totalPriorInvestorOwnership = postRoundPriorInvestors.reduce((sum, inv) => sum + inv.postRoundPercent, 0)
  const totalFounderOwnership = postRoundFounders.reduce((sum, founder) => sum + founder.postRoundPercent, 0)

  let proRataOwnershipInRound = r2p(actualProRataAmount / V2)
  if (esopCalc.esopIncreasePostClose > 0) {
    proRataOwnershipInRound = rp(proRataOwnershipInRound * (100 - esopCalc.esopIncreasePostClose) / 100)
  }

  const totalAccountedOwnership = finalRoundPercent + safeFinalPercent
    + totalPriorInvestorOwnership + totalFounderOwnership + esopCalc.finalEsopPercent
    - proRataOwnershipInRound
  const unknownOwnership = rp(100 - totalAccountedOwnership)

  const preRoundTrackedOwnership = effectivePriorInvestors.reduce((sum, inv) => sum + (inv.ownershipPercent || 0), 0)
    + effectiveFounders.reduce((sum, f) => sum + (f.ownershipPercent || 0), 0)
    + effectiveCurrentEsopPercent
  const preRoundUnknownPercent = Math.max(0, rp(100 - preRoundTrackedOwnership))

  // --- Analytics ---
  const totalRoundAmount = r$(S1 + S2)
  // Lead's blended effective post-money: total lead $ / total lead % * 100
  const totalLeadDollars = s1Investor + s2Investor
  const totalLeadRawPercent = r2p(s1Investor / V1) + r2p(s2Investor / V2)
  const leadEffectivePostMoney = totalLeadRawPercent > 0 ? r$(totalLeadDollars / (totalLeadRawPercent / 100)) : 0
  const instantMarkup = V1 > 0 ? rp((V2 / V1 - 1) * 100) : 0

  return {
    // Basic valuation info
    postMoneyVal: V1,
    roundSize: r$(S1 + S2),
    preMoneyVal: preMoneyV1,
    investorName,
    twoStepEnabled: true,

    // Round composition — combined from both steps
    newMoneyAmount: totalRoundAmount,
    investorAmount: r$(s1Investor + s2Investor),
    investorPercent: finalInvestorPercent,
    otherAmount: r$(s1Other + adjustedS2Other),
    otherPercent: finalOtherPercent,
    otherAmountOriginal: r$(s1Other + s2Other),
    roundPercent: finalRoundPercent,

    // Total round details
    totalAmount: totalRoundAmount,
    totalPercent: finalRoundPercent,

    // Pro-rata details
    totalProRataAmount: actualProRataAmount,
    totalProRataPercent: r2p(actualProRataAmount / V2),
    proRataAmount: actualProRataAmount,
    proRataPercent: r2p(actualProRataAmount / V2),
    proRataDetails: proRataCalc.proRataResults,

    // SAFE details
    totalSafeAmount: safeCalc.totalSafeAmount,
    totalSafePercent: safeFinalPercent,
    safeDetails: dilutedSafeDetails,
    safes: effectiveSafes,

    // ESOP details
    currentEsopPercent: effectiveCurrentEsopPercent,
    targetEsopPercent: effectiveTargetEsopPercent,
    finalEsopPercent: esopCalc.finalEsopPercent,
    esopIncrease: esopCalc.esopIncrease,
    esopIncreasePreClose: esopCalc.esopIncreasePreClose,
    esopIncreasePostClose: esopCalc.esopIncreasePostClose,
    esopTiming,

    // Multi-party ownership results
    priorInvestors: postRoundPriorInvestors,
    founders: postRoundFounders,
    combinedInvestor,

    // Legacy compatibility
    postRoundFounderPercent: rp(postRoundFounders.reduce((sum, f) => sum + (f.postRoundPercent || 0), 0)),
    preRoundFounderPercent: rp(effectiveFounders.reduce((sum, f) => sum + (f.ownershipPercent || 0), 0)),
    founderDilution: rp(effectiveFounders.reduce((sum, f) => sum + (f.ownershipPercent || 0), 0) - postRoundFounders.reduce((sum, f) => sum + (f.postRoundPercent || 0), 0)),

    totalOwnership: rp(totalAccountedOwnership),
    unknownOwnership,
    preRoundUnknownPercent,

    // 2-step specific data
    step1: {
      postMoney: V1,
      preMoney: preMoneyV1,
      amount: S1,
      investorAmount: s1Investor,
      otherAmount: s1Other,
      rawPercent: step1RoundPercent,
      finalPercent: rp(esopCalc.esopIncreasePostClose > 0
        ? step1RoundFinal * (100 - esopCalc.esopIncreasePostClose) / 100
        : step1RoundFinal),
      investorPercent: rp(esopCalc.esopIncreasePostClose > 0
        ? step1InvestorFinal * (100 - esopCalc.esopIncreasePostClose) / 100
        : step1InvestorFinal),
      otherPercent: rp(esopCalc.esopIncreasePostClose > 0
        ? step1OtherFinal * (100 - esopCalc.esopIncreasePostClose) / 100
        : step1OtherFinal),
    },
    step2: {
      postMoney: V2,
      preMoney: preMoneyV2,
      amount: S2,
      investorAmount: s2Investor,
      otherAmount: s2Other,
      percent: rp(esopCalc.esopIncreasePostClose > 0
        ? step2RoundPercent * (100 - esopCalc.esopIncreasePostClose) / 100
        : step2RoundPercent),
      investorPercent: rp(esopCalc.esopIncreasePostClose > 0
        ? step2InvestorPercent * (100 - esopCalc.esopIncreasePostClose) / 100
        : step2InvestorPercent),
      otherPercent: rp(esopCalc.esopIncreasePostClose > 0
        ? (step2OtherPercent + step2ProRataPercent) * (100 - esopCalc.esopIncreasePostClose) / 100
        : (step2OtherPercent + step2ProRataPercent)),
    },
    analytics: {
      blendedPostMoney: r$(totalRoundAmount / (finalRoundPercent / 100)),
      blendedPreMoney: r$(totalRoundAmount / (finalRoundPercent / 100) - totalRoundAmount),
      leadEffectivePostMoney,
      instantMarkup,
      headlineValuation: V2,
    }
  }
}

/**
 * Main calculation function for enhanced multi-party scenarios
 * @param {Object} inputs - Company data with new multi-party structures
 * @returns {Object} Calculation results
 */
export function calculateEnhancedScenario(inputs) {
  // Route to two-step calculation if enabled with valid step 2 inputs
  if (inputs && inputs.twoStepEnabled && inputs.step2PostMoney > 0 && inputs.step2Amount > 0) {
    return calculateTwoStepScenario(inputs)
  }

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
  
  const preMoneyVal = r$(postMoneyVal - roundSize)
  
  // Calculate pro-rata allocations for prior investors (using scaled values)
  // If a prior investor matches the lead investor name, skip their pro-rata —
  // their participation in the round already covers their pro-rata rights
  const priorInvestorsForProRata = scaledPriorInvestors.map(inv =>
    inv.name === investorName ? { ...inv, hasProRataRights: false } : inv
  )
  const proRataCalc = calculateProRataAllocations(priorInvestorsForProRata, roundSize)
  
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
  const adjustedOtherPortion = r$(otherPortion - actualProRataAmount)
  
  // Calculate SAFE conversions
  const safeCalc = calculateSafeConversions(effectiveSafes, preMoneyVal)
  
  // Calculate ownership percentages on post-money basis
  const roundPercent = r2p(roundSize / postMoneyVal)
  let investorPercent = r2p(adjustedInvestorPortion / postMoneyVal)
  let otherPercent = r2p(adjustedOtherPortion / postMoneyVal)

  // Calculate ESOP effects — pass round + SAFEs as the base dilution
  const baseDilutionPercent = roundPercent + safeCalc.totalSafePercent
  const esopCalc = calculateEsopEffects(effectiveCurrentEsopPercent, effectiveTargetEsopPercent, esopTiming, baseDilutionPercent)

  // Adjust round percentage for post-close ESOP dilution
  let finalRoundPercent = roundPercent
  if (esopCalc.esopIncreasePostClose > 0) {
    finalRoundPercent = rp(roundPercent * (100 - esopCalc.esopIncreasePostClose) / 100)
    // Also adjust investor/other sub-percentages so they sum to finalRoundPercent
    investorPercent = rp(investorPercent * (100 - esopCalc.esopIncreasePostClose) / 100)
    otherPercent = rp(otherPercent * (100 - esopCalc.esopIncreasePostClose) / 100)
  }

  // Calculate post-round ownership for each stakeholder group
  // Always use original roundPercent: for pre-close, esopIncreasePreClose is added;
  // for post-close, esopIncreasePreClose is 0 and ESOP is applied separately below
  const totalNewOwnership = roundPercent + safeCalc.totalSafePercent + esopCalc.esopIncreasePreClose
  
  // Calculate post-round ownership for prior investors (with pro-rata)
  const postRoundPriorInvestors = scaledPriorInvestors.map(investor => {
    const preRoundPercent = investor.ownershipPercent
    let postRoundPercent = rp(preRoundPercent * (100 - totalNewOwnership) / 100)

    // Add pro-rata participation
    const proRataEntry = proRataCalc.proRataResults.find(pr => pr.id === investor.id)
    if (proRataEntry && proRataEntry.proRataAmount > 0) {
      const proRataOwnershipPercent = r2p(proRataEntry.proRataAmount / postMoneyVal)
      postRoundPercent += proRataOwnershipPercent
    }

    // Apply post-close ESOP dilution
    if (esopCalc.esopIncreasePostClose > 0) {
      postRoundPercent = rp(postRoundPercent * (100 - esopCalc.esopIncreasePostClose) / 100)
    }

    return {
      ...investor,
      postRoundPercent: rp(postRoundPercent),
      proRataAmount: proRataEntry ? proRataEntry.proRataAmount : 0,
      dilution: rp(preRoundPercent - postRoundPercent)
    }
  })
  
  // Calculate post-round ownership for founders
  const postRoundFounders = scaledFounders.map(founder => {
    const preRoundPercent = founder.ownershipPercent
    let postRoundPercent = rp(preRoundPercent * (100 - totalNewOwnership) / 100)

    // Apply post-close ESOP dilution
    if (esopCalc.esopIncreasePostClose > 0) {
      postRoundPercent = rp(postRoundPercent * (100 - esopCalc.esopIncreasePostClose) / 100)
    }

    return {
      ...founder,
      postRoundPercent: rp(postRoundPercent),
      dilution: rp(preRoundPercent - postRoundPercent)
    }
  })
  
  // Calculate total ownership for verification
  const totalPriorInvestorOwnership = postRoundPriorInvestors.reduce((sum, inv) => sum + inv.postRoundPercent, 0)
  const totalFounderOwnership = postRoundFounders.reduce((sum, founder) => sum + founder.postRoundPercent, 0)

  // Pro-rata ownership is already included in roundPercent (since pro-rata money is part of the round)
  // AND in each prior investor's postRoundPercent. Subtract to avoid double-counting.
  let proRataOwnershipInRound = r2p(actualProRataAmount / postMoneyVal)
  if (esopCalc.esopIncreasePostClose > 0) {
    proRataOwnershipInRound = rp(proRataOwnershipInRound * (100 - esopCalc.esopIncreasePostClose) / 100)
  }

  const totalAccountedOwnership = finalRoundPercent + safeCalc.totalSafePercent
    + totalPriorInvestorOwnership + totalFounderOwnership + esopCalc.finalEsopPercent
    - proRataOwnershipInRound

  // Calculate unknown ownership (what's not accounted for)
  const unknownOwnership = rp(100 - totalAccountedOwnership)

  // Calculate pre-round unknown ownership directly (avoids lossy back-calculation)
  const preRoundTrackedOwnership = (scaledPriorInvestors.reduce((sum, inv) => sum + (inv.ownershipPercent || 0), 0))
    + (scaledFounders.reduce((sum, f) => sum + (f.ownershipPercent || 0), 0))
    + effectiveCurrentEsopPercent
  const preRoundUnknownPercent = Math.max(0, rp(100 - preRoundTrackedOwnership))

  // Detect if investorName matches a prior investor - combine them in results
  const matchedPriorInvestor = postRoundPriorInvestors.find(inv => inv.name === investorName)
  let combinedInvestor = null

  if (matchedPriorInvestor) {
    // investorPercent is already adjusted for post-close ESOP dilution if applicable
    combinedInvestor = {
      id: matchedPriorInvestor.id,
      name: investorName,
      // Total new money this round (investor portion + pro-rata)
      totalNewInvestment: r$(adjustedInvestorPortion + (matchedPriorInvestor.proRataAmount || 0)),
      // Total post-round ownership (updated below to include SAFEs)
      totalOwnership: rp(investorPercent + matchedPriorInvestor.postRoundPercent),
      // Breakdown components
      investorPortion: adjustedInvestorPortion,
      proRataAmount: matchedPriorInvestor.proRataAmount || 0,
      investorRoundPercent: investorPercent,
      priorDilutedPercent: matchedPriorInvestor.postRoundPercent,
      priorOriginalPercent: matchedPriorInvestor.ownershipPercent,
      safePercent: 0,
    }
  }

  // Calculate SAFE ownership attributed to the lead investor
  let investorSafePercent = 0
  if (safeCalc.safeDetails && safeCalc.safeDetails.length > 0) {
    safeCalc.safeDetails.forEach(safe => {
      if (safe.investorName && safe.investorName === investorName) {
        let safeOwnership = safe.percent
        if (esopCalc.esopIncreasePostClose > 0) {
          safeOwnership = rp(safeOwnership * (100 - esopCalc.esopIncreasePostClose) / 100)
        }
        investorSafePercent = rp(investorSafePercent + safeOwnership)
      }
    })
  }

  if (combinedInvestor) {
    combinedInvestor.safePercent = investorSafePercent
    combinedInvestor.totalOwnership = rp(
      combinedInvestor.investorRoundPercent +
      combinedInvestor.priorDilutedPercent +
      investorSafePercent
    )
  } else {
    // Always create combinedInvestor so the summary section renders
    combinedInvestor = {
      name: investorName,
      totalNewInvestment: r$(adjustedInvestorPortion),
      totalOwnership: rp(investorPercent + investorSafePercent),
      investorPortion: adjustedInvestorPortion,
      proRataAmount: 0,
      investorRoundPercent: investorPercent,
      priorDilutedPercent: 0,
      priorOriginalPercent: 0,
      safePercent: investorSafePercent,
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
    totalProRataPercent: r2p(actualProRataAmount / postMoneyVal),
    proRataAmount: actualProRataAmount || 0,
    proRataPercent: r2p(actualProRataAmount / postMoneyVal),
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
    postRoundFounderPercent: rp(postRoundFounders.reduce((sum, f) => sum + (f.postRoundPercent || 0), 0)),
    preRoundFounderPercent: rp(scaledFounders.reduce((sum, f) => sum + (f.ownershipPercent || 0), 0)),
    founderDilution: rp(scaledFounders.reduce((sum, f) => sum + (f.ownershipPercent || 0), 0) - postRoundFounders.reduce((sum, f) => sum + (f.postRoundPercent || 0), 0)),

    // Total verification and unknown ownership
    totalOwnership: rp(totalAccountedOwnership),
    unknownOwnership: unknownOwnership,
    preRoundUnknownPercent: preRoundUnknownPercent
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
  
  const isTwoStep = company.twoStepEnabled && company.step2PostMoney > 0 && company.step2Amount > 0

  scenarioVariations.forEach((variation, _index) => {
    const adjustedPostMoney = r$(company.postMoneyVal * variation.multiplier)
    const adjustedRoundSize = r$(company.roundSize * variation.roundMultiplier)
    const adjustedInvestorPortion = r$(company.investorPortion * variation.roundMultiplier)
    const adjustedOtherPortion = r$(adjustedRoundSize - adjustedInvestorPortion)

    const scenarioInputs = {
      ...company,
      postMoneyVal: adjustedPostMoney,
      roundSize: adjustedRoundSize,
      investorPortion: adjustedInvestorPortion,
      otherPortion: adjustedOtherPortion
    }

    // Scale step 2 values proportionally for two-step scenarios
    if (isTwoStep) {
      scenarioInputs.step2PostMoney = r$(company.step2PostMoney * variation.multiplier)
      scenarioInputs.step2Amount = r$(company.step2Amount * variation.roundMultiplier)
      scenarioInputs.step2InvestorPortion = r$(company.step2InvestorPortion * variation.roundMultiplier)
      scenarioInputs.step2OtherPortion = r$(scenarioInputs.step2Amount - scenarioInputs.step2InvestorPortion)
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