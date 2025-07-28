/**
 * Social sharing utilities for generating rich previews
 */

import { decodeScenarioFromURL } from './permalink'
import { calculateScenario } from './calculations'

/**
 * Generates a human-readable summary of a scenario
 * @param {Object} scenarioData - The scenario data
 * @returns {string} - Human-readable scenario summary
 */
function generateScenarioSummary(scenarioData) {
  if (!scenarioData) return 'Investment scenario analysis'

  const result = calculateScenario(scenarioData)
  if (!result) return 'Investment scenario analysis'

  const parts = []
  
  // Basic scenario info
  parts.push(`$${scenarioData.postMoneyVal}M post-money valuation`)
  parts.push(`$${scenarioData.roundSize}M round size`)
  
  // Investor info
  if (scenarioData.investorName && scenarioData.investorName !== 'US') {
    parts.push(`${scenarioData.investorName}: $${scenarioData.investorPortion}M`)
  } else {
    parts.push(`Lead: $${scenarioData.investorPortion}M`)
  }

  // Advanced features
  if (scenarioData.showAdvanced) {
    if (scenarioData.safes && scenarioData.safes.length > 0) {
      const totalSafeAmount = scenarioData.safes.reduce((sum, safe) => sum + (safe.amount || 0), 0)
      if (totalSafeAmount > 0) {
        parts.push(`${scenarioData.safes.length} SAFE${scenarioData.safes.length > 1 ? 's' : ''}: $${totalSafeAmount}M`)
      }
    }
    
    if (scenarioData.preRoundFounderOwnership > 0) {
      parts.push(`Founder dilution: ${result.founderDilution.toFixed(1)}%`)
    }
    
    if (scenarioData.proRataPercent > 0) {
      parts.push(`Pro-rata: ${scenarioData.proRataPercent}%`)
    }
  }

  return parts.join(' • ')
}

/**
 * Generates a detailed description for the scenario
 * @param {Object} scenarioData - The scenario data
 * @returns {string} - Detailed scenario description
 */
function generateScenarioDescription(scenarioData) {
  if (!scenarioData) {
    return 'Interactive valuation analysis tool for investment scenarios with advanced features like multiple SAFE notes, pro-rata participation, and founder dilution modeling.'
  }

  const result = calculateScenario(scenarioData)
  if (!result) {
    return 'Investment scenario analysis with detailed cap table modeling.'
  }

  const investorName = scenarioData.investorName || 'Lead investor'
  const roundPercent = result.roundPercent.toFixed(1)
  const preMoneyVal = result.preMoneyVal.toFixed(1)

  let description = `${investorName} invests $${scenarioData.investorPortion}M in a $${scenarioData.roundSize}M round at $${scenarioData.postMoneyVal}M post-money ($${preMoneyVal}M pre-money), acquiring ${roundPercent}% ownership.`

  // Add advanced features context
  if (scenarioData.showAdvanced) {
    const advancedFeatures = []
    
    if (scenarioData.safes && scenarioData.safes.length > 0) {
      const totalSafeAmount = scenarioData.safes.reduce((sum, safe) => sum + (safe.amount || 0), 0)
      if (totalSafeAmount > 0) {
        advancedFeatures.push(`${scenarioData.safes.length} SAFE note${scenarioData.safes.length > 1 ? 's' : ''} totaling $${totalSafeAmount}M`)
      }
    }
    
    if (scenarioData.preRoundFounderOwnership > 0) {
      advancedFeatures.push(`founder dilution of ${result.founderDilution.toFixed(1)}%`)
    }
    
    if (scenarioData.proRataPercent > 0) {
      advancedFeatures.push(`${scenarioData.proRataPercent}% pro-rata participation`)
    }

    if (advancedFeatures.length > 0) {
      description += ` Analysis includes ${advancedFeatures.join(', ')}.`
    }
  }

  return description
}

/**
 * Updates the page meta tags for social sharing
 * @param {string} title - Page title
 * @param {string} description - Page description
 * @param {string} url - Current page URL
 */
function updateMetaTags(title, description, url) {
  // Update title
  document.title = title
  
  // Update Open Graph meta tags
  const ogTitle = document.querySelector('meta[property="og:title"]')
  if (ogTitle) ogTitle.setAttribute('content', title)
  
  const ogDescription = document.querySelector('meta[property="og:description"]')
  if (ogDescription) ogDescription.setAttribute('content', description)
  
  const ogUrl = document.querySelector('meta[property="og:url"]')
  if (ogUrl) ogUrl.setAttribute('content', url)
  
  // Update Twitter Card meta tags
  const twitterTitle = document.querySelector('meta[name="twitter:title"]')
  if (twitterTitle) twitterTitle.setAttribute('content', title)
  
  const twitterDescription = document.querySelector('meta[name="twitter:description"]')
  if (twitterDescription) twitterDescription.setAttribute('content', description)
  
  // Update description meta tag
  let descriptionMeta = document.querySelector('meta[name="description"]')
  if (!descriptionMeta) {
    descriptionMeta = document.createElement('meta')
    descriptionMeta.setAttribute('name', 'description')
    document.head.appendChild(descriptionMeta)
  }
  descriptionMeta.setAttribute('content', description)
}

