import { describe, it, expect } from 'vitest'
import {
  createDefaultCompany,
  migrateLegacyCompany,
  normalizeStoredCompanies
} from './dataStructures'

describe('migrateLegacyCompany', () => {
  it('returns an already-current company unchanged, and is idempotent', () => {
    const company = createDefaultCompany('Acme')
    const once = migrateLegacyCompany(company)
    expect(once).toEqual(company)
    expect(migrateLegacyCompany(once)).toEqual(once)
  })

  it('converts the legacy pro-rata and founder fields into rows', () => {
    const migrated = migrateLegacyCompany({
      name: 'Old',
      postMoneyVal: 20,
      roundSize: 4,
      investorPortion: 3,
      proRataPercent: 20,
      preRoundFounderOwnership: 70
    })

    expect(migrated.priorInvestors.map(({ name, ownershipPercent, hasProRataRights }) => (
      { name, ownershipPercent, hasProRataRights }
    ))).toEqual([
      { name: 'Previous Investors', ownershipPercent: 20, hasProRataRights: true },
      { name: 'Other Stakeholders', ownershipPercent: 10, hasProRataRights: false }
    ])
    expect(migrated.founders.map(({ name, ownershipPercent }) => ({ name, ownershipPercent }))).toEqual([
      { name: 'Founder Team', ownershipPercent: 70 }
    ])
  })

  it('maps a legacy proRataAmount on a prior investor to proRataOverride', () => {
    const migrated = migrateLegacyCompany({
      ...createDefaultCompany('Acme'),
      priorInvestors: [{ id: 1, name: 'Seed', ownershipPercent: 10, hasProRataRights: true, proRataAmount: 0.5 }]
    })
    expect(migrated.priorInvestors[0].proRataOverride).toBe(0.5)
    expect(migrated.priorInvestors[0]).not.toHaveProperty('proRataAmount')
  })

  it('clamps the firm portion to the round size', () => {
    const migrated = migrateLegacyCompany({
      ...createDefaultCompany('Acme'),
      roundSize: 3,
      investorPortion: 5
    })
    expect(migrated.investorPortion).toBe(3)
    expect(migrated.otherPortion).toBe(0)
  })

  it('derives Other from the round when the firm leads', () => {
    const migrated = migrateLegacyCompany({
      ...createDefaultCompany('Acme'),
      roundSize: 10,
      investorPortion: 6,
      firmLeadsRound: true,
      leadPortion: 2,
      leadInvestorName: 'Someone',
      otherPortion: 0.5
    })
    expect(migrated.leadPortion).toBe(0)
    expect(migrated.leadInvestorName).toBe('')
    expect(migrated.otherPortion).toBe(4)
  })

  it('clamps founder and prior-investor ownership to 0–100', () => {
    const migrated = migrateLegacyCompany({
      ...createDefaultCompany('Acme'),
      founders: [{ id: 1, name: 'F', ownershipPercent: 150 }],
      priorInvestors: [{ id: 2, name: 'P', ownershipPercent: -5 }]
    })
    expect(migrated.founders[0].ownershipPercent).toBe(100)
    expect(migrated.priorInvestors[0].ownershipPercent).toBe(0)
  })

  describe('names', () => {
    it('keeps names exactly as typed, including a trailing space', () => {
      const migrated = migrateLegacyCompany({
        ...createDefaultCompany('Acme'),
        investorName: 'Acme ',
        leadInvestorName: 'Big ',
        firmLeadsRound: false,
        founders: [{ id: 1, name: 'Jane ', ownershipPercent: 80 }],
        priorInvestors: [{ id: 2, name: 'Seed ', ownershipPercent: 20 }],
        warrants: [{ id: 3, name: 'Debt ', amount: 1, valuation: 10 }]
      })
      expect(migrated.investorName).toBe('Acme ')
      expect(migrated.leadInvestorName).toBe('Big ')
      expect(migrated.founders[0].name).toBe('Jane ')
      expect(migrated.priorInvestors[0].name).toBe('Seed ')
      expect(migrated.warrants[0].name).toBe('Debt ')
    })

    it('falls back to the default firm name when the name is blank', () => {
      expect(migrateLegacyCompany({ ...createDefaultCompany('Acme'), investorName: '   ' }).investorName).toBe('US')
      expect(migrateLegacyCompany({ ...createDefaultCompany('Acme'), investorName: 42 }).investorName).toBe('US')
    })
  })

  describe('untrusted values from links and imports', () => {
    it('reads the strings "false" and "true" as booleans', () => {
      const migrated = migrateLegacyCompany({
        ...createDefaultCompany('Acme'),
        showAdvanced: 'false',
        twoStepEnabled: 'true',
        showExitMath: 'false',
        priorInvestors: [{ id: 1, name: 'Seed', ownershipPercent: 10, hasProRataRights: 'false' }],
        safes: [{ id: 2, amount: 1, cap: 10, proRata: 'false' }]
      })
      expect(migrated.showAdvanced).toBe(false)
      expect(migrated.twoStepEnabled).toBe(true)
      expect(migrated.showExitMath).toBe(false)
      expect(migrated.priorInvestors[0].hasProRataRights).toBe(false)
      expect(migrated.safes[0].proRata).toBe(false)
    })

    it('coerces SAFE amount, cap and discount to numbers and the investor name to a string', () => {
      const migrated = migrateLegacyCompany({
        ...createDefaultCompany('Acme'),
        safes: [
          { id: 1, amount: '0.5', cap: '8', discount: '20', investorName: 42 },
          { id: 2, amount: 'abc', cap: -1, discount: 250, investorName: { nested: true } },
          { id: 3, amount: 2 }
        ]
      })
      expect(migrated.safes[0]).toMatchObject({ amount: 0.5, cap: 8, discount: 20, investorName: '42' })
      expect(migrated.safes[1]).toMatchObject({ amount: 0, cap: 0, discount: 100, investorName: '' })
      expect(migrated.safes[2]).toMatchObject({ amount: 2, cap: 0, discount: 0, investorName: '' })
    })

    it('bounds exit-math rounds and dilution', () => {
      const migrated = migrateLegacyCompany({
        ...createDefaultCompany('Acme'),
        exitMath: { exitValuations: [100], numRounds: 1e7, uniformDilution: 500 }
      })
      expect(migrated.exitMath.numRounds).toBe(10)
      expect(migrated.exitMath.uniformDilution).toBe(100)

      const garbage = migrateLegacyCompany({
        ...createDefaultCompany('Acme'),
        exitMath: { exitValuations: [100], numRounds: 'abc', uniformDilution: -1 }
      })
      expect(garbage.exitMath.numRounds).toBe(3)
      expect(garbage.exitMath.uniformDilution).toBe(0)
    })
  })
})

describe('normalizeStoredCompanies', () => {
  it('ignores a "__proto__" key instead of replacing the result prototype', () => {
    const stored = JSON.parse('{"company1": {"name": "A", "postMoneyVal": 20}, "__proto__": {"name": "Evil", "postMoneyVal": 1}}')
    const normalized = normalizeStoredCompanies(stored)
    expect(Object.keys(normalized)).toEqual(['company1'])
    expect(Object.getPrototypeOf(normalized)).toBe(Object.prototype)
  })

  it('wraps a single stored company in the companies map', () => {
    const normalized = normalizeStoredCompanies({ name: 'Solo', postMoneyVal: 25, roundSize: 5 })
    expect(Object.keys(normalized)).toEqual(['company1'])
    expect(normalized.company1.postMoneyVal).toBe(25)
  })

  it('falls back to one default company for unusable input', () => {
    for (const value of [null, undefined, 'x', 5, [], {}]) {
      const normalized = normalizeStoredCompanies(value)
      expect(Object.keys(normalized)).toEqual(['company1'])
      expect(normalized.company1.name).toBe('Scenario 1')
    }
  })
})
