/**
 * Pro-forma calculation utilities for detailed cap table modeling
 */

/**
 * Calculate comprehensive pro-forma cap table with existing investors, founders, and ESOP
 * @param {Object} inputs - Pro-forma calculation inputs
 * @returns {Object} - Detailed cap table results
 */
export const calculateProForma = (inputs) => {
  const {
    // Basic round parameters
    postMoneyVal,
    roundSize,
    newInvestorAmount,
    newInvestorName = 'New Investor',
    
    // Existing investors with pro-rata rights
    existingInvestors = [],
    
    // Multiple founders
    founders = [],
    
    // ESOP parameters
    esopPoolPreClose = 0,  // ESOP shares issued before closing
    esopPoolInRound = 0,   // ESOP shares included in round funding
    
    // Advanced features from existing system
    safes = [],
    proRataPercent = 0,
    preRoundFounderOwnership = 0
  } = inputs

  // Validate inputs
  if (postMoneyVal <= 0 || roundSize <= 0 || postMoneyVal <= roundSize) {
    return null
  }

  const preMoneyVal = Math.round((postMoneyVal - roundSize) * 100) / 100

  // Initialize cap table tracking
  let totalSharesOutstanding = 0
  let results = {
    preMoneyVal,
    postMoneyVal,
    roundSize,
    sharePrice: 0,
    
    // Detailed stakeholder breakdown
    newInvestor: {},
    existingInvestorsDetail: [],
    foundersDetail: [],
    esopDetail: {},
    safesDetail: [],
    
    // Summary totals
    totalNewInvestment: 0,
    totalExistingOwnership: 0,
    totalFounderOwnership: 0,
    totalEsopOwnership: 0,
    totalSafeOwnership: 0,
    
    // Validation
    totalOwnership: 0,
    isValid: true,
    errors: []
  }

  try {
    // Step 1: Calculate pre-round share base
    // Start with founders' pre-round ownership if specified
    let preRoundShares = 1000000 // Default 1M shares pre-round
    
    if (preRoundFounderOwnership > 0 && founders.length > 0) {
      // Calculate based on founder percentage
      const totalFounderShares = preRoundShares * (preRoundFounderOwnership / 100)
      
      // Distribute among founders based on their relative ownership
      const totalFounderPercent = founders.reduce((sum, founder) => sum + (founder.ownershipPercent || 0), 0)
      
      founders.forEach((founder, index) => {
        const founderShares = totalFounderPercent > 0 ? 
          Math.round(totalFounderShares * (founder.ownershipPercent / totalFounderPercent)) :
          Math.round(totalFounderShares / founders.length)
        
        results.foundersDetail.push({
          ...founder,
          name: founder.name || `Founder ${index + 1}`,
          preRoundShares: founderShares,
          preRoundPercent: (founderShares / preRoundShares) * 100
        })
      })
    } else if (founders.length > 0) {
      // Distribute equally among founders if no specific ownership given
      const sharesPerFounder = Math.round(preRoundShares * 0.8 / founders.length) // Assume 80% to founders
      
      founders.forEach((founder, index) => {
        results.foundersDetail.push({
          ...founder,
          name: founder.name || `Founder ${index + 1}`,
          preRoundShares: sharesPerFounder,
          preRoundPercent: (sharesPerFounder / preRoundShares) * 100
        })
      })
    }

    // Step 2: Handle existing investors
    let existingInvestorShares = 0
    existingInvestors.forEach((investor, index) => {
      const investorShares = Math.round((investor.ownershipPercent / 100) * preRoundShares)
      existingInvestorShares += investorShares
      
      // Calculate pro-rata entitlement
      const proRataEntitlement = investor.hasProRata ? 
        Math.round((investor.ownershipPercent / 100) * roundSize * 100) / 100 : 0
      
      const actualProRataInvestment = Math.min(
        proRataEntitlement,
        investor.proRataCommitment || 0
      )

      results.existingInvestorsDetail.push({
        ...investor,
        name: investor.name || `Investor ${index + 1}`,
        preRoundShares: investorShares,
        preRoundPercent: investor.ownershipPercent,
        proRataEntitlement,
        proRataInvestment: actualProRataInvestment
      })
    })

    // Step 3: Handle SAFE conversions
    let totalSafeShares = 0
    let totalSafeAmount = 0
    
    safes.forEach((safe, index) => {
      if (safe.amount > 0) {
        let conversionPrice = preMoneyVal // Default to pre-money valuation
        
        if (safe.cap > 0 && safe.discount > 0) {
          const capPrice = safe.cap
          const discountPrice = preMoneyVal * (1 - safe.discount / 100)
          conversionPrice = Math.min(capPrice, discountPrice)
        } else if (safe.cap > 0) {
          conversionPrice = Math.min(safe.cap, preMoneyVal)
        } else if (safe.discount > 0) {
          conversionPrice = preMoneyVal * (1 - safe.discount / 100)
        }
        
        const sharePrice = conversionPrice / preRoundShares
        const safeShares = Math.round(safe.amount / sharePrice)
        totalSafeShares += safeShares
        totalSafeAmount += safe.amount
        
        results.safesDetail.push({
          ...safe,
          id: safe.id || index,
          conversionPrice,
          sharePrice,
          shares: safeShares,
          percent: (safeShares / (preRoundShares + totalSafeShares)) * 100
        })
      }
    })

    // Step 4: Calculate ESOP allocations
    let esopPreCloseShares = 0
    let esopInRoundShares = 0
    
    if (esopPoolPreClose > 0) {
      esopPreCloseShares = Math.round((esopPoolPreClose / 100) * preRoundShares)
    }
    
    if (esopPoolInRound > 0) {
      // ESOP in round is calculated on post-money basis
      const postRoundShares = preRoundShares + totalSafeShares + esopPreCloseShares
      esopInRoundShares = Math.round((esopPoolInRound / 100) * postRoundShares)
    }

    // Step 5: Calculate new investment and shares
    const totalProRataInvestment = results.existingInvestorsDetail.reduce(
      (sum, inv) => sum + (inv.proRataInvestment || 0), 0
    )
    
    const remainingForNewInvestor = roundSize - totalProRataInvestment - totalSafeAmount - esopPoolInRound
    
    if (remainingForNewInvestor < 0) {
      results.errors.push('Total commitments exceed round size')
      results.isValid = false
    }

    // Calculate share price based on post-money valuation
    const totalPostRoundShares = preRoundShares + totalSafeShares + esopPreCloseShares + esopInRoundShares
    const additionalSharesForRound = Math.round((roundSize / postMoneyVal) * totalPostRoundShares)
    const finalTotalShares = totalPostRoundShares + additionalSharesForRound
    
    results.sharePrice = Math.round((postMoneyVal / finalTotalShares) * 100) / 100

    // Step 6: Calculate final ownership percentages
    const newInvestorShares = Math.round(remainingForNewInvestor / results.sharePrice)
    const proRataShares = Math.round(totalProRataInvestment / results.sharePrice)

    results.newInvestor = {
      name: newInvestorName,
      investment: remainingForNewInvestor,
      shares: newInvestorShares,
      percent: (newInvestorShares / finalTotalShares) * 100
    }

    // Update existing investors with their new shares
    results.existingInvestorsDetail = results.existingInvestorsDetail.map(investor => {
      const proRataShares = investor.proRataInvestment > 0 ? 
        Math.round(investor.proRataInvestment / results.sharePrice) : 0
      
      return {
        ...investor,
        proRataShares,
        totalShares: investor.preRoundShares + proRataShares,
        postRoundPercent: ((investor.preRoundShares + proRataShares) / finalTotalShares) * 100,
        dilution: investor.preRoundPercent - (((investor.preRoundShares + proRataShares) / finalTotalShares) * 100)
      }
    })

    // Update founders with dilution calculations
    results.foundersDetail = results.foundersDetail.map(founder => ({
      ...founder,
      postRoundShares: founder.preRoundShares, // Founders don't get new shares in this round
      postRoundPercent: (founder.preRoundShares / finalTotalShares) * 100,
      dilution: founder.preRoundPercent - ((founder.preRoundShares / finalTotalShares) * 100)
    }))

    // ESOP details
    results.esopDetail = {
      preCloseShares: esopPreCloseShares,
      inRoundShares: esopInRoundShares,
      totalShares: esopPreCloseShares + esopInRoundShares,
      totalPercent: ((esopPreCloseShares + esopInRoundShares) / finalTotalShares) * 100,
      poolValue: ((esopPreCloseShares + esopInRoundShares) * results.sharePrice)
    }

    // Calculate summary totals
    results.totalNewInvestment = remainingForNewInvestor + totalProRataInvestment
    results.totalExistingOwnership = results.existingInvestorsDetail.reduce(
      (sum, inv) => sum + inv.postRoundPercent, 0
    )
    results.totalFounderOwnership = results.foundersDetail.reduce(
      (sum, founder) => sum + founder.postRoundPercent, 0
    )
    results.totalEsopOwnership = results.esopDetail.totalPercent
    results.totalSafeOwnership = results.safesDetail.reduce(
      (sum, safe) => sum + safe.percent, 0
    )

    results.totalOwnership = results.newInvestor.percent + 
                           results.totalExistingOwnership + 
                           results.totalFounderOwnership + 
                           results.totalEsopOwnership + 
                           results.totalSafeOwnership

    // Validation
    if (Math.abs(results.totalOwnership - 100) > 0.1) {
      results.errors.push(`Ownership percentages don't sum to 100% (actual: ${results.totalOwnership.toFixed(2)}%)`)
      results.isValid = false
    }

    totalSharesOutstanding = finalTotalShares

  } catch (error) {
    results.errors.push(`Calculation error: ${error.message}`)
    results.isValid = false
  }

  results.totalSharesOutstanding = totalSharesOutstanding
  return results
}

