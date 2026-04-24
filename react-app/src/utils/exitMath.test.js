import { describe, it, expect } from 'vitest'
import { calculateExitReturn, calculateExitReturnsForValues, resolveDilutions } from './exitMath'

describe('resolveDilutions', () => {
  it('produces uniform decimals when no overrides', () => {
    expect(resolveDilutions(3, 20, [])).toEqual([0.2, 0.2, 0.2])
  })

  it('applies per-round overrides where present', () => {
    expect(resolveDilutions(3, 20, [null, 30, null])).toEqual([0.2, 0.3, 0.2])
  })

  it('treats empty string as no override', () => {
    expect(resolveDilutions(2, 15, ['', 25])).toEqual([0.15, 0.25])
  })

  it('clamps out-of-range values', () => {
    expect(resolveDilutions(2, 150, [-5, null])).toEqual([0, 1])
  })

  it('returns empty array when numRounds <= 0', () => {
    expect(resolveDilutions(0, 20, [])).toEqual([])
    expect(resolveDilutions(-2, 20, [])).toEqual([])
  })
})

describe('calculateExitReturn', () => {
  it('3 rounds of 20% dilution on a $5B exit', () => {
    const result = calculateExitReturn({
      initialCheck: 2.75, // $2.75M
      currentOwnership: 21.15, // 21.15%
      dilutions: [0.2, 0.2, 0.2],
      exitValuation: 5000, // $5B in $M
    })
    // 21.15 * 0.8^3 = 21.15 * 0.512 = 10.8288
    expect(result.finalOwnership).toBeCloseTo(10.8288, 4)
    // exitProceeds = 10.8288% * $5000M = $541.44M
    expect(result.exitProceeds).toBeCloseTo(541.44, 2)
    // moic = 541.44 / 2.75 ≈ 196.88x
    expect(result.moic).toBeCloseTo(196.8873, 3)
    expect(result.perRound).toHaveLength(3)
    expect(result.perRound[2].ownership).toBeCloseTo(10.8288, 4)
  })

  it('zero dilution preserves ownership', () => {
    const result = calculateExitReturn({
      initialCheck: 1,
      currentOwnership: 10,
      dilutions: [0, 0],
      exitValuation: 1000,
    })
    expect(result.finalOwnership).toBe(10)
    expect(result.exitProceeds).toBe(100)
    expect(result.moic).toBe(100)
  })

  it('uneven dilutions chain correctly', () => {
    const result = calculateExitReturn({
      initialCheck: 5,
      currentOwnership: 20,
      dilutions: [0.1, 0.25, 0.5],
      exitValuation: 2000,
    })
    // 20 * 0.9 * 0.75 * 0.5 = 6.75
    expect(result.finalOwnership).toBeCloseTo(6.75, 4)
    // exitProceeds = 6.75% * 2000 = 135
    expect(result.exitProceeds).toBeCloseTo(135, 4)
    // moic = 135 / 5 = 27
    expect(result.moic).toBeCloseTo(27, 4)
  })

  it('zero initial check returns MOIC = 0 without divide-by-zero', () => {
    const result = calculateExitReturn({
      initialCheck: 0,
      currentOwnership: 10,
      dilutions: [0.2],
      exitValuation: 1000,
    })
    expect(result.moic).toBe(0)
    expect(Number.isFinite(result.moic)).toBe(true)
  })

  it('empty dilutions means no rounds applied', () => {
    const result = calculateExitReturn({
      initialCheck: 2,
      currentOwnership: 15,
      dilutions: [],
      exitValuation: 1000,
    })
    expect(result.finalOwnership).toBe(15)
    expect(result.exitProceeds).toBe(150)
    expect(result.moic).toBe(75)
    expect(result.perRound).toEqual([])
  })
})

describe('calculateExitReturnsForValues', () => {
  it('returns one outcome per exit value sharing the same finalOwnership', () => {
    const result = calculateExitReturnsForValues({
      initialCheck: 2.75,
      currentOwnership: 21.15,
      dilutions: [0.2, 0.2, 0.2],
      exitValuations: [100, 500, 1000, 2000, 5000],
    })
    expect(result.finalOwnership).toBeCloseTo(10.8288, 4)
    expect(result.perRound).toHaveLength(3)
    expect(result.outcomes).toHaveLength(5)
    expect(result.outcomes[0]).toMatchObject({ exitValuation: 100 })
    expect(result.outcomes[0].exitProceeds).toBeCloseTo(10.8288, 4)
    expect(result.outcomes[4].exitProceeds).toBeCloseTo(541.44, 2)
    expect(result.outcomes[4].moic).toBeCloseTo(196.8873, 3)
  })

  it('MOIC and proceeds scale linearly with exit value', () => {
    const result = calculateExitReturnsForValues({
      initialCheck: 1,
      currentOwnership: 10,
      dilutions: [0],
      exitValuations: [100, 1000],
    })
    expect(result.outcomes[1].exitProceeds / result.outcomes[0].exitProceeds).toBeCloseTo(10, 6)
    expect(result.outcomes[1].moic / result.outcomes[0].moic).toBeCloseTo(10, 6)
  })

  it('empty exitValuations returns empty outcomes but still computes finalOwnership', () => {
    const result = calculateExitReturnsForValues({
      initialCheck: 5,
      currentOwnership: 20,
      dilutions: [0.5],
      exitValuations: [],
    })
    expect(result.outcomes).toEqual([])
    expect(result.finalOwnership).toBeCloseTo(10, 6)
    expect(result.perRound).toHaveLength(1)
  })

  it('zero initial check returns MOIC = 0 for all outcomes', () => {
    const result = calculateExitReturnsForValues({
      initialCheck: 0,
      currentOwnership: 10,
      dilutions: [],
      exitValuations: [100, 1000],
    })
    expect(result.outcomes.every((o) => o.moic === 0)).toBe(true)
    expect(result.outcomes.every((o) => Number.isFinite(o.moic))).toBe(true)
  })
})
