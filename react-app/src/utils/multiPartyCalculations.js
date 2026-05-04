/**
 * Enhanced calculation engine supporting multiple prior investors and founders
 * This replaces the legacy single pro-rata and founder ownership calculations
 */

import { migrateLegacyCompany, validateCompanyData } from './dataStructures'
import { buildScenarioOffsets, formatScenarioOffsetValue, normalizeScenarioOffsets } from './scenarioOffsets'

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
export function calculateSafeConversions(safes, preMoneyVal) {
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
              investorName: safe.investorName || '',
              proRata: Boolean(safe.proRata),
              proRataOverride: (safe.proRataOverride != null && safe.proRataOverride >= 0)
                ? Number(safe.proRataOverride)
                : null
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
 * Calculate pro-rata allocation for SAFEs flagged with proRata rights.
 * Mirrors calculateProRataAllocations for prior investors.
 * @param {Array} safeDetails - Output from calculateSafeConversions (already carries percent, proRata, proRataOverride, investorName)
 * @param {number} roundSize - Total round size in which pro-rata is exercised
 * @param {string} investorName - Lead investor name; matching SAFEs are skipped (handled via lead portion)
 * @returns {Object} { safeProRataResults, totalSafeProRataAmount }
 */
function calculateSafeProRataAllocations(safeDetails, roundSize, investorName) {
  const safeProRataResults = []
  let totalSafeProRataAmount = 0

  if (!Array.isArray(safeDetails)) {
    return { safeProRataResults: [], totalSafeProRataAmount: 0 }
  }

  const leadName = (investorName || '').trim()

  safeDetails.forEach(safe => {
    if (!safe.proRata || !safe.percent || safe.percent <= 0 || !roundSize) {
      return
    }
    // Lead-attributed SAFEs: pro-rata absorbed by lead's investor portion
    const safeInvestor = (safe.investorName || '').trim()
    if (safeInvestor && safeInvestor === leadName) {
      return
    }
    const calculatedAmount = r$((safe.percent / 100) * roundSize)
    const proRataAmount = (safe.proRataOverride != null && safe.proRataOverride >= 0)
      ? r$(safe.proRataOverride)
      : calculatedAmount
    if (proRataAmount <= 0) return

    safeProRataResults.push({
      id: safe.id,
      investorName: safe.investorName || '',
      preRoundSafePercent: safe.percent,
      proRataAmount,
      calculatedProRataAmount: calculatedAmount,
      isOverridden: safe.proRataOverride != null && safe.proRataOverride >= 0
    })
    totalSafeProRataAmount += proRataAmount
  })

  return {
    safeProRataResults,
    totalSafeProRataAmount: r$(totalSafeProRataAmount)
  }
}

/**
 * Calculate ESOP dilution and timing effects
 *
 * The pool is split into two buckets: already-granted options (persist through
 * the round as individual shareholders would) and available/unallocated pool
 * (what VCs negotiate). The top-up formula only applies to the available bucket;
 * target represents the target AVAILABLE pool post-round.
 *
 * @param {number} currentEsopPercent - Total current pool (granted + available), pre-round
 * @param {number} grantedEsopPercent - Already-issued portion of the pool, pre-round
 * @param {number} targetEsopPercent - Target AVAILABLE pool percentage post-round
 * @param {string} esopTiming - 'pre-close' or 'post-close'
 * @param {number} baseDilutionPercent - Total dilution from round + SAFEs (not including ESOP top-up)
 */
function calculateEsopEffects(currentEsopPercent, grantedEsopPercent, targetEsopPercent, esopTiming, baseDilutionPercent) {
  const availablePercent = Math.max(0, rp(currentEsopPercent - grantedEsopPercent))
  const naturalDilutedAvailable = rp(availablePercent * (100 - baseDilutionPercent) / 100)
  const naturalDilutedGranted = rp(grantedEsopPercent * (100 - baseDilutionPercent) / 100)

  let esopIncrease = 0
  let esopIncreasePreClose = 0
  let esopIncreasePostClose = 0
  let finalEsopAvailablePercent = targetEsopPercent
  let finalEsopGrantedPercent = naturalDilutedGranted

  if (targetEsopPercent > 0) {
    if (targetEsopPercent > naturalDilutedAvailable) {
      const rawIncrease = targetEsopPercent - naturalDilutedAvailable

      if (esopTiming === 'pre-close') {
        // Pre-close: top-up dilutes the available pool, granted, founders, priors — not new investors
        // Solve: available * (100 - baseDilution - X) / 100 + X = target
        const denominator = 1 - availablePercent / 100
        esopIncrease = denominator > 0.01
          ? rp(rawIncrease / denominator)
          : rawIncrease
        esopIncreasePreClose = esopIncrease
      } else {
        // Post-close: top-up dilutes everyone including already-diluted pool
        // Solve: naturalDilutedAvailable * (100 - X) / 100 + X = target
        const denominator = 1 - naturalDilutedAvailable / 100
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

      // Granted portion dilutes like a pre-round shareholder
      if (esopTiming === 'pre-close') {
        finalEsopGrantedPercent = rp(grantedEsopPercent * (100 - baseDilutionPercent - esopIncreasePreClose) / 100)
      } else {
        finalEsopGrantedPercent = rp(naturalDilutedGranted * (100 - esopIncreasePostClose) / 100)
      }
    }
    // else: natural dilution already reaches/exceeds target — treat final available as target
  } else {
    // No target specified: available pool just dilutes naturally
    finalEsopAvailablePercent = naturalDilutedAvailable
  }

  const finalEsopPercent = rp(finalEsopAvailablePercent + finalEsopGrantedPercent)

  return {
    esopIncrease,
    esopIncreasePreClose,
    esopIncreasePostClose,
    finalEsopPercent,
    finalEsopAvailablePercent,
    finalEsopGrantedPercent
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
    grantedEsopPercent = 0,
    targetEsopPercent = 0,
    esopTiming = 'pre-close',
    warrants = []
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
  const effectiveGrantedEsopPercent = showAdvanced ? Math.min(grantedEsopPercent, currentEsopPercent) : 0
  const effectiveTargetEsopPercent = showAdvanced ? targetEsopPercent : 0
  const effectiveWarrants = showAdvanced ? (Array.isArray(warrants) ? warrants : []) : []
  const totalWarrantAmount = effectiveWarrants.reduce((s, w) => s + (Number(w.amount) || 0), 0)
  const effectivePreRoundWarrantsPercent = effectiveWarrants.reduce((sum, w) => {
    const amt = Number(w.amount) || 0
    const val = Number(w.valuation) || 0
    if (amt <= 0 || val <= 0) return sum
    return sum + (amt / val) * 100
  }, 0)

  // Validate founders + priors ≤ 100% on their own; auto-scale to accommodate ESOP otherwise.
  // See single-step path for rationale.
  const rawFoundersTotal2 = effectiveFounders.reduce((sum, f) => sum + (f.ownershipPercent || 0), 0)
  const rawPriorsTotal2 = effectivePriorInvestors.reduce((sum, inv) => sum + (inv.ownershipPercent || 0), 0)
  const preRoundNonEsop2 = rawFoundersTotal2 + rawPriorsTotal2

  if (preRoundNonEsop2 > 100) {
    return null
  }

  const targetNonEsop2 = Math.max(0, 100 - effectiveCurrentEsopPercent - effectivePreRoundWarrantsPercent)
  const preRoundScaleFactor2 = preRoundNonEsop2 > targetNonEsop2 + 1e-6 && preRoundNonEsop2 > 0
    ? targetNonEsop2 / preRoundNonEsop2
    : 1

  const scaledPriorInvestors = preRoundScaleFactor2 < 1
    ? effectivePriorInvestors.map(inv => ({ ...inv, ownershipPercent: rp(inv.ownershipPercent * preRoundScaleFactor2) }))
    : effectivePriorInvestors
  const scaledFounders = preRoundScaleFactor2 < 1
    ? effectiveFounders.map(f => ({ ...f, ownershipPercent: rp(f.ownershipPercent * preRoundScaleFactor2) }))
    : effectiveFounders

  // --- SAFE conversions at step 1 pre-money ---
  const safeCalc = calculateSafeConversions(effectiveSafes, preMoneyV1)

  // --- Pro-rata from step 2's other portion ---
  const priorInvestorsForProRata = scaledPriorInvestors.map(inv =>
    inv.name === investorName ? { ...inv, hasProRataRights: false } : inv
  )
  const proRataCalc = calculateProRataAllocations(priorInvestorsForProRata, S2)

  // SAFE pro-rata also draws from step 2's other portion. Use pre-dilution SAFE percent
  // relative to step 2 round (treat safeCalc.totalSafePercent as the step-1 post-money % of SAFE).
  const safeProRataCalc = calculateSafeProRataAllocations(safeCalc.safeDetails, S2, investorName)

  // Combined pro-rata clamped to available step 2 other portion
  const combinedRequestedProRata = r$(proRataCalc.totalProRataAmount + safeProRataCalc.totalSafeProRataAmount)
  const priorProRataShare = combinedRequestedProRata > 0
    ? (proRataCalc.totalProRataAmount / combinedRequestedProRata)
    : 0
  const safeProRataShare = combinedRequestedProRata > 0
    ? (safeProRataCalc.totalSafeProRataAmount / combinedRequestedProRata)
    : 0
  const totalProRataApplied = Math.min(combinedRequestedProRata, s2Other)
  const actualProRataAmount = r$(totalProRataApplied * priorProRataShare)
  const actualSafeProRataAmount = r$(totalProRataApplied * safeProRataShare)
  const adjustedS2Other = r$(s2Other - actualProRataAmount - actualSafeProRataAmount)
  // Scale factor applied per-investor/per-SAFE if combined pro-rata exceeded available s2Other
  const clampRatio = combinedRequestedProRata > 0 ? (totalProRataApplied / combinedRequestedProRata) : 0

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
  const esopCalc = calculateEsopEffects(effectiveCurrentEsopPercent, effectiveGrantedEsopPercent, effectiveTargetEsopPercent, esopTiming, baseDilutionPercent)

  // --- Prior investors ---
  const postRoundPriorInvestors = scaledPriorInvestors.map(investor => {
    const preRoundPercent = investor.ownershipPercent
    // Existing shareholders diluted by step 1 then step 2
    let postRoundPercent = rp(preRoundPercent * (100 - step1RoundPercent - safeCalc.totalSafePercent - esopCalc.esopIncreasePreClose) / 100 * step2DilutionFactor)

    // Add pro-rata participation from step 2 (scaled by clamp ratio when combined pro-rata exceeds s2Other)
    const proRataEntry = proRataCalc.proRataResults.find(pr => pr.id === investor.id)
    const scaledProRataAmount = (proRataEntry && proRataEntry.proRataAmount > 0)
      ? r$(proRataEntry.proRataAmount * clampRatio)
      : 0
    if (scaledProRataAmount > 0) {
      const proRataOwnershipPercent = r2p(scaledProRataAmount / V2)
      postRoundPercent += proRataOwnershipPercent
    }

    // Apply post-close ESOP dilution
    if (esopCalc.esopIncreasePostClose > 0) {
      postRoundPercent = rp(postRoundPercent * (100 - esopCalc.esopIncreasePostClose) / 100)
    }

    return {
      ...investor,
      postRoundPercent: rp(postRoundPercent),
      proRataAmount: scaledProRataAmount,
      dilution: rp(preRoundPercent - postRoundPercent)
    }
  })

  // --- Founders ---
  const postRoundFounders = scaledFounders.map(founder => {
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

  // --- Warrants ---
  // Dilute identically to founders: step 1 pre-round dilution then step 2 dilution factor,
  // plus post-close ESOP top-up if present.
  let finalWarrantsPercent = rp(
    effectivePreRoundWarrantsPercent * (100 - step1RoundPercent - safeCalc.totalSafePercent - esopCalc.esopIncreasePreClose) / 100 * step2DilutionFactor
  )
  if (esopCalc.esopIncreasePostClose > 0) {
    finalWarrantsPercent = rp(finalWarrantsPercent * (100 - esopCalc.esopIncreasePostClose) / 100)
  }

  const warrantDetails = effectiveWarrants.map(w => {
    const amount = Number(w.amount) || 0
    const valuation = Number(w.valuation) || 0
    const preRoundPercent = (amount > 0 && valuation > 0)
      ? rp((amount / valuation) * 100)
      : 0
    let postRoundPercent = rp(
      preRoundPercent * (100 - step1RoundPercent - safeCalc.totalSafePercent - esopCalc.esopIncreasePreClose) / 100 * step2DilutionFactor
    )
    if (esopCalc.esopIncreasePostClose > 0) {
      postRoundPercent = rp(postRoundPercent * (100 - esopCalc.esopIncreasePostClose) / 100)
    }
    return {
      id: w.id,
      name: w.name || '',
      amount,
      valuation,
      preRoundPercent,
      postRoundPercent
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
  const esopPostCloseFactor2 = esopCalc.esopIncreasePostClose > 0
    ? (100 - esopCalc.esopIncreasePostClose) / 100
    : 1
  const dilutedSafeDetails = safeCalc.safeDetails.map(d => {
    const pr = safeProRataCalc.safeProRataResults.find(r => r.id === d.id)
    const scaledProRataAmount = pr ? r$(pr.proRataAmount * clampRatio) : 0
    const proRataPercent = rp(r2p(scaledProRataAmount / V2) * esopPostCloseFactor2)
    const dilutedPercent = rp(d.percent * step2DilutionFactor * esopPostCloseFactor2)
    return {
      ...d,
      percent: rp(d.percent * step2DilutionFactor),
      proRataAmount: scaledProRataAmount,
      proRataPercent,
      totalPercent: rp(dilutedPercent + proRataPercent)
    }
  })

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
    + finalWarrantsPercent
    - proRataOwnershipInRound
  const unknownOwnership = rp(100 - totalAccountedOwnership)

  const preRoundTrackedOwnership = scaledPriorInvestors.reduce((sum, inv) => sum + (inv.ownershipPercent || 0), 0)
    + scaledFounders.reduce((sum, f) => sum + (f.ownershipPercent || 0), 0)
    + effectiveCurrentEsopPercent
    + effectivePreRoundWarrantsPercent
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

    // SAFE pro-rata totals
    totalSafeProRataAmount: actualSafeProRataAmount,
    totalSafeProRataPercent: r2p(actualSafeProRataAmount / V2),
    safeProRataDetails: safeProRataCalc.safeProRataResults,

    // SAFE details
    totalSafeAmount: safeCalc.totalSafeAmount,
    totalSafePercent: safeFinalPercent,
    safeDetails: dilutedSafeDetails,
    safes: effectiveSafes,

    // ESOP details
    currentEsopPercent: effectiveCurrentEsopPercent,
    grantedEsopPercent: effectiveGrantedEsopPercent,
    targetEsopPercent: effectiveTargetEsopPercent,
    finalEsopPercent: esopCalc.finalEsopPercent,
    finalEsopAvailablePercent: esopCalc.finalEsopAvailablePercent,
    finalEsopGrantedPercent: esopCalc.finalEsopGrantedPercent,
    esopIncrease: esopCalc.esopIncrease,
    esopIncreasePreClose: esopCalc.esopIncreasePreClose,
    esopIncreasePostClose: esopCalc.esopIncreasePostClose,
    esopTiming,

    // Warrants
    warrants: effectiveWarrants,
    warrantDetails,
    totalWarrantAmount,
    preRoundWarrantsPercent: effectivePreRoundWarrantsPercent,
    finalWarrantsPercent,

    // Multi-party ownership results
    priorInvestors: postRoundPriorInvestors,
    founders: postRoundFounders,
    combinedInvestor,
    rolledUpInvestors: buildRolledUpInvestors({
      priorInvestors: postRoundPriorInvestors,
      safeDetails: dilutedSafeDetails,
      warrantDetails,
      leadInvestorName: investorName,
    }),

    // Legacy compatibility
    postRoundFounderPercent: rp(postRoundFounders.reduce((sum, f) => sum + (f.postRoundPercent || 0), 0)),
    preRoundFounderPercent: rp(scaledFounders.reduce((sum, f) => sum + (f.ownershipPercent || 0), 0)),
    founderDilution: rp(scaledFounders.reduce((sum, f) => sum + (f.ownershipPercent || 0), 0) - postRoundFounders.reduce((sum, f) => sum + (f.postRoundPercent || 0), 0)),

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
 * Group prior investors, SAFEs, and warrants by case-insensitive name and return only
 * names that appear in 2+ sources. The lead investor is excluded — `combinedInvestor`
 * already rolls them up in the "New Round Total" section.
 */
function buildRolledUpInvestors({ priorInvestors, safeDetails, warrantDetails, leadInvestorName }) {
  const leadKey = (leadInvestorName || '').toLowerCase()
  const groups = new Map()

  const ensure = (rawName) => {
    if (!rawName) return null
    const key = rawName.toLowerCase()
    if (key === leadKey) return null
    if (!groups.has(key)) {
      groups.set(key, {
        name: rawName,
        sources: new Set(),
        priorPercent: 0,
        safePercent: 0,
        safeAmount: 0,
        warrantPercent: 0,
        warrantAmount: 0,
        proRataAmount: 0,
      })
    }
    return groups.get(key)
  }

  priorInvestors.forEach(p => {
    const g = ensure(p.name)
    if (!g) return
    g.sources.add('prior')
    g.priorPercent = rp(g.priorPercent + (p.postRoundPercent || 0))
    g.proRataAmount = r$(g.proRataAmount + (p.proRataAmount || 0))
  })

  safeDetails.forEach(s => {
    const g = ensure(s.investorName)
    if (!g) return
    g.sources.add('safe')
    g.safePercent = rp(g.safePercent + (s.totalPercent || s.percent || 0))
    g.safeAmount = r$(g.safeAmount + (s.amount || 0))
    g.proRataAmount = r$(g.proRataAmount + (s.proRataAmount || 0))
  })

  warrantDetails.forEach(w => {
    const g = ensure(w.name)
    if (!g) return
    g.sources.add('warrant')
    g.warrantPercent = rp(g.warrantPercent + (w.postRoundPercent || 0))
    g.warrantAmount = r$(g.warrantAmount + (w.amount || 0))
  })

  return Array.from(groups.values())
    .filter(g => g.sources.size >= 2)
    .map(g => ({
      ...g,
      sources: Array.from(g.sources),
      totalPercent: rp(g.priorPercent + g.safePercent + g.warrantPercent),
    }))
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
    // SAFE and ESOP
    safes = [],
    currentEsopPercent = 0,
    grantedEsopPercent = 0,
    targetEsopPercent = 0,
    esopTiming = 'pre-close',
    warrants = []
  } = migratedInputs

  // When showAdvanced is false, ignore all advanced inputs
  const effectivePriorInvestors = showAdvanced ? priorInvestors : []
  const effectiveFounders = showAdvanced ? founders : []
  const effectiveSafes = showAdvanced ? safes : []
  const effectiveCurrentEsopPercent = showAdvanced ? currentEsopPercent : 0
  const effectiveGrantedEsopPercent = showAdvanced ? Math.min(grantedEsopPercent, currentEsopPercent) : 0
  const effectiveTargetEsopPercent = showAdvanced ? targetEsopPercent : 0
  const effectiveWarrants = showAdvanced ? (Array.isArray(warrants) ? warrants : []) : []
  // Each warrant: "$amount of warrants at $valuation" → contributes amount/valuation%
  // of pre-round FD cap. Sum across warrants.
  const totalWarrantAmount = effectiveWarrants.reduce((s, w) => s + (Number(w.amount) || 0), 0)
  const effectivePreRoundWarrantsPercent = effectiveWarrants.reduce((sum, w) => {
    const amt = Number(w.amount) || 0
    const val = Number(w.valuation) || 0
    if (amt <= 0 || val <= 0) return sum
    return sum + (amt / val) * 100
  }, 0)
  
  // Validate founders + priors can't exceed 100% on their own (obvious user error).
  const rawFoundersTotal = effectiveFounders.reduce((sum, f) => sum + (f.ownershipPercent || 0), 0)
  const rawPriorsTotal = effectivePriorInvestors.reduce((sum, inv) => sum + (inv.ownershipPercent || 0), 0)
  const preRoundNonEsop = rawFoundersTotal + rawPriorsTotal

  if (preRoundNonEsop > 100) {
    console.error(`Pre-round ownership totals ${preRoundNonEsop.toFixed(1)}% which exceeds 100%. Cannot calculate scenario.`)
    return null
  }

  // Reconcile with ESOP + warrants: users commonly enter founders = 100% and then add
  // an ESOP pool and/or outstanding warrants, expecting those to be carved out of the
  // cap table. When founders + priors + currentEsop + warrants > 100%, scale founders
  // + priors proportionally to fit in (100 − currentEsop − warrants) so section totals
  // sum to exactly 100% instead of silently overshooting.
  const targetNonEsop = Math.max(0, 100 - effectiveCurrentEsopPercent - effectivePreRoundWarrantsPercent)
  const preRoundScaleFactor = preRoundNonEsop > targetNonEsop + 1e-6 && preRoundNonEsop > 0
    ? targetNonEsop / preRoundNonEsop
    : 1

  const scaledPriorInvestors = preRoundScaleFactor < 1
    ? effectivePriorInvestors.map(inv => ({ ...inv, ownershipPercent: rp(inv.ownershipPercent * preRoundScaleFactor) }))
    : effectivePriorInvestors
  const scaledFounders = preRoundScaleFactor < 1
    ? effectiveFounders.map(f => ({ ...f, ownershipPercent: rp(f.ownershipPercent * preRoundScaleFactor) }))
    : effectiveFounders
  
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

  // Calculate SAFE conversions (needed before SAFE pro-rata)
  const safeCalc = calculateSafeConversions(effectiveSafes, preMoneyVal)

  // Calculate SAFE pro-rata on SAFEs flagged with pro-rata rights
  const safeProRataCalc = calculateSafeProRataAllocations(safeCalc.safeDetails, roundSize, investorName)

  // Pro-rata (prior + SAFE) comes from the "Other" portion, not from round size
  const combinedProRataAmount = r$(proRataCalc.totalProRataAmount + safeProRataCalc.totalSafeProRataAmount)
  if (combinedProRataAmount > otherPortion + 1e-9) {
    return {
      error: true,
      errorMessage: `Total pro-rata amount ($${combinedProRataAmount.toFixed(2)}M) exceeds available "Other" portion ($${otherPortion.toFixed(2)}M). Please reduce pro-rata rights or increase "Other" portion.`,
      proRataAmount: combinedProRataAmount,
      otherPortion,
      roundSize,
      postMoneyVal,
      preMoneyVal
    }
  }

  const actualProRataAmount = proRataCalc.totalProRataAmount
  const actualSafeProRataAmount = safeProRataCalc.totalSafeProRataAmount

  // Adjust investor portions - investor stays the same, other is reduced by combined pro-rata
  const adjustedInvestorPortion = investorPortion
  const adjustedOtherPortion = r$(otherPortion - actualProRataAmount - actualSafeProRataAmount)
  
  // Calculate ownership percentages on post-money basis
  const roundPercent = r2p(roundSize / postMoneyVal)
  let investorPercent = r2p(adjustedInvestorPortion / postMoneyVal)
  let otherPercent = r2p(adjustedOtherPortion / postMoneyVal)

  // Calculate ESOP effects — pass round + SAFEs as the base dilution
  const baseDilutionPercent = roundPercent + safeCalc.totalSafePercent
  const esopCalc = calculateEsopEffects(effectiveCurrentEsopPercent, effectiveGrantedEsopPercent, effectiveTargetEsopPercent, esopTiming, baseDilutionPercent)

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
  
  // Warrants dilute identically to pre-round equity (no pro-rata, no strike).
  let finalWarrantsPercent = rp(effectivePreRoundWarrantsPercent * (100 - totalNewOwnership) / 100)
  if (esopCalc.esopIncreasePostClose > 0) {
    finalWarrantsPercent = rp(finalWarrantsPercent * (100 - esopCalc.esopIncreasePostClose) / 100)
  }

  // Per-warrant breakdown (each warrant's slice diluted the same way)
  const warrantDetails = effectiveWarrants.map(w => {
    const amount = Number(w.amount) || 0
    const valuation = Number(w.valuation) || 0
    const preRoundPercent = (amount > 0 && valuation > 0)
      ? rp((amount / valuation) * 100)
      : 0
    let postRoundPercent = rp(preRoundPercent * (100 - totalNewOwnership) / 100)
    if (esopCalc.esopIncreasePostClose > 0) {
      postRoundPercent = rp(postRoundPercent * (100 - esopCalc.esopIncreasePostClose) / 100)
    }
    return {
      id: w.id,
      name: w.name || '',
      amount,
      valuation,
      preRoundPercent,
      postRoundPercent
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
    + finalWarrantsPercent
    - proRataOwnershipInRound

  // Calculate unknown ownership (what's not accounted for)
  const unknownOwnership = rp(100 - totalAccountedOwnership)

  // Calculate pre-round unknown ownership directly (avoids lossy back-calculation)
  const preRoundTrackedOwnership = (scaledPriorInvestors.reduce((sum, inv) => sum + (inv.ownershipPercent || 0), 0))
    + (scaledFounders.reduce((sum, f) => sum + (f.ownershipPercent || 0), 0))
    + effectiveCurrentEsopPercent
    + effectivePreRoundWarrantsPercent
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

  // Enrich safeDetails with pro-rata attribution (post-close ESOP dilutes round percentages)
  const esopPostCloseFactor = esopCalc.esopIncreasePostClose > 0
    ? (100 - esopCalc.esopIncreasePostClose) / 100
    : 1
  const enrichedSafeDetails = (safeCalc.safeDetails || []).map(safe => {
    const pr = safeProRataCalc.safeProRataResults.find(r => r.id === safe.id)
    const proRataAmount = pr ? pr.proRataAmount : 0
    const proRataPercentRaw = r2p(proRataAmount / postMoneyVal)
    const proRataPercent = rp(proRataPercentRaw * esopPostCloseFactor)
    const dilutedConversionPercent = rp(safe.percent * esopPostCloseFactor)
    return {
      ...safe,
      proRataAmount,
      proRataPercent,
      totalPercent: rp(dilutedConversionPercent + proRataPercent)
    }
  })

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

    // Pro-rata details (prior investors only — SAFE pro-rata surfaced via safeDetails)
    totalProRataAmount: actualProRataAmount || 0,
    totalProRataPercent: r2p(actualProRataAmount / postMoneyVal),
    proRataAmount: actualProRataAmount || 0,
    proRataPercent: r2p(actualProRataAmount / postMoneyVal),
    proRataDetails: proRataCalc.proRataResults || [],

    // SAFE pro-rata totals
    totalSafeProRataAmount: actualSafeProRataAmount || 0,
    totalSafeProRataPercent: r2p(actualSafeProRataAmount / postMoneyVal),
    safeProRataDetails: safeProRataCalc.safeProRataResults || [],

    // SAFE details
    totalSafeAmount: safeCalc.totalSafeAmount || 0,
    totalSafePercent: safeCalc.totalSafePercent || 0,
    safeDetails: enrichedSafeDetails,
    safes: effectiveSafes || [],
    
    // ESOP details
    currentEsopPercent: effectiveCurrentEsopPercent || 0,
    grantedEsopPercent: effectiveGrantedEsopPercent || 0,
    targetEsopPercent: effectiveTargetEsopPercent || 0,
    finalEsopPercent: esopCalc.finalEsopPercent || 0,
    finalEsopAvailablePercent: esopCalc.finalEsopAvailablePercent || 0,
    finalEsopGrantedPercent: esopCalc.finalEsopGrantedPercent || 0,
    esopIncrease: esopCalc.esopIncrease || 0,
    esopIncreasePreClose: esopCalc.esopIncreasePreClose || 0,
    esopIncreasePostClose: esopCalc.esopIncreasePostClose || 0,
    esopTiming: esopTiming || 'pre-close',

    // Warrants
    warrants: effectiveWarrants || [],
    warrantDetails: warrantDetails || [],
    totalWarrantAmount: totalWarrantAmount || 0,
    preRoundWarrantsPercent: effectivePreRoundWarrantsPercent || 0,
    finalWarrantsPercent: finalWarrantsPercent || 0,

    // Multi-party ownership results
    priorInvestors: postRoundPriorInvestors || [],
    founders: postRoundFounders || [],
    combinedInvestor: combinedInvestor,
    rolledUpInvestors: buildRolledUpInvestors({
      priorInvestors: postRoundPriorInvestors || [],
      safeDetails: enrichedSafeDetails,
      warrantDetails: warrantDetails || [],
      leadInvestorName: investorName,
    }),
    
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

const DEFAULT_SCENARIO_OFFSETS = buildScenarioOffsets(30)

const formatOffsetTitle = (offset) => {
  if (offset === 0) return 'Base Case'
  const sign = offset > 0 ? '+' : '−'
  return `${sign}${formatScenarioOffsetValue(Math.abs(offset))}%`
}

/**
 * Generate scenarios using the enhanced calculation engine
 * @param {Object} company - Company data
 * @param {Object} [options] - Optional generation options
 * @param {number[]} [options.offsets] - Percent offsets to apply to postMoneyVal (e.g., [-20, -10, 10, 20])
 * @returns {Array} Array of scenario results. Index 0 is always the base case.
 */
export function calculateEnhancedScenarios(company, options = {}) {
  const baseScenario = calculateEnhancedScenario(company)

  if (!baseScenario) {
    return []
  }

  if (baseScenario.error) {
    return baseScenario
  }

  const scenarios = [{
    ...baseScenario,
    title: 'Base Case',
    isBase: true,
    offsetPercent: 0
  }]

  const rawOffsets = Array.isArray(options.offsets) ? options.offsets : DEFAULT_SCENARIO_OFFSETS
  const offsets = normalizeScenarioOffsets(rawOffsets)

  const isTwoStep = company.twoStepEnabled && company.step2PostMoney > 0 && company.step2Amount > 0

  offsets.forEach((offset) => {
    const multiplier = 1 + offset / 100
    if (multiplier <= 0) return

    const scenarioInputs = {
      ...company,
      postMoneyVal: r$(company.postMoneyVal * multiplier)
    }

    // Scale step 2 valuation along with step 1 to preserve deal shape (V2/V1 ratio).
    // Round sizes are NOT varied here (offsets model valuation sensitivity only).
    if (isTwoStep) {
      scenarioInputs.step2PostMoney = r$(company.step2PostMoney * multiplier)
    }

    const scenario = calculateEnhancedScenario(scenarioInputs)
    if (scenario && !scenario.error) {
      scenarios.push({
        ...scenario,
        title: formatOffsetTitle(offset),
        isBase: false,
        offsetPercent: offset
      })
    }
  })

  return scenarios
}
