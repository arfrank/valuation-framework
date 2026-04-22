import { describe, it, expect } from 'vitest'
import { buildScenarioOffsets, formatScenarioOffsetValue, normalizeScenarioOffsets } from './scenarioOffsets'

describe('scenarioOffsets', () => {
  it('builds a 3-down / 3-up band from a max delta', () => {
    expect(buildScenarioOffsets(10)).toEqual([-10, -5, -2.5, 2.5, 5, 10])
    expect(buildScenarioOffsets(20)).toEqual([-20, -10, -5, 5, 10, 20])
  })

  it('normalizes legacy offset arrays to a symmetric band using the max absolute delta', () => {
    expect(normalizeScenarioOffsets([-30, -20, -10, 10, 20, 30])).toEqual([-30, -15, -7.5, 7.5, 15, 30])
    expect(normalizeScenarioOffsets([-10, 10])).toEqual([-10, -5, -2.5, 2.5, 5, 10])
  })

  it('formats decimal offsets without trailing noise', () => {
    expect(formatScenarioOffsetValue(10)).toBe('10')
    expect(formatScenarioOffsetValue(2.5)).toBe('2.5')
    expect(formatScenarioOffsetValue(6.25)).toBe('6.25')
  })
})
