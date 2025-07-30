import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App Component - Local Storage Integration', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.clear()
    
    // Mock console.error to suppress expected error logs during testing
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore console.error after each test
    if (console.error?.mockRestore) {
      console.error.mockRestore()
    }
  })

  describe('Data Persistence', () => {
    it('should use default data when localStorage is empty', () => {
      render(<App />)
      
      // Verify default company exists by checking the tab name
      expect(screen.getByText('Startup Alpha')).toBeInTheDocument()
      
      // The app should be functional with default data
      expect(screen.getByText('Investment Parameters')).toBeInTheDocument()
    })

    it('should restore data from localStorage on app load', () => {
      // Pre-populate localStorage with custom data
      const customData = {
        company1: {
          name: 'Custom Company',
          postMoneyVal: 25,
          roundSize: 5,
          investorPortion: 3,
          otherPortion: 2,
          investorName: 'Custom Investor',
          showAdvanced: false,
          proRataPercent: 0,
          safes: [],
          preRoundFounderOwnership: 80,
          currentEsopPercent: 0,
          targetEsopPercent: 0,
          esopTiming: 'pre-close'
        }
      }
      localStorage.setItem('valuationFramework', JSON.stringify(customData))
      
      render(<App />)
      
      // Should display the custom data
      expect(screen.getByText('Custom Company')).toBeInTheDocument()
    })
  })

  describe('Corrupted Data Recovery', () => {
    it('should handle corrupted localStorage gracefully and use defaults', () => {
      // Store corrupted JSON
      localStorage.setItem('valuationFramework', 'invalid-json{broken')
      
      render(<App />)
      
      // Should render with default data despite corruption
      expect(screen.getByText('Startup Alpha')).toBeInTheDocument()
      expect(console.error).toHaveBeenCalled()
    })

    it('should handle partial data corruption', () => {
      // Store partially corrupted data (valid JSON but missing fields)
      const partialData = {
        company1: {
          name: 'Corrupted Company'
          // Missing required fields like postMoneyVal, roundSize, etc.
        }
      }
      localStorage.setItem('valuationFramework', JSON.stringify(partialData))
      
      render(<App />)
      
      // Should display the company name but handle missing fields gracefully
      expect(screen.getByText('Corrupted Company')).toBeInTheDocument()
      
      // The app should still be functional
      expect(screen.getByText('Investment Parameters')).toBeInTheDocument()
    })

    it('should handle localStorage quota exceeded errors', async () => {
      render(<App />)
      
      // Mock localStorage.setItem to throw quota exceeded error
      const originalSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = vi.fn(() => {
        throw new DOMException('QuotaExceededError')
      })
      
      // App should still render and be functional
      expect(screen.getByText('Startup Alpha')).toBeInTheDocument()
      expect(screen.getByText('Investment Parameters')).toBeInTheDocument()
      
      // Restore original method
      Storage.prototype.setItem = originalSetItem
    })
  })

  describe('Large Dataset Handling', () => {
    it('should handle large amounts of company data', () => {
      // Pre-populate with many companies
      const largeDataset = {}
      for (let i = 1; i <= 20; i++) {
        largeDataset[`company${i}`] = {
          name: `Company ${i}`,
          postMoneyVal: 10 + i,
          roundSize: 2 + (i * 0.1),
          investorPortion: 1.5 + (i * 0.05),
          otherPortion: 0.5 + (i * 0.05),
          investorName: `Investor ${i}`,
          showAdvanced: false,
          proRataPercent: i % 25,
          safes: [],
          preRoundFounderOwnership: 70 - i,
          currentEsopPercent: 0,
          targetEsopPercent: 0,
          esopTiming: 'pre-close'
        }
      }
      
      localStorage.setItem('valuationFramework', JSON.stringify(largeDataset))
      
      render(<App />)
      
      // Should render first company by default
      expect(screen.getByText('Company 1')).toBeInTheDocument()
    })

    it('should handle companies with large SAFE arrays', () => {
      // Create a company with many SAFEs
      const companyWithManySafes = {
        company1: {
          name: 'SAFE Heavy Company',
          postMoneyVal: 20,
          roundSize: 5,
          investorPortion: 3,
          otherPortion: 2,
          investorName: 'US',
          showAdvanced: true,
          proRataPercent: 0,
          safes: Array(25).fill(0).map((_, idx) => ({
            id: idx + 1,
            amount: Math.random() * 5,
            cap: 10 + Math.random() * 20,
            discount: Math.random() * 30
          })),
          preRoundFounderOwnership: 70,
          currentEsopPercent: 0,
          targetEsopPercent: 0,
          esopTiming: 'pre-close'
        }
      }
      
      localStorage.setItem('valuationFramework', JSON.stringify(companyWithManySafes))
      
      render(<App />)
      
      // Should render without crashing
      expect(screen.getByText('SAFE Heavy Company')).toBeInTheDocument()
    })
  })

  describe('Data Migration Scenarios', () => {
    it('should handle old data format gracefully', () => {
      // Simulate data from an older version of the app
      const oldFormatData = {
        company1: {
          name: 'Legacy Company',
          postMoney: 15, // Old field name
          round: 3, // Old field name
          investor: 2, // Old field name
          other: 1 // Old field name
          // Missing newer fields like safes, ESOP data, etc.
        }
      }
      
      localStorage.setItem('valuationFramework', JSON.stringify(oldFormatData))
      
      render(<App />)
      
      // Should render company name
      expect(screen.getByText('Legacy Company')).toBeInTheDocument()
      
      // App should be functional even with old format data
      expect(screen.getByText('Investment Parameters')).toBeInTheDocument()
    })

    it('should handle missing optional fields gracefully', () => {
      // Data with only required fields
      const minimalData = {
        company1: {
          name: 'Minimal Company',
          postMoneyVal: 10,
          roundSize: 2,
          investorPortion: 1.5,
          otherPortion: 0.5
          // Missing all optional advanced fields
        }
      }
      
      localStorage.setItem('valuationFramework', JSON.stringify(minimalData))
      
      render(<App />)
      
      // Should render and be functional
      expect(screen.getByText('Minimal Company')).toBeInTheDocument()
      expect(screen.getByText('Investment Parameters')).toBeInTheDocument()
    })
  })

  describe('Cross-Browser Compatibility', () => {
    it('should handle browsers where localStorage is disabled', () => {
      // Mock localStorage to be undefined (some browsers/modes)
      const originalLocalStorage = global.localStorage
      delete global.localStorage
      
      // Should not crash during render
      expect(() => render(<App />)).not.toThrow()
      
      // Restore localStorage
      global.localStorage = originalLocalStorage
    })

    it('should handle unicode and special characters in data', () => {
      const unicodeData = {
        company1: {
          name: '测试公司 🚀',
          postMoneyVal: 13,
          roundSize: 3,
          investorPortion: 2.75,
          otherPortion: 0.25,
          investorName: 'Émöji Invéstör 💰',
          showAdvanced: false,
          proRataPercent: 0,
          safes: [],
          preRoundFounderOwnership: 70,
          currentEsopPercent: 0,
          targetEsopPercent: 0,
          esopTiming: 'pre-close'
        }
      }
      
      localStorage.setItem('valuationFramework', JSON.stringify(unicodeData))
      
      render(<App />)
      
      // Should handle unicode gracefully
      expect(screen.getByText('测试公司 🚀')).toBeInTheDocument()
    })
  })
})