import { describe, it, expect } from 'vitest'
import { parseImportJson } from './importCompany'

describe('parseImportJson', () => {
  it('rejects empty input', () => {
    expect(parseImportJson('').ok).toBe(false)
    expect(parseImportJson('   ').ok).toBe(false)
  })

  it('rejects malformed JSON', () => {
    const r = parseImportJson('{ not json')
    expect(r.ok).toBe(false)
    expect(r.errors[0]).toMatch(/Invalid JSON/)
  })

  it('rejects non-object root', () => {
    expect(parseImportJson('[]').ok).toBe(false)
    expect(parseImportJson('"a string"').ok).toBe(false)
    expect(parseImportJson('42').ok).toBe(false)
  })

  it('accepts a minimal payload (just name)', () => {
    const r = parseImportJson(JSON.stringify({ name: 'Acme' }))
    expect(r.ok).toBe(true)
    expect(r.importKind).toBe('company')
    expect(r.company.name).toBe('Acme')
    // Defaults applied via migrateLegacyCompany
    expect(r.company.postMoneyVal).toBe(13)
    expect(r.company.roundSize).toBe(3)
    expect(Array.isArray(r.company.founders)).toBe(true)
    expect(Array.isArray(r.company.priorInvestors)).toBe(true)
    expect(Array.isArray(r.company.safes)).toBe(true)
    expect(Array.isArray(r.company.warrants)).toBe(true)
  })

  it('rejects empty name', () => {
    const r = parseImportJson(JSON.stringify({ name: '   ' }))
    expect(r.ok).toBe(false)
    expect(r.errors[0]).toMatch(/name/)
  })

  it('accepts a full valid payload and assigns IDs', () => {
    const payload = {
      name: 'Acme',
      postMoneyVal: 80,
      roundSize: 20,
      investorPortion: 14,
      otherPortion: 6,
      investorName: 'LSVP',
      showAdvanced: true,
      founders: [
        { name: 'CEO', ownershipPercent: 28 },
        { name: 'CTO', ownershipPercent: 22 }
      ],
      priorInvestors: [
        { name: 'Seed Lead', ownershipPercent: 18, hasProRataRights: true },
        { name: 'Angel', ownershipPercent: 4, hasProRataRights: false }
      ],
      safes: [
        { investorName: 'Bridge', amount: 2, cap: 40, discount: 20, proRata: true },
        { investorName: 'Accelerator', amount: 0.5, cap: 25, discount: 0, proRata: false }
      ],
      warrants: [
        { name: 'SVB', amount: 1, valuation: 50 }
      ],
      currentEsopPercent: 8,
      grantedEsopPercent: 5,
      esopTiming: 'pre-close'
    }
    const r = parseImportJson(JSON.stringify(payload))
    expect(r.ok).toBe(true)
    expect(r.importKind).toBe('company')
    expect(r.company.founders).toHaveLength(2)
    expect(r.company.founders.every(f => f.id !== undefined)).toBe(true)
    expect(r.company.priorInvestors).toHaveLength(2)
    expect(r.company.priorInvestors[0].hasProRataRights).toBe(true)
    expect(r.company.priorInvestors[0].proRataOverride).toBeNull()
    expect(r.company.safes).toHaveLength(2)
    expect(r.safes).toHaveLength(2)
    expect(r.company.safes[0].proRata).toBe(true)
    expect(r.company.warrants).toHaveLength(1)
    expect(r.company.warrants[0].amount).toBe(1)
    expect(r.company.currentEsopPercent).toBe(8)
    expect(r.company.grantedEsopPercent).toBe(5)
  })

  it('classifies SAFE-only payloads separately', () => {
    const r = parseImportJson(JSON.stringify({
      safes: [
        { investorName: 'Bridge', amount: 1.5, cap: 30, discount: 0, proRata: false }
      ]
    }))
    expect(r.ok).toBe(true)
    expect(r.importKind).toBe('safe-only')
    expect(r.safes).toHaveLength(1)
    expect(r.company.name).toBe('Imported Scenario')
    expect(r.company.safes[0].investorName).toBe('Bridge')
  })

  it('keeps SAFE payloads as company imports when cap-table fields are present', () => {
    const r = parseImportJson(JSON.stringify({
      name: 'Acme',
      founders: [{ name: 'CEO', ownershipPercent: 70 }],
      safes: [{ investorName: 'Bridge', amount: 1, cap: 25 }]
    }))
    expect(r.ok).toBe(true)
    expect(r.importKind).toBe('company')
  })

  it('rejects ownership > 100', () => {
    const r = parseImportJson(JSON.stringify({
      name: 'X',
      founders: [{ name: 'Bad', ownershipPercent: 150 }]
    }))
    expect(r.ok).toBe(false)
    expect(r.errors.some(e => /ownershipPercent/.test(e))).toBe(true)
  })

  it('rejects negative ownership', () => {
    const r = parseImportJson(JSON.stringify({
      name: 'X',
      priorInvestors: [{ name: 'Bad', ownershipPercent: -5 }]
    }))
    expect(r.ok).toBe(false)
  })

  it('rejects discount > 100', () => {
    const r = parseImportJson(JSON.stringify({
      name: 'X',
      safes: [{ amount: 1, discount: 150 }]
    }))
    expect(r.ok).toBe(false)
  })

  it('rejects non-numeric strings like "TBD"', () => {
    const r = parseImportJson(JSON.stringify({
      name: 'X',
      postMoneyVal: 'TBD'
    }))
    expect(r.ok).toBe(false)
    expect(r.errors.some(e => /postMoneyVal/.test(e))).toBe(true)
  })

  it('rejects non-array founders/priorInvestors/safes', () => {
    expect(parseImportJson(JSON.stringify({ name: 'X', founders: {} })).ok).toBe(false)
    expect(parseImportJson(JSON.stringify({ name: 'X', priorInvestors: 'oops' })).ok).toBe(false)
    expect(parseImportJson(JSON.stringify({ name: 'X', safes: 42 })).ok).toBe(false)
  })

  it('migrates legacy field names (postMoney, round, investor, other)', () => {
    const r = parseImportJson(JSON.stringify({
      name: 'Legacy',
      postMoney: 50,
      round: 10,
      investor: 7,
      other: 3
    }))
    expect(r.ok).toBe(true)
    expect(r.company.postMoneyVal).toBe(50)
    expect(r.company.roundSize).toBe(10)
    expect(r.company.investorPortion).toBe(7)
    expect(r.company.otherPortion).toBe(3)
  })

  it('warns when founders + priors exceed 100% but does not block', () => {
    const r = parseImportJson(JSON.stringify({
      name: 'Over',
      founders: [{ name: 'A', ownershipPercent: 70 }],
      priorInvestors: [{ name: 'B', ownershipPercent: 50 }]
    }))
    expect(r.ok).toBe(true)
    expect(r.warnings.some(w => /over 100/i.test(w))).toBe(true)
    expect(r.warnings.some(w => /won't compute/i.test(w))).toBe(true)
  })

  it('warns when cap table looks incomplete (founders + priors + ESOP < 80%)', () => {
    const r = parseImportJson(JSON.stringify({
      name: 'Sparse',
      founders: [{ name: 'A', ownershipPercent: 30 }],
      priorInvestors: [{ name: 'B', ownershipPercent: 10 }]
    }))
    expect(r.ok).toBe(true)
    expect(r.warnings.some(w => /under 100|incomplete/i.test(w))).toBe(true)
  })

  it('warns when pro-rata SAFE has no cap and no discount', () => {
    const r = parseImportJson(JSON.stringify({
      name: 'X',
      safes: [{ investorName: 'Sus', amount: 1, cap: 0, discount: 0, proRata: true }]
    }))
    expect(r.ok).toBe(true)
    expect(r.warnings.some(w => /no cap and no discount/i.test(w))).toBe(true)
  })

  it('warns when SAFE amount is 0', () => {
    const r = parseImportJson(JSON.stringify({
      name: 'X',
      safes: [{ investorName: 'Zero', amount: 0, cap: 20 }]
    }))
    expect(r.ok).toBe(true)
    expect(r.warnings.some(w => /amount is 0/i.test(w))).toBe(true)
  })

  it('accepts SAFE with neither cap nor discount (uncapped, no discount)', () => {
    const r = parseImportJson(JSON.stringify({
      name: 'X',
      safes: [{ investorName: 'Free', amount: 1 }]
    }))
    expect(r.ok).toBe(true)
    expect(r.company.safes).toHaveLength(1)
    expect(r.company.safes[0].cap ?? 0).toBe(0)
    expect(r.company.safes[0].discount ?? 0).toBe(0)
  })

  it('strips _warning, _notes, _safeType but surfaces them as warnings', () => {
    const r = parseImportJson(JSON.stringify({
      name: 'X',
      _warning: 'Some employee grants were unclear',
      safes: [
        {
          investorName: 'Old SAFE',
          amount: 1,
          cap: 10,
          _safeType: 'pre-money',
          _notes: 'MFN clause active'
        }
      ]
    }))
    expect(r.ok).toBe(true)
    expect(r.warnings.some(w => /unclear/.test(w))).toBe(true)
    expect(r.warnings.some(w => /MFN clause/.test(w))).toBe(true)
    expect(r.warnings.some(w => /pre-money/i.test(w))).toBe(true)
    // Should not be persisted on the safe itself
    expect(r.company.safes[0]._safeType).toBeUndefined()
    expect(r.company.safes[0]._notes).toBeUndefined()
  })

  it('replaces imported row ids so React keys stay unique', () => {
    const r = parseImportJson(JSON.stringify({
      name: 'X',
      founders: [
        { id: 'duplicate', name: 'Founder A', ownershipPercent: 45 },
        { id: 'duplicate', name: 'Founder B', ownershipPercent: 35 }
      ],
      priorInvestors: [
        { id: 'duplicate', name: 'Seed', ownershipPercent: 20 }
      ],
      safes: [
        { id: 'duplicate', investorName: 'A', amount: 1, cap: 20 },
        { id: 'duplicate', investorName: 'B', amount: 0.5, cap: 15 }
      ],
      warrants: [
        { id: 'duplicate', name: 'Lender', amount: 0.2, valuation: 20 }
      ]
    }))
    expect(r.ok).toBe(true)
    const ids = [
      ...r.company.founders,
      ...r.company.priorInvestors,
      ...r.company.safes,
      ...r.company.warrants
    ].map(row => row.id)
    expect(ids.every(id => id && id !== 'duplicate')).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('preserves duplicate investor names verbatim for the rollup engine', () => {
    // The calc engine's rollup logic matches on case-insensitive trimmed names.
    // Import should leave names alone so the engine can do its thing.
    const r = parseImportJson(JSON.stringify({
      name: 'X',
      priorInvestors: [{ name: 'Sequoia', ownershipPercent: 10, hasProRataRights: true }],
      safes: [{ investorName: 'Sequoia', amount: 2, cap: 40 }]
    }))
    expect(r.ok).toBe(true)
    expect(r.company.priorInvestors[0].name).toBe('Sequoia')
    expect(r.company.safes[0].investorName).toBe('Sequoia')
  })
})
