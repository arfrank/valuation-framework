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
  showAdvanced: 'adv',
  proRataPercent: 'pr',
  // N SAFEs array will be encoded as 'safes' parameter
  safes: 'safes',
  preRoundFounderOwnership: 'pf',
  // ESOP modeling
  currentEsopPercent: 'ce',
  targetEsopPercent: 'te',
  esopTiming: 'et'
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
      // Handle boolean showAdvanced field
      if (field === 'showAdvanced') {
        if (value === true) {
          params.set(param, '1')
        }
        return // Don't include if false (default)
      }
      
      // Handle SAFEs array encoding
      if (field === 'safes') {
        if (Array.isArray(value) && value.length > 0) {
          // Encode SAFEs array as JSON string
          const safesData = value.map(safe => ({
            a: safe.amount || 0,
            c: safe.cap || 0,
            d: safe.discount || 0
          })).filter(safe => safe.a > 0) // Only include SAFEs with amount > 0
          
          if (safesData.length > 0) {
            params.set(param, JSON.stringify(safesData))
          }
        }
        return
      }
      
      // Only include non-zero values for optional fields
      if (['proRataPercent', 'currentEsopPercent', 'targetEsopPercent'].includes(field) && value === 0) {
        return
      }
      
      // Don't include default value for preRoundFounderOwnership
      if (field === 'preRoundFounderOwnership' && value === 0) {
        return // Don't include default value
      }

      // Don't include default ESOP timing
      if (field === 'esopTiming' && value === 'pre-close') {
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
      safes: [], // N SAFEs array
      preRoundFounderOwnership: 0,
      // ESOP defaults
      currentEsopPercent: 0,
      targetEsopPercent: 0,
      esopTiming: 'pre-close'
    }

    // Decode parameters
    for (const [param, field] of Object.entries(REVERSE_PARAM_MAP)) {
      const value = params.get(param)
      
      if (value !== null) {
        if (field === 'investorName') {
          scenarioData[field] = decodeURIComponent(value)
        } else if (field === 'showAdvanced') {
          scenarioData[field] = value === '1'
        } else if (field === 'esopTiming') {
          scenarioData[field] = value // String value, no parsing needed
        } else if (field === 'safes') {
          // Decode SAFEs array from JSON
          try {
            const safesData = JSON.parse(value)
            if (Array.isArray(safesData)) {
              scenarioData[field] = safesData.map((safe, index) => ({
                id: Date.now() + index, // Generate unique IDs
                amount: safe.a || 0,
                cap: safe.c || 0,
                discount: safe.d || 0
              }))
            }
          } catch (error) {
            console.warn('Failed to decode SAFEs array from URL:', error)
            scenarioData[field] = []
          }
        } else {
          const numValue = parseFloat(value)
          if (isNaN(numValue)) {
            return null // Invalid number
          }
          scenarioData[field] = numValue
        }
      }
    }

    // Set showAdvanced to true if any advanced features are present (but don't override explicit setting)
    if (!params.has('adv') && (scenarioData.proRataPercent > 0 || scenarioData.preRoundFounderOwnership > 0 ||
        (scenarioData.safes && scenarioData.safes.length > 0) || scenarioData.currentEsopPercent > 0 || 
        scenarioData.targetEsopPercent > 0)) {
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