import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from './useLocalStorage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.clear()
    
    // Mock console.error to suppress expected error logs during testing
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore console.error after each test
    console.error.mockRestore()
  })

  describe('Basic Functionality', () => {
    it('should return initial value when localStorage is empty', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'))
      
      expect(result.current[0]).toBe('initial-value')
    })

    it('should persist and retrieve values from localStorage', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
      
      act(() => {
        result.current[1]('updated-value')
      })
      
      expect(result.current[0]).toBe('updated-value')
      expect(localStorage.getItem('test-key')).toBe('"updated-value"')
    })

    it('should restore value from localStorage on initialization', () => {
      // Pre-populate localStorage
      localStorage.setItem('test-key', JSON.stringify('stored-value'))
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
      
      expect(result.current[0]).toBe('stored-value')
    })

    it('should handle function-based updates', () => {
      const { result } = renderHook(() => useLocalStorage('counter', 0))
      
      act(() => {
        result.current[1](prev => prev + 1)
      })
      
      expect(result.current[0]).toBe(1)
      expect(localStorage.getItem('counter')).toBe('1')
    })
  })

  describe('Complex Data Types', () => {
    it('should handle objects', () => {
      const initialObject = { name: 'test', value: 42 }
      const { result } = renderHook(() => useLocalStorage('object-key', initialObject))
      
      const updatedObject = { name: 'updated', value: 100, nested: { foo: 'bar' } }
      
      act(() => {
        result.current[1](updatedObject)
      })
      
      expect(result.current[0]).toEqual(updatedObject)
      expect(JSON.parse(localStorage.getItem('object-key'))).toEqual(updatedObject)
    })

    it('should handle arrays', () => {
      const initialArray = [1, 2, 3]
      const { result } = renderHook(() => useLocalStorage('array-key', initialArray))
      
      const updatedArray = [4, 5, 6, { nested: true }]
      
      act(() => {
        result.current[1](updatedArray)
      })
      
      expect(result.current[0]).toEqual(updatedArray)
      expect(JSON.parse(localStorage.getItem('array-key'))).toEqual(updatedArray)
    })

    it('should handle null and undefined values', () => {
      const { result } = renderHook(() => useLocalStorage('null-key', 'initial'))
      
      act(() => {
        result.current[1](null)
      })
      
      expect(result.current[0]).toBe(null)
      expect(localStorage.getItem('null-key')).toBe('null')
    })
  })

  describe('Data Corruption Scenarios', () => {
    it('should handle corrupted JSON in localStorage', () => {
      // Store invalid JSON
      localStorage.setItem('corrupted-key', 'invalid-json{broken')
      
      const { result } = renderHook(() => useLocalStorage('corrupted-key', 'fallback'))
      
      expect(result.current[0]).toBe('fallback')
      expect(console.error).toHaveBeenCalledWith(
        'Error reading localStorage key "corrupted-key":',
        expect.any(Error)
      )
    })

    it('should handle localStorage getItem throwing an error', () => {
      // Mock localStorage.getItem to throw an error
      const originalGetItem = Storage.prototype.getItem
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error('localStorage access denied')
      })
      
      const { result } = renderHook(() => useLocalStorage('error-key', 'fallback'))
      
      expect(result.current[0]).toBe('fallback')
      expect(console.error).toHaveBeenCalledWith(
        'Error reading localStorage key "error-key":',
        expect.any(Error)
      )
      
      // Restore original method
      Storage.prototype.getItem = originalGetItem
    })

    it('should handle localStorage setItem throwing an error', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
      
      // Mock localStorage.setItem to throw an error
      const originalSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('localStorage quota exceeded')
      })
      
      act(() => {
        result.current[1]('new-value')
      })
      
      // State should still update locally even if localStorage fails
      expect(result.current[0]).toBe('new-value')
      expect(console.error).toHaveBeenCalledWith(
        'Error setting localStorage key "test-key":',
        expect.any(Error)
      )
      
      // Restore original method
      Storage.prototype.setItem = originalSetItem
    })

    it('should handle circular reference objects gracefully', () => {
      const { result } = renderHook(() => useLocalStorage('circular-key', {}))
      
      // Create circular reference
      const circularObj = { name: 'test' }
      circularObj.self = circularObj
      
      act(() => {
        result.current[1](circularObj)
      })
      
      // Should still update local state but fail localStorage silently
      expect(result.current[0]).toBe(circularObj)
      expect(console.error).toHaveBeenCalledWith(
        'Error setting localStorage key "circular-key":',
        expect.any(Error)
      )
    })
  })

  describe('Valuation Framework Specific Scenarios', () => {
    const validCompanyData = {
      company1: {
        name: 'Test Company',
        postMoneyVal: 20,
        roundSize: 5,
        investorPortion: 3,
        otherPortion: 2,
        investorName: 'US',
        showAdvanced: true,
        proRataPercent: 15,
        safes: [
          { id: 1, amount: 1, cap: 15, discount: 0 }
        ],
        preRoundFounderOwnership: 70,
        currentEsopPercent: 10,
        targetEsopPercent: 15,
        esopTiming: 'pre-close'
      }
    }

    it('should handle complete valuation framework data structure', () => {
      const { result } = renderHook(() => 
        useLocalStorage('valuationFramework', {})
      )
      
      act(() => {
        result.current[1](validCompanyData)
      })
      
      expect(result.current[0]).toEqual(validCompanyData)
      
      // Verify it persists across hook instances
      const { result: result2 } = renderHook(() => 
        useLocalStorage('valuationFramework', {})
      )
      
      expect(result2.current[0]).toEqual(validCompanyData)
    })

    it('should handle malformed company data gracefully', () => {
      // Store malformed data that looks like valid JSON but has wrong structure
      const malformedData = {
        company1: {
          // Missing required fields
          name: 'Test',
          postMoneyVal: 'invalid-number',
          safes: 'not-an-array'
        }
      }
      
      localStorage.setItem('valuationFramework', JSON.stringify(malformedData))
      
      const { result } = renderHook(() => 
        useLocalStorage('valuationFramework', { company1: { name: 'Default' } })
      )
      
      // Should load the malformed data (useLocalStorage doesn't validate structure)
      expect(result.current[0]).toEqual(malformedData)
    })

    it('should handle extremely large datasets', () => {
      const { result } = renderHook(() => useLocalStorage('large-data', {}))
      
      // Create a large dataset with many companies
      const largeDataset = {}
      for (let i = 1; i <= 100; i++) {
        largeDataset[`company${i}`] = {
          ...validCompanyData.company1,
          name: `Company ${i}`,
          safes: Array(50).fill(0).map((_, idx) => ({
            id: idx + 1,
            amount: Math.random() * 10,
            cap: Math.random() * 100,
            discount: Math.random() * 50
          }))
        }
      }
      
      act(() => {
        result.current[1](largeDataset)
      })
      
      expect(result.current[0]).toEqual(largeDataset)
      expect(Object.keys(result.current[0])).toHaveLength(100)
    })

    it('should handle data migration scenarios', () => {
      // Simulate old data format
      const oldFormatData = {
        company1: {
          name: 'Legacy Company',
          postMoney: 10, // Old field name
          round: 2 // Old field name
          // Missing new fields
        }
      }
      
      localStorage.setItem('valuationFramework', JSON.stringify(oldFormatData))
      
      const { result } = renderHook(() => 
        useLocalStorage('valuationFramework', {})
      )
      
      // Should load the old format (migration would happen at app level)
      expect(result.current[0]).toEqual(oldFormatData)
    })
  })

  describe('Edge Cases and Browser Compatibility', () => {
    it('should handle localStorage being disabled', () => {
      // Mock localStorage to be undefined
      const originalLocalStorage = global.localStorage
      delete global.localStorage
      
      const { result } = renderHook(() => useLocalStorage('disabled-key', 'fallback'))
      
      expect(result.current[0]).toBe('fallback')
      
      // Restore localStorage
      global.localStorage = originalLocalStorage
    })

    it('should handle private browsing mode limitations', () => {
      // Mock localStorage.setItem to throw the typical private browsing error
      const originalSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = vi.fn(() => {
        throw new DOMException('QuotaExceededError')
      })
      
      const { result } = renderHook(() => useLocalStorage('private-key', 'initial'))
      
      act(() => {
        result.current[1]('new-value')
      })
      
      // Local state should update even if storage fails
      expect(result.current[0]).toBe('new-value')
      expect(console.error).toHaveBeenCalled()
      
      // Restore original method
      Storage.prototype.setItem = originalSetItem
    })

    it('should handle concurrent updates to the same key', () => {
      const { result: hook1 } = renderHook(() => useLocalStorage('shared-key', 0))
      const { result: hook2 } = renderHook(() => useLocalStorage('shared-key', 0))
      
      // Both hooks should start with the same value
      expect(hook1.current[0]).toBe(0)
      expect(hook2.current[0]).toBe(0)
      
      // Update from first hook
      act(() => {
        hook1.current[1](10)
      })
      
      expect(hook1.current[0]).toBe(10)
      // Note: hook2 won't automatically sync - this is expected behavior
      // Real apps would use storage events for cross-tab sync
    })

    it('should handle unicode and special characters in data', () => {
      const unicodeData = {
        name: '测试公司 🚀',
        emoji: '💰📈🎯',
        special: 'Special chars: "quotes", \'apostrophes\', \\backslashes\\, \n newlines \t tabs'
      }
      
      const { result } = renderHook(() => useLocalStorage('unicode-key', {}))
      
      act(() => {
        result.current[1](unicodeData)
      })
      
      expect(result.current[0]).toEqual(unicodeData)
      expect(JSON.parse(localStorage.getItem('unicode-key'))).toEqual(unicodeData)
    })
  })
})