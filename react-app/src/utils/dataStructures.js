import { buildScenarioOffsets, normalizeScenarioOffsets } from './scenarioOffsets'

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
    hasProRataRights: Boolean(hasProRataRights),
    proRataOverride: null // null = use calculated amount, number = custom allocation in $M
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
 * Creates a new warrant object. Warrants are expressed as a dollar amount
 * struck at a reference valuation (the standard venture debt phrasing:
 * "$500k of warrants at a $50M valuation"). Pre-round % = amount / valuation.
 * @param {string} name - Warrant holder name
 * @param {number} amount - Warrant coverage in $M
 * @param {number} valuation - Reference valuation in $M (post-money at issuance, typically)
 * @returns {Object} Warrant object
 */
export function createWarrant(name = '', amount = 0, valuation = 0) {
  return {
    id: Date.now() + Math.random(),
    name: name.trim(),
    amount: Math.max(0, Number(amount) || 0),
    valuation: Math.max(0, Number(valuation) || 0)
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

function getOptionalNumber(...values) {
  for (const value of values) {
    if (value === '' || value === null || value === undefined) continue
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function normalizePriorInvestor(investor = {}) {
  const {
    proRataAmount: _legacyProRataAmount,
    ...restInvestor
  } = investor
  const base = createPriorInvestor(
    typeof restInvestor.name === 'string' ? restInvestor.name : '',
    clamp(getOptionalNumber(restInvestor.ownershipPercent) ?? 0, 0, 100),
    Boolean(restInvestor.hasProRataRights)
  )
  const proRataOverride = getOptionalNumber(restInvestor.proRataOverride, investor.proRataAmount)

  return {
    ...base,
    ...restInvestor,
    name: typeof restInvestor.name === 'string' ? restInvestor.name.trim() : '',
    ownershipPercent: clamp(getOptionalNumber(restInvestor.ownershipPercent) ?? 0, 0, 100),
    hasProRataRights: Boolean(restInvestor.hasProRataRights),
    proRataOverride: proRataOverride === undefined ? null : Math.max(0, proRataOverride)
  }
}

function normalizeFounder(founder = {}) {
  const base = createFounder(
    typeof founder.name === 'string' ? founder.name : '',
    clamp(getOptionalNumber(founder.ownershipPercent) ?? 0, 0, 100)
  )

  return {
    ...base,
    ...founder,
    name: typeof founder.name === 'string' ? founder.name.trim() : '',
    ownershipPercent: clamp(getOptionalNumber(founder.ownershipPercent) ?? 0, 0, 100)
  }
}

function normalizeWarrant(warrant = {}) {
  const base = createWarrant(
    typeof warrant.name === 'string' ? warrant.name : '',
    Math.max(0, getOptionalNumber(warrant.amount) ?? 0),
    Math.max(0, getOptionalNumber(warrant.valuation) ?? 0)
  )
  return {
    ...base,
    ...warrant,
    name: typeof warrant.name === 'string' ? warrant.name.trim() : '',
    amount: Math.max(0, getOptionalNumber(warrant.amount) ?? 0),
    valuation: Math.max(0, getOptionalNumber(warrant.valuation) ?? 0)
  }
}

function normalizeSafe(safe = {}) {
  const {
    proRataAmount: _legacyProRataAmount,
    ...restSafe
  } = safe
  const proRataOverride = getOptionalNumber(restSafe.proRataOverride, safe.proRataAmount)
  const base = {
    proRata: false,
    proRataOverride: null
  }

  return {
    ...base,
    ...restSafe,
    proRata: Boolean(restSafe.proRata),
    proRataOverride: proRataOverride === undefined ? null : Math.max(0, proRataOverride)
  }
}

function looksLikeSingleStoredCompany(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  return [
    'postMoneyVal',
    'postMoney',
    'roundSize',
    'round',
    'investorPortion',
    'investor',
    'otherPortion',
    'other',
    'investorName',
    'showAdvanced',
    'proRataPercent',
    'preRoundFounderOwnership',
    'priorInvestors',
    'founders',
    'safes',
    'currentEsopPercent',
    'targetEsopPercent',
    'twoStepEnabled',
    'showExitMath',
    'exitMath',
    'warrants'
  ].some((key) => Object.prototype.hasOwnProperty.call(value, key))
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
    percentPrecision: 2,

    // 2-Step Round support
    twoStepEnabled: false,
    step2PostMoney: 0,
    step2Amount: 0,
    step2InvestorPortion: 0,
    step2OtherPortion: 0,

    // Exit Math module (local exploration tool; not permalinked)
    showExitMath: false,
    exitMath: {
      exitValuation: 5000,
      numRounds: 3,
      uniformDilution: 20,
      perRoundOverrides: []
    },

    // New multi-party structures
    priorInvestors: [
      createPriorInvestor('Previous Investors', 15, false)
    ],
    founders: [
      createFounder('Founder Team', 85) // Default founder ownership
    ],
    
    // SAFE and ESOP support
    safes: [],
    currentEsopPercent: 0,
    grantedEsopPercent: 0,
    targetEsopPercent: 0,
    esopTiming: 'pre-close',

    // Warrants: rough model. Each warrant is "$X of warrants at $Y valuation"
    // (standard venture debt phrasing). Pre-round % = sum(amount / valuation).
    // Dilutes like other pre-round equity when the round closes.
    warrants: [],

    // Sensitivity scenarios: valuation % offsets to render as alternative cards
    scenarioOffsets: buildScenarioOffsets(30),
    
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
export function migrateLegacyCompany(legacyCompany, fallbackName = 'New Company') {
  if (!legacyCompany || typeof legacyCompany !== 'object' || Array.isArray(legacyCompany)) {
    return createDefaultCompany(fallbackName)
  }

  const resolvedName = typeof legacyCompany.name === 'string' && legacyCompany.name.trim()
    ? legacyCompany.name.trim()
    : fallbackName
  const defaults = createDefaultCompany(resolvedName)
  const migrated = {
    ...defaults,
    ...legacyCompany,
    name: resolvedName
  }

  migrated.postMoneyVal = Math.max(0, getOptionalNumber(legacyCompany.postMoneyVal, legacyCompany.postMoney) ?? defaults.postMoneyVal)
  migrated.roundSize = Math.max(0, getOptionalNumber(legacyCompany.roundSize, legacyCompany.round) ?? defaults.roundSize)
  migrated.investorPortion = clamp(
    Math.max(0, getOptionalNumber(legacyCompany.investorPortion, legacyCompany.investor) ?? defaults.investorPortion),
    0,
    migrated.roundSize
  )

  const explicitOtherPortion = getOptionalNumber(legacyCompany.otherPortion, legacyCompany.other)
  migrated.otherPortion = explicitOtherPortion === undefined
    ? Math.max(0, migrated.roundSize - migrated.investorPortion)
    : clamp(Math.max(0, explicitOtherPortion), 0, Math.max(0, migrated.roundSize - migrated.investorPortion))
  migrated.investorName = typeof migrated.investorName === 'string' && migrated.investorName.trim()
    ? migrated.investorName.trim()
    : defaults.investorName
  migrated.showAdvanced = Boolean(migrated.showAdvanced)
  migrated.esopTiming = migrated.esopTiming === 'post-close' ? 'post-close' : defaults.esopTiming
  delete migrated.postMoney
  delete migrated.round
  delete migrated.investor
  delete migrated.other

  // Migrate legacy proRataPercent and preRoundFounderOwnership
  if (!Array.isArray(legacyCompany.priorInvestors) && !Array.isArray(legacyCompany.founders)) {
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
  migrated.priorInvestors = Array.isArray(migrated.priorInvestors)
    ? migrated.priorInvestors.map((investor) => normalizePriorInvestor(investor))
    : []
  migrated.founders = Array.isArray(migrated.founders)
    ? migrated.founders.map((founder) => normalizeFounder(founder))
    : [createFounder('Founder Team', 85)]
  migrated.safes = Array.isArray(migrated.safes)
    ? migrated.safes.map((safe) => normalizeSafe(safe))
    : []

  // Ensure 2-step round fields exist
  migrated.twoStepEnabled = Boolean(migrated.twoStepEnabled)
  migrated.step2PostMoney = Math.max(0, getOptionalNumber(migrated.step2PostMoney) ?? 0)
  migrated.step2Amount = Math.max(0, getOptionalNumber(migrated.step2Amount) ?? 0)
  migrated.step2InvestorPortion = clamp(
    Math.max(0, getOptionalNumber(migrated.step2InvestorPortion) ?? 0),
    0,
    migrated.step2Amount
  )
  migrated.step2OtherPortion = clamp(
    Math.max(0, getOptionalNumber(migrated.step2OtherPortion) ?? Math.max(0, migrated.step2Amount - migrated.step2InvestorPortion)),
    0,
    Math.max(0, migrated.step2Amount - migrated.step2InvestorPortion)
  )

  // Ensure ESOP fields exist (grantedEsopPercent added after initial release)
  migrated.currentEsopPercent = Math.max(0, getOptionalNumber(migrated.currentEsopPercent) ?? defaults.currentEsopPercent)
  migrated.grantedEsopPercent = Math.max(0, getOptionalNumber(migrated.grantedEsopPercent) ?? defaults.grantedEsopPercent)
  migrated.targetEsopPercent = Math.max(0, getOptionalNumber(migrated.targetEsopPercent) ?? defaults.targetEsopPercent)
  migrated.warrants = Array.isArray(migrated.warrants)
    ? migrated.warrants.map((w) => normalizeWarrant(w))
    : []
  delete migrated.preRoundWarrantsPercent
  delete migrated.fdSharesOutstanding
  migrated.percentPrecision = clamp(getOptionalNumber(migrated.percentPrecision) ?? defaults.percentPrecision, 0, 6)

  // Ensure scenarioOffsets exist
  migrated.scenarioOffsets = normalizeScenarioOffsets(migrated.scenarioOffsets)

  // Ensure Exit Math fields exist
  migrated.showExitMath = Boolean(migrated.showExitMath)
  migrated.exitMath = migrated.exitMath && typeof migrated.exitMath === 'object' && !Array.isArray(migrated.exitMath)
    ? {
        ...defaults.exitMath,
        ...migrated.exitMath,
        perRoundOverrides: Array.isArray(migrated.exitMath.perRoundOverrides)
          ? migrated.exitMath.perRoundOverrides
          : defaults.exitMath.perRoundOverrides
      }
    : defaults.exitMath

  return migrated
}

export function normalizeStoredCompanies(storedCompanies, fallbackName = 'Startup Alpha') {
  const fallback = { company1: createDefaultCompany(fallbackName) }

  if (looksLikeSingleStoredCompany(storedCompanies)) {
    return {
      company1: migrateLegacyCompany(storedCompanies, storedCompanies.name || fallbackName)
    }
  }

  if (!storedCompanies || typeof storedCompanies !== 'object' || Array.isArray(storedCompanies)) {
    return fallback
  }

  const entries = Object.entries(storedCompanies).filter(([, company]) => (
    company &&
    typeof company === 'object' &&
    !Array.isArray(company)
  ))

  if (entries.length === 0) {
    return fallback
  }

  return entries.reduce((acc, [companyId, company], index) => {
    const defaultName = index === 0 ? fallbackName : `Startup ${index + 1}`
    acc[companyId] = migrateLegacyCompany(company, company?.name || defaultName)
    return acc
  }, {})
}

/**
 * Generates the next unique name for a duplicated company.
 * Appends or increments a trailing numeric suffix, skipping existing names.
 * @param {string} baseName - Source company name
 * @param {Object} companies - Map of existing companies keyed by id
 * @returns {string} Unique name
 */
export function nextUniqueName(baseName, companies) {
  const existing = new Set(Object.values(companies || {}).map(c => c && c.name))
  const match = (baseName || '').match(/^(.*?)\s+(\d+)$/)
  const stem = match ? match[1] : (baseName || 'Company')
  let n = match ? parseInt(match[2], 10) + 1 : 2
  while (existing.has(`${stem} ${n}`)) n++
  return `${stem} ${n}`
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
