import { describe, it, expect, beforeEach, vi } from 'vitest'
import { updateSocialSharingMeta, generateShareableText } from './socialSharing'

// Mock DOM methods
const mockMetaTag = (selector, content = '') => ({
  setAttribute: vi.fn(),
  getAttribute: vi.fn(() => content)
})

describe('Social Sharing Utilities', () => {
  const mockScenarioData = {
    postMoneyVal: 13,
    roundSize: 3,
    investorPortion: 2.75,
    otherPortion: 0.25,
    investorName: 'US',
    showAdvanced: false,
    proRataPercent: 0,
    safes: [],
    safeAmount: 0,
    safeCap: 0,
    safeDiscount: 0,
    preRoundFounderOwnership: 0
  }

  const mockAdvancedScenario = {
    ...mockScenarioData,
    showAdvanced: true,
    preRoundFounderOwnership: 70,
    proRataPercent: 25,
    safes: [
      { id: 1, amount: 1, cap: 8, discount: 0 },
      { id: 2, amount: 0.5, cap: 0, discount: 20 }
    ]
  }

  beforeEach(() => {
    // Mock document methods
    global.document = {
      title: '',
      querySelector: vi.fn(),
      createElement: vi.fn(() => ({
        setAttribute: vi.fn()
      })),
      head: {
        appendChild: vi.fn()
      }
    }

    // Mock window.location
    global.window = {
      location: {
        href: 'http://localhost:3000/',
        origin: 'http://localhost:3000',
        pathname: '/'
      }
    }

    vi.clearAllMocks()
  })

  describe('generateShareableText', () => {
    it('should generate basic scenario text', () => {
      const text = generateShareableText(mockScenarioData)
      
      expect(text).toContain('🚀 Investment Scenario Analysis')
      expect(text).toContain('💰 Post-Money Valuation: $13M')
      expect(text).toContain('💰 Pre-Money Valuation: $10M')
      expect(text).toContain('📊 Round Size: $3M')
      expect(text).toContain('👥 US: $2.75M')
      expect(text).toContain('👥 Other Investors: $0.25M')
      expect(text).toContain('📊 Built with ValuFrame')
    })

    it('should include advanced features in text', () => {
      const text = generateShareableText(mockAdvancedScenario)
      
      expect(text).toContain('🛡️ SAFE Notes:')
      expect(text).toContain('SAFE #1: $1M ($8M cap)')
      expect(text).toContain('SAFE #2: $0.5M (20% discount)')
      expect(text).toContain('📈 Founder Impact:')
      expect(text).toContain('Pre-round: 70%')
      expect(text).toContain('🔄 Pro-Rata: 25%')
    })

    it('should handle custom investor names', () => {
      const customScenario = {
        ...mockScenarioData,
        investorName: 'Acme Ventures'
      }
      
      const text = generateShareableText(customScenario)
      expect(text).toContain('👥 Acme Ventures: $2.75M')
    })

    it('should handle scenarios with no other investors', () => {
      const noOtherScenario = {
        ...mockScenarioData,
        otherPortion: 0,
        investorPortion: 3
      }
      
      const text = generateShareableText(noOtherScenario)
      expect(text).toContain('👥 US: $3M')
      expect(text).not.toContain('👥 Other Investors: $0M')
    })

    it('should handle null/undefined scenario data', () => {
      expect(generateShareableText(null)).toBe('Investment Scenario Analysis')
      expect(generateShareableText(undefined)).toBe('Investment Scenario Analysis')
    })
  })

  describe('updateSocialSharingMeta', () => {
    beforeEach(() => {
      // Mock querySelector to return mock meta tags
      document.querySelector = vi.fn((selector) => {
        if (selector.includes('og:title') || selector.includes('twitter:title')) {
          return mockMetaTag(selector)
        }
        if (selector.includes('og:description') || selector.includes('twitter:description')) {
          return mockMetaTag(selector)
        }
        if (selector.includes('og:url')) {
          return mockMetaTag(selector)
        }
        if (selector.includes('name="description"')) {
          return null // Simulate meta description doesn't exist initially
        }
        return mockMetaTag(selector)
      })
    })

    it('should update meta tags for homepage', () => {
      updateSocialSharingMeta('http://localhost:3000/')
      
      expect(document.title).toBe('ValuFrame - Valuation Framework')
      expect(document.querySelector).toHaveBeenCalledWith('meta[property="og:title"]')
      expect(document.querySelector).toHaveBeenCalledWith('meta[property="og:description"]')
    })

    it('should update meta tags for scenario URLs', () => {
      const urlWithParams = 'http://localhost:3000/?pmv=13&rs=3&ip=2.75&op=0.25&in=US'
      updateSocialSharingMeta(urlWithParams)
      
      expect(document.title).toContain('ValuFrame:')
      expect(document.title).toContain('$13M post-money')
      expect(document.querySelector).toHaveBeenCalledWith('meta[property="og:title"]')
    })

    it('should handle invalid URL parameters', () => {
      const invalidUrl = 'http://localhost:3000/?invalid=params'
      updateSocialSharingMeta(invalidUrl)
      
      expect(document.title).toBe('ValuFrame - Investment Scenario')
    })

    it('should create description meta tag if it does not exist', () => {
      const mockCreateElement = vi.fn(() => ({
        setAttribute: vi.fn()
      }))
      document.createElement = mockCreateElement
      
      updateSocialSharingMeta('http://localhost:3000/')
      
      expect(mockCreateElement).toHaveBeenCalledWith('meta')
      expect(document.head.appendChild).toHaveBeenCalled()
    })
  })

  describe('Meta Tag Content Generation', () => {
    it('should generate appropriate title for basic scenario', () => {
      const urlWithParams = 'http://localhost:3000/?pmv=15&rs=4&ip=3&op=1&in=TechVC'
      updateSocialSharingMeta(urlWithParams)
      
      expect(document.title).toContain('$15M post-money valuation')
      expect(document.title).toContain('$4M round size')
      expect(document.title).toContain('TechVC: $3M')
    })

    it('should generate comprehensive description for advanced scenario', () => {
      // This test verifies that the description generation works
      // The actual DOM updates are mocked, so we focus on the logic
      const advancedUrl = 'http://localhost:3000/?pmv=13&rs=3&ip=2.75&op=0.25&in=US&adv=1&pf=70&pr=25'
      
      // Mock the description meta tag specifically
      const mockDescMeta = mockMetaTag('description')
      document.querySelector = vi.fn((selector) => {
        if (selector === 'meta[name="description"]') {
          return mockDescMeta
        }
        return mockMetaTag(selector)
      })
      
      updateSocialSharingMeta(advancedUrl)
      
      // Verify that setAttribute was called on the description meta tag
      expect(mockDescMeta.setAttribute).toHaveBeenCalledWith(
        'content',
        expect.stringContaining('US invests $2.75M')
      )
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complex scenarios with multiple SAFEs', () => {
      const text = generateShareableText(mockAdvancedScenario)
      
      // Should include all major components
      expect(text).toContain('🚀 Investment Scenario Analysis')
      expect(text).toContain('💰 Post-Money Valuation')
      expect(text).toContain('🛡️ SAFE Notes:')
      expect(text).toContain('📈 Founder Impact:')
      expect(text).toContain('🔄 Pro-Rata:')
      expect(text).toContain('📊 Built with ValuFrame')
      
      // Should have proper formatting
      const lines = text.split('\n')
      expect(lines[0]).toBe('🚀 Investment Scenario Analysis')
      expect(lines[lines.length - 1]).toBe('📊 Built with ValuFrame')
    })

    it('should generate different content for different scenarios', () => {
      const scenario1 = generateShareableText(mockScenarioData)
      const scenario2 = generateShareableText(mockAdvancedScenario)
      
      expect(scenario1).not.toBe(scenario2)
      expect(scenario1.length).toBeLessThan(scenario2.length)
      expect(scenario2).toContain('🛡️ SAFE Notes:')
      expect(scenario1).not.toContain('🛡️ SAFE Notes:')
    })
  })
})