/**
 * Generate pro-forma scenarios with different investment structures
 * @param {Object} baseInputs - Base pro-forma inputs
 * @returns {Array} - Array of pro-forma scenarios
 */
export const generateProFormaScenarios = (baseInputs) => {
  const scenarios = []
  
  // Base scenario
  const baseScenario = calculateProForma(baseInputs)
  if (baseScenario) {
    scenarios.push({
      title: 'Base Pro-Forma',
      ...baseScenario
    })
  }

  // Scenario with different ESOP allocations
  if (baseInputs.esopPoolPreClose === 0 && baseInputs.esopPoolInRound === 0) {
    const esopScenario = calculateProForma({
      ...baseInputs,
      esopPoolPreClose: 10, // 10% ESOP pool
    })
    if (esopScenario) {
      scenarios.push({
        title: 'With 10% ESOP Pool',
        ...esopScenario
      })
    }
  }

  // Scenario with maximum pro-rata participation
  const maxProRataInputs = {
    ...baseInputs,
    existingInvestors: baseInputs.existingInvestors.map(inv => ({
      ...inv,
      proRataCommitment: inv.hasProRata ? (inv.proRataEntitlement || 0) : 0
    }))
  }
  
  const maxProRataScenario = calculateProForma(maxProRataInputs)
  if (maxProRataScenario && JSON.stringify(maxProRataScenario) !== JSON.stringify(baseScenario)) {
    scenarios.push({
      title: 'Max Pro-Rata Participation',
      ...maxProRataScenario
    })
  }

  return scenarios
}

