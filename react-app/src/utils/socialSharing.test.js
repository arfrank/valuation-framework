import { describe, it, expect, beforeEach, vi } from 'vitest'
import { updateSocialSharingMeta } from './socialSharing'

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


  describe('updateSocialSharingMeta', () => {
    beforeEach(() => {
      // Mock querySelector to return mock meta tags
      document.querySelector = vi.fn((selector) => {
        if (selector.includes('name="description"')) {
          return null // Simulate meta description doesn't exist initially
        }
        return mockMetaTag(selector)
      })
    })

    it('should update meta tags for homepage', () => {
      updateSocialSharingMeta('http://localhost:3000/')
      
      expect(document.title).toBe('ValuFrame - Valuation Framework')
      expect(document.querySelector).toHaveBeenCalledWith('meta[name="description"]')
    })

    it('should update meta tags for scenario URLs', () => {
      const urlWithParams = 'http://localhost:3000/?pmv=13&rs=3&ip=2.75&op=0.25&in=US'
      updateSocialSharingMeta(urlWithParams)
      
      expect(document.title).toContain('ValuFrame:')
      expect(document.title).toContain('$13M post-money')
      expect(document.querySelector).toHaveBeenCalledWith('meta[name="description"]')
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

})