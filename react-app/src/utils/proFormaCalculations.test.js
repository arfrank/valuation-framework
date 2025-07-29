import { describe, it, expect } from 'vitest'
import { calculateProForma, generateProFormaScenarios, exportProFormaToCSV } from './proFormaCalculations'

describe('Pro-Forma Calculations', () => {
  const basicInputs = {
    postMoneyVal: 13,
    roundSize: 3,
    newInvestorAmount: 2.5,
    newInvestorName: 'Lead VC',
    existingInvestors: [],
    founders: [],
    esopPoolPreClose: 0,
    esopPoolInRound: 0,
    safes: [],
    proRataPercent: 0,
    preRoundFounderOwnership: 0
  }

  describe('calculateProForma', () => {
    it('should calculate basic pro-forma with new investor only', () => {
      const result = calculateProForma(basicInputs)
      
      expect(result).toBeTruthy()
      expect(result.isValid).toBe(true)
      expect(result.preMoneyVal).toBe(10)
      expect(result.postMoneyVal).toBe(13)
      expect(result.roundSize).toBe(3)
      expect(result.newInvestor.name).toBe('Lead VC')
      expect(result.newInvestor.investment).toBe(2.5)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle invalid inputs', () => {
      const invalidInputs = {
        ...basicInputs,
        postMoneyVal: 5, // Less than round size
        roundSize: 10
      }
      
      const result = calculateProForma(invalidInputs)
      expect(result).toBeNull()
    })

    it('should calculate with existing investors', () => {
      const inputsWithExisting = {
        ...basicInputs,
        existingInvestors: [
          {
            id: 1,
            name: 'Seed VC',
            ownershipPercent: 20,
            hasProRata: true,
            proRataCommitment: 0.3
          }
        ]
      }
      
      const result = calculateProForma(inputsWithExisting)
      
      expect(result).toBeTruthy()
      expect(result.isValid).toBe(true)
      expect(result.existingInvestorsDetail).toHaveLength(1)
      expect(result.existingInvestorsDetail[0].name).toBe('Seed VC')
      expect(result.existingInvestorsDetail[0].preRoundPercent).toBe(20)
      expect(result.existingInvestorsDetail[0].proRataInvestment).toBe(0.3)
    })

    it('should calculate with multiple founders', () => {
      const inputsWithFounders = {
        ...basicInputs,
        preRoundFounderOwnership: 80,
        founders: [
          { id: 1, name: 'CEO', ownershipPercent: 50 },
          { id: 2, name: 'CTO', ownershipPercent: 30 }
        ]
      }
      
      const result = calculateProForma(inputsWithFounders)
      
      expect(result).toBeTruthy()
      expect(result.isValid).toBe(true)
      expect(result.foundersDetail).toHaveLength(2)
      expect(result.foundersDetail[0].name).toBe('CEO')
      expect(result.foundersDetail[1].name).toBe('CTO')
      expect(result.totalFounderOwnership).toBeGreaterThan(0)
    })

    it('should calculate with ESOP pool', () => {
      const inputsWithEsop = {
        ...basicInputs,
        esopPoolPreClose: 10,
        esopPoolInRound: 0.2
      }
      
      const result = calculateProForma(inputsWithEsop)
      
      expect(result).toBeTruthy()
      expect(result.isValid).toBe(true)
      expect(result.esopDetail.preCloseShares).toBeGreaterThan(0)
      expect(result.esopDetail.inRoundShares).toBeGreaterThan(0)
      expect(result.totalEsopOwnership).toBeGreaterThan(0)
    })

    it('should calculate with SAFE notes', () => {
      const inputsWithSafes = {
        ...basicInputs,
        safes: [
          { id: 1, amount: 0.5, cap: 8, discount: 0 },
          { id: 2, amount: 0.3, cap: 0, discount: 20 }
        ]
      }
      
      const result = calculateProForma(inputsWithSafes)
      
      expect(result).toBeTruthy()
      expect(result.isValid).toBe(true)
      expect(result.safesDetail).toHaveLength(2)
      expect(result.totalSafeOwnership).toBeGreaterThan(0)
    })

    it('should validate total ownership sums to 100%', () => {
      const complexInputs = {
        postMoneyVal: 20,
        roundSize: 5,
        newInvestorAmount: 3,
        newInvestorName: 'Series A',
        existingInvestors: [
          {
            id: 1,
            name: 'Seed Investor',
            ownershipPercent: 15,
            hasProRata: true,
            proRataCommitment: 0.5
          }
        ],
        founders: [
          { id: 1, name: 'Founder 1', ownershipPercent: 60 },
          { id: 2, name: 'Founder 2', ownershipPercent: 20 }
        ],
        preRoundFounderOwnership: 80,
        esopPoolPreClose: 5,
        esopPoolInRound: 0.3,
        safes: [
          { id: 1, amount: 1, cap: 12, discount: 0 }
        ]
      }
      
      const result = calculateProForma(complexInputs)
      
      expect(result).toBeTruthy()
      expect(result.totalOwnership).toBeCloseTo(100, 1)
    })

    it('should detect over-commitment issues', () => {
      const overCommittedInputs = {
        ...basicInputs,
        roundSize: 2,
        newInvestorAmount: 1,
        existingInvestors: [
          {
            id: 1,
            name: 'Over Investor',
            ownershipPercent: 10,
            hasProRata: true,
            proRataCommitment: 5 // More than round size
          }
        ]
      }
      
      const result = calculateProForma(overCommittedInputs)
      
      expect(result).toBeTruthy()
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('generateProFormaScenarios', () => {
    it('should generate multiple scenarios', () => {
      const scenarios = generateProFormaScenarios(basicInputs)
      
      expect(scenarios).toBeInstanceOf(Array)
      expect(scenarios.length).toBeGreaterThan(0)
      expect(scenarios[0].title).toBe('Base Pro-Forma')
    })

    it('should generate ESOP scenario when no ESOP present', () => {
      const scenarios = generateProFormaScenarios(basicInputs)
      
      const esopScenario = scenarios.find(s => s.title.includes('ESOP'))
      expect(esopScenario).toBeTruthy()
    })

    it('should generate pro-rata scenario when existing investors present', () => {
      const inputsWithInvestors = {
        ...basicInputs,
        existingInvestors: [
          {
            id: 1,
            name: 'Test Investor',
            ownershipPercent: 10,
            hasProRata: true,
            proRataCommitment: 0.1
          }
        ]
      }
      
      const scenarios = generateProFormaScenarios(inputsWithInvestors)
      
      const proRataScenario = scenarios.find(s => s.title.includes('Pro-Rata'))
      expect(proRataScenario).toBeTruthy()
    })
  })

  describe('exportProFormaToCSV', () => {
    it('should export valid CSV format', () => {
      const result = calculateProForma({
        ...basicInputs,
        founders: [{ id: 1, name: 'CEO', ownershipPercent: 100 }],
        preRoundFounderOwnership: 70
      })
      
      const csv = exportProFormaToCSV(result)
      
      expect(csv).toContain('Stakeholder,Type,Pre-Round Shares')
      expect(csv).toContain('CEO,Founder')
      expect(csv).toContain('Lead VC,New Investor')
      
      // Should be valid CSV (no unescaped commas in data)
      const lines = csv.split('\n')
      const headerCount = lines[0].split(',').length
      lines.slice(1).forEach(line => {
        if (line.trim()) {
          expect(line.split(',').length).toBe(headerCount)
        }
      })
    })

    it('should handle complex scenarios in CSV export', () => {
      const complexResult = calculateProForma({
        postMoneyVal: 15,
        roundSize: 4,
        newInvestorAmount: 2.5,
        newInvestorName: 'Growth Fund',
        existingInvestors: [
          {
            id: 1,
            name: 'Seed Fund',
            ownershipPercent: 20,
            hasProRata: true,
            proRataCommitment: 0.5
          }
        ],
        founders: [
          { id: 1, name: 'CEO & Founder', ownershipPercent: 50 }
        ],
        preRoundFounderOwnership: 60,
        esopPoolPreClose: 10,
        esopPoolInRound: 0.3,
        safes: [
          { id: 1, amount: 0.7, cap: 10, discount: 20 }
        ]
      })
      
      const csv = exportProFormaToCSV(complexResult)
      
      expect(csv).toContain('CEO & Founder,Founder')
      expect(csv).toContain('Seed Fund,Existing Investor')
      expect(csv).toContain('Growth Fund,New Investor')
      expect(csv).toContain('ESOP Pool,ESOP')
      expect(csv).toContain('SAFE #1,SAFE')
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero round size gracefully', () => {
      const zeroRoundInputs = {
        ...basicInputs,
        roundSize: 0
      }
      
      const result = calculateProForma(zeroRoundInputs)
      expect(result).toBeNull()
    })

    it('should handle negative values gracefully', () => {
      const negativeInputs = {
        ...basicInputs,
        postMoneyVal: -5
      }
      
      const result = calculateProForma(negativeInputs)
      expect(result).toBeNull()
    })

    it('should handle empty arrays', () => {
      const emptyArraysInputs = {
        ...basicInputs,
        existingInvestors: [],
        founders: [],
        safes: []
      }
      
      const result = calculateProForma(emptyArraysInputs)
      
      expect(result).toBeTruthy()
      expect(result.isValid).toBe(true)
      expect(result.existingInvestorsDetail).toHaveLength(0)
      expect(result.foundersDetail).toHaveLength(0)
      expect(result.safesDetail).toHaveLength(0)
    })

    it('should handle very large numbers', () => {
      const largeNumberInputs = {
        ...basicInputs,
        postMoneyVal: 1000000,
        roundSize: 200000,
        newInvestorAmount: 150000
      }
      
      const result = calculateProForma(largeNumberInputs)
      
      expect(result).toBeTruthy()
      expect(result.isValid).toBe(true)
      expect(result.newInvestor.investment).toBe(150000)
    })
  })
})