/**
 * Export pro-forma data to CSV format
 * @param {Object} proFormaResults - Pro-forma calculation results
 * @returns {string} - CSV formatted string
 */
export const exportProFormaToCSV = (proFormaResults) => {
  const headers = [
    'Stakeholder',
    'Type',
    'Pre-Round Shares',
    'Pre-Round %',
    'Investment',
    'New Shares',
    'Post-Round Shares',
    'Post-Round %',
    'Dilution %'
  ]
  
  const rows = []
  
  // Add founders
  proFormaResults.foundersDetail.forEach(founder => {
    rows.push([
      founder.name,
      'Founder',
      founder.preRoundShares,
      founder.preRoundPercent.toFixed(2),
      '0.00',
      '0',
      founder.postRoundShares,
      founder.postRoundPercent.toFixed(2),
      founder.dilution.toFixed(2)
    ])
  })
  
  // Add existing investors
  proFormaResults.existingInvestorsDetail.forEach(investor => {
    rows.push([
      investor.name,
      'Existing Investor',
      investor.preRoundShares,
      investor.preRoundPercent.toFixed(2),
      (investor.proRataInvestment || 0).toFixed(2),
      investor.proRataShares || 0,
      investor.totalShares,
      investor.postRoundPercent.toFixed(2),
      investor.dilution.toFixed(2)
    ])
  })
  
  // Add new investor
  rows.push([
    proFormaResults.newInvestor.name,
    'New Investor',
    '0',
    '0.00',
    proFormaResults.newInvestor.investment.toFixed(2),
    proFormaResults.newInvestor.shares,
    proFormaResults.newInvestor.shares,
    proFormaResults.newInvestor.percent.toFixed(2),
    '0.00'
  ])
  
  // Add ESOP if present
  if (proFormaResults.esopDetail.totalShares > 0) {
    rows.push([
      'ESOP Pool',
      'ESOP',
      proFormaResults.esopDetail.preCloseShares,
      '0.00',
      proFormaResults.esopDetail.poolValue.toFixed(2),
      proFormaResults.esopDetail.inRoundShares,
      proFormaResults.esopDetail.totalShares,
      proFormaResults.esopDetail.totalPercent.toFixed(2),
      '0.00'
    ])
  }
  
  // Add SAFEs
  proFormaResults.safesDetail.forEach((safe, index) => {
    rows.push([
      `SAFE #${index + 1}`,
      'SAFE',
      '0',
      '0.00',
      safe.amount.toFixed(2),
      safe.shares,
      safe.shares,
      safe.percent.toFixed(2),
      '0.00'
    ])
  })
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')
  
  return csvContent
}