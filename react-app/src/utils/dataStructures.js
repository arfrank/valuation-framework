/**
 * Data structure definitions for the enhanced valuation framework
 * Supporting multiple prior investors and founders
 */

/**
 * Creates a new prior investor object
 * @param {string} name - Investor name
 * @param {number} ownershipPercent - Pre-round ownership percentage
 * @param {boolean} hasProRataRights - Whether investor has pro-rata rights
 * @returns {Object} Prior investor object
 */
export function createPriorInvestor(name = '', ownershipPercent = 0, hasProRataRights = false) {
  return {
    id: Date.now() + Math.random(), // Unique ID for React keys
    name: name.trim(),
    ownershipPercent: Math.max(0, Number(ownershipPercent) || 0),
    hasProRataRights: Boolean(hasProRataRights)
  }
}

/**
 * Creates a new founder object
 * @param {string} name - Founder name
 * @param {number} ownershipPercent - Pre-round ownership percentage
 * @returns {Object} Founder object
 */
export function createFounder(name = '', ownershipPercent = 0) {
  return {
    id: Date.now() + Math.random(), // Unique ID for React keys
    name: name.trim(),
    ownershipPercent: Math.max(0, Number(ownershipPercent) || 0)
  }
}

/**
 * Validates prior investors array
 * @param {Array} priorInvestors - Array of prior investor objects
 * @returns {boolean} True if valid
 */
export function validatePriorInvestors(priorInvestors) {
  if (!Array.isArray(priorInvestors)) return false
  
  return priorInvestors.every(investor => 
    investor &&
    typeof investor.id !== 'undefined' &&
    typeof investor.name === 'string' &&
    typeof investor.ownershipPercent === 'number' &&
    investor.ownershipPercent >= 0 &&
    investor.ownershipPercent <= 100 &&
    typeof investor.hasProRataRights === 'boolean'
  )
}

/**
 * Validates founders array
 * @param {Array} founders - Array of founder objects
 * @returns {boolean} True if valid
 */
export function validateFounders(founders) {
  if (!Array.isArray(founders)) return false
  
  return founders.every(founder => 
    founder &&
    typeof founder.id !== 'undefined' &&
    typeof founder.name === 'string' &&
    typeof founder.ownershipPercent === 'number' &&
    founder.ownershipPercent >= 0 &&
    founder.ownershipPercent <= 100
  )
}

/**
 * Calculates total ownership percentage for an array of stakeholders
 * @param {Array} stakeholders - Array of stakeholder objects with ownershipPercent
 * @returns {number} Total ownership percentage
 */
export function calculateTotalOwnership(stakeholders) {
  if (!Array.isArray(stakeholders)) return 0
  
  return stakeholders.reduce((total, stakeholder) => {
    return total + (stakeholder.ownershipPercent || 0)
  }, 0)
}

/**
 * Creates default company data structure with new multi-party support
 * @param {string} companyName - Company name
 * @returns {Object} Default company object
 */
export function createDefaultCompany(companyName = 'New Company') {
  return {
    name: companyName,
    postMoneyVal: 13,
    roundSize: 3,
    investorPortion: 2.75,
    otherPortion: 0.25,
    investorName: 'US',
    showAdvanced: false,
    
    // New multi-party structures
    priorInvestors: [
      createPriorInvestor('Previous Investors', 15, true) // Default with pro-rata rights
    ],
    founders: [
      createFounder('Founder Team', 85) // Default founder ownership
    ],
    
    // SAFE and ESOP support (unchanged)
    safes: [],
    currentEsopPercent: 0,
    targetEsopPercent: 0,
    esopTiming: 'pre-close',
    
    // Legacy fields - to be removed after migration
    proRataPercent: 0, // DEPRECATED: Use priorInvestors with hasProRataRights
    preRoundFounderOwnership: 0 // DEPRECATED: Use founders array
  }
}

/**
 * Migrates legacy company data to new multi-party structure
 * @param {Object} legacyCompany - Company object with legacy fields
 * @returns {Object} Migrated company object
 */
export function migrateLegacyCompany(legacyCompany) {
  if (!legacyCompany) {
    return createDefaultCompany()
  }
  
  const migrated = { ...legacyCompany }
  
  // Migrate legacy proRataPercent and preRoundFounderOwnership
  if (!migrated.priorInvestors || !migrated.founders) {
    const legacyProRata = Number(legacyCompany.proRataPercent) || 0
    const legacyFounderOwnership = Number(legacyCompany.preRoundFounderOwnership) || 85
    
    // Calculate prior investor ownership from pro-rata
    // If we have pro-rata, assume they had ownership equivalent to their participation
    const priorInvestorOwnership = legacyProRata > 0 ? legacyProRata : 15
    const remainingOwnership = Math.max(0, 100 - legacyFounderOwnership - priorInvestorOwnership)
    
    migrated.priorInvestors = []
    
    // Add prior investors if there's non-founder ownership
    if (priorInvestorOwnership > 0) {
      migrated.priorInvestors.push(
        createPriorInvestor('Previous Investors', priorInvestorOwnership, legacyProRata > 0)
      )
    }
    
    // Add other prior stakeholders if needed
    if (remainingOwnership > 0) {
      migrated.priorInvestors.push(
        createPriorInvestor('Other Stakeholders', remainingOwnership, false)
      )
    }
    
    // Add founders - ensure we always have at least one founder
    migrated.founders = [
      createFounder('Founder Team', Math.max(legacyFounderOwnership, 1))
    ]
  }
  
  // Ensure arrays exist even if empty
  migrated.priorInvestors = migrated.priorInvestors || []
  migrated.founders = migrated.founders || [createFounder('Founder Team', 85)]
  migrated.safes = migrated.safes || []
  
  return migrated
}

/**
 * Validates complete company data structure
 * @param {Object} company - Company object
 * @returns {Object} Validation result with success boolean and errors array
 */
export function validateCompanyData(company) {
  const errors = []
  
  if (!company || typeof company !== 'object') {
    return { success: false, errors: ['Invalid company data'] }
  }
  
  // Validate basic fields
  if (typeof company.postMoneyVal !== 'number' || company.postMoneyVal <= 0) {
    errors.push('Post-money valuation must be a positive number')
  }
  
  if (typeof company.roundSize !== 'number' || company.roundSize <= 0) {
    errors.push('Round size must be a positive number')
  }
  
  if (company.postMoneyVal <= company.roundSize) {
    errors.push('Post-money valuation must be greater than round size')
  }
  
  // Validate multi-party structures
  if (company.priorInvestors && !validatePriorInvestors(company.priorInvestors)) {
    errors.push('Invalid prior investors data')
  }
  
  if (company.founders && !validateFounders(company.founders)) {
    errors.push('Invalid founders data')
  }
  
  // Validate ownership totals don't exceed 100%
  const totalPriorOwnership = calculateTotalOwnership(company.priorInvestors || [])
  const totalFounderOwnership = calculateTotalOwnership(company.founders || [])
  const totalPreRoundOwnership = totalPriorOwnership + totalFounderOwnership
  
  if (totalPreRoundOwnership > 100) {
    errors.push(`Total pre-round ownership (${totalPreRoundOwnership.toFixed(1)}%) exceeds 100%`)
  }
  
  return {
    success: errors.length === 0,
    errors
  }
}