/**
 * Updates social sharing meta tags based on current URL parameters
 * @param {string} currentUrl - Current page URL (optional, defaults to window.location.href)
 */
export function updateSocialSharingMeta(currentUrl = window.location.href) {
  const url = new URL(currentUrl)
  const urlParams = url.search
  
  if (!urlParams) {
    // Default meta tags for homepage
    const title = 'ValuFrame - Valuation Framework'
    const description = 'Interactive valuation analysis tool for investment scenarios with advanced features like multiple SAFE notes, pro-rata participation, and founder dilution modeling.'
    updateMetaTags(title, description, currentUrl)
    return
  }

  // Decode scenario from URL
  const scenarioData = decodeScenarioFromURL(urlParams)
  
  if (!scenarioData) {
    // Invalid URL params, use default
    const title = 'ValuFrame - Investment Scenario'
    const description = 'Valuation analysis scenario - click to view detailed breakdown and calculations.'
    updateMetaTags(title, description, currentUrl)
    return
  }

  // Generate dynamic content
  const scenarioSummary = generateScenarioSummary(scenarioData)
  const title = `ValuFrame: ${scenarioSummary}`
  const description = generateScenarioDescription(scenarioData)
  
  updateMetaTags(title, description, currentUrl)
}

/**
 * Generates a formatted text summary for copying/sharing
 * @param {Object} scenarioData - The scenario data
 * @returns {string} - Formatted text summary
 */
export function generateShareableText(scenarioData) {
  if (!scenarioData) return 'Investment Scenario Analysis'

  const result = calculateScenario(scenarioData)
  if (!result) return 'Investment Scenario Analysis'

  const lines = []
  lines.push('🚀 Investment Scenario Analysis')
  lines.push('')
  
  // Basic metrics
  lines.push(`💰 Post-Money Valuation: $${scenarioData.postMoneyVal}M`)
  lines.push(`💰 Pre-Money Valuation: $${result.preMoneyVal}M`)
  lines.push(`📊 Round Size: $${scenarioData.roundSize}M`)
  lines.push('')
  
  // Investment breakdown
  const investorName = scenarioData.investorName || 'Lead Investor'
  lines.push(`👥 ${investorName}: $${scenarioData.investorPortion}M (${result.investorPercent.toFixed(1)}%)`)
  if (scenarioData.otherPortion > 0) {
    lines.push(`👥 Other Investors: $${scenarioData.otherPortion}M (${result.otherPercent.toFixed(1)}%)`)
  }
  
  // Advanced features
  if (scenarioData.showAdvanced) {
    if (scenarioData.safes && scenarioData.safes.length > 0) {
      lines.push('')
      lines.push('🛡️ SAFE Notes:')
      scenarioData.safes.forEach((safe, index) => {
        if (safe.amount > 0) {
          const terms = []
          if (safe.cap > 0) terms.push(`$${safe.cap}M cap`)
          if (safe.discount > 0) terms.push(`${safe.discount}% discount`)
          const termStr = terms.length > 0 ? ` (${terms.join(', ')})` : ''
          lines.push(`  • SAFE #${index + 1}: $${safe.amount}M${termStr}`)
        }
      })
    }
    
    if (scenarioData.preRoundFounderOwnership > 0) {
      lines.push('')
      lines.push(`📈 Founder Impact:`)
      lines.push(`  • Pre-round: ${scenarioData.preRoundFounderOwnership}%`)
      lines.push(`  • Post-round: ${result.postRoundFounderPercent}%`)
      lines.push(`  • Dilution: ${result.founderDilution.toFixed(1)}%`)
    }
    
    if (scenarioData.proRataPercent > 0) {
      lines.push('')
      lines.push(`🔄 Pro-Rata: ${scenarioData.proRataPercent}% of round ($${result.proRataAmount}M)`)
    }
  }
  
  lines.push('')
  lines.push('📊 Built with ValuFrame')
  
  return lines.join('\n')
}

/**
 * Initialize social sharing meta tags on page load
 */
export function initializeSocialSharing() {
  // Update meta tags based on current URL
  updateSocialSharingMeta()
  
  // Listen for URL changes (for client-side routing)
  window.addEventListener('popstate', () => {
    updateSocialSharingMeta()
  })
}