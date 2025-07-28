/**
 * Permalink utilities for sharing scenario configurations via URL
 */

const REQUIRED_FIELDS = ['postMoneyVal', 'roundSize', 'investorPortion', 'otherPortion', 'investorName']

const URL_PARAM_MAP = {
  postMoneyVal: 'pmv',
  roundSize: 'rs', 
  investorPortion: 'ip',
  otherPortion: 'op',
  investorName: 'in',
  proRataPercent: 'pr',
  safeAmount: 'sa',
  safeCap: 'sc',
  preRoundFounderOwnership: 'pf'
}

const REVERSE_PARAM_MAP = Object.fromEntries(
  Object.entries(URL_PARAM_MAP).map(([key, value]) => [value, key])
)

/**
 * Validates if scenario data contains all required fields with valid values
 * @param {Object} scenarioData - The scenario data to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export function isValidScenarioData(scenarioData) {
  if (!scenarioData || typeof scenarioData !== 'object') {
    return false
  }

  // Check required fields exist and are valid numbers
  for (const field of REQUIRED_FIELDS) {
    const value = scenarioData[field]
    
    if (field === 'investorName') {
      if (!value || typeof value !== 'string' || value.trim().length === 0) {
        return false
      }
    } else {
      if (typeof value !== 'number' || isNaN(value) || value < 0) {
        return false
      }
      // roundSize must be positive
      if (field === 'roundSize' && value === 0) {
        return false
      }
    }
  }

  return true
}

/**
 * Encodes scenario data into URL parameters
 * @param {Object} scenarioData - The scenario data to encode
 * @returns {string} - URL parameter string (without leading ?)
 */
export function encodeScenarioToURL(scenarioData) {
  if (!isValidScenarioData(scenarioData)) {
    throw new Error('Invalid scenario data provided for encoding')
  }

  const params = new URLSearchParams()

  // Add all fields that have mappings
  Object.entries(URL_PARAM_MAP).forEach(([field, param]) => {
    const value = scenarioData[field]
    
    if (value !== undefined && value !== null) {
      // Only include non-zero values for optional fields
      if (['proRataPercent', 'safeAmount', 'safeCap'].includes(field) && value === 0) {
        return
      }
      
      // Set default for preRoundFounderOwnership if not provided
      if (field === 'preRoundFounderOwnership' && value === 70) {
        return // Don't include default value
      }
      
      params.set(param, value.toString())
    }
  })

  return params.toString()
}

/**
 * Decodes URL parameters into scenario data
 * @param {string} urlParams - URL parameter string or full search string
 * @returns {Object|null} - Decoded scenario data or null if invalid
 */
export function decodeScenarioFromURL(urlParams) {
  if (!urlParams || typeof urlParams !== 'string') {
    return null
  }

  try {
    // Handle both full search string and parameter string
    const paramString = urlParams.startsWith('?') ? urlParams.slice(1) : urlParams
    const params = new URLSearchParams(paramString)
    
    const scenarioData = {
      // Default values
      showAdvanced: false,
      proRataPercent: 0,
      safeAmount: 0,
      safeCap: 0,
      preRoundFounderOwnership: 70
    }

    // Decode parameters
    for (const [param, field] of Object.entries(REVERSE_PARAM_MAP)) {
      const value = params.get(param)
      
      if (value !== null) {
        if (field === 'investorName') {
          scenarioData[field] = decodeURIComponent(value)
        } else {
          const numValue = parseFloat(value)
          if (isNaN(numValue)) {
            return null // Invalid number
          }
          scenarioData[field] = numValue
        }
      }
    }

    // Set showAdvanced to true if any advanced features are present
    if (scenarioData.safeAmount > 0 || scenarioData.safeCap > 0 || 
        scenarioData.proRataPercent > 0 || scenarioData.preRoundFounderOwnership !== 70) {
      scenarioData.showAdvanced = true
    }

    // Validate the decoded data
    if (!isValidScenarioData(scenarioData)) {
      return null
    }

    return scenarioData

  } catch (error) {
    console.warn('Error decoding scenario from URL:', error)
    return null
  }
}

/**
 * Generates a complete permalink URL for sharing
 * @param {Object} scenarioData - The scenario data to encode
 * @returns {string} - Complete URL with encoded scenario
 */
export function generatePermalink(scenarioData) {
  const encoded = encodeScenarioToURL(scenarioData)
  const baseUrl = `${window.location.origin}${window.location.pathname}`
  return `${baseUrl}?${encoded}`
}

/**
 * Copies a permalink to the clipboard
 * @param {Object} scenarioData - The scenario data to encode and copy
 * @returns {Promise<Object>} - Result object with success boolean and optional error
 */
export async function copyPermalinkToClipboard(scenarioData) {
  try {
    if (!navigator.clipboard) {
      return {
        success: false,
        error: 'Clipboard API not available'
      }
    }

    const permalink = generatePermalink(scenarioData)
    await navigator.clipboard.writeText(permalink)
    
    return {
      success: true,
      url: permalink
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Loads scenario data from current URL and clears the URL parameters
 * @returns {Object|null} - Loaded scenario data or null if not present/invalid
 */
export function loadScenarioFromURL() {
  const urlParams = window.location.search
  
  if (!urlParams) {
    return null
  }

  const scenarioData = decodeScenarioFromURL(urlParams)
  
  // Always clear URL parameters after attempting to load, even if invalid
  const cleanUrl = `${window.location.origin}${window.location.pathname}`
  window.history.replaceState(null, '', cleanUrl)

  return scenarioData
}