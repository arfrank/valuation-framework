import { describe, it, expect } from 'vitest'
import { nextUniqueName } from './dataStructures'

describe('nextUniqueName', () => {
  it('appends " 2" to a fresh name', () => {
    const companies = { a: { name: 'Startup Alpha' } }
    expect(nextUniqueName('Startup Alpha', companies)).toBe('Startup Alpha 2')
  })

  it('increments an existing trailing digit', () => {
    const companies = { a: { name: 'Startup Alpha 2' } }
    expect(nextUniqueName('Startup Alpha 2', companies)).toBe('Startup Alpha 3')
  })

  it('skips over existing collisions', () => {
    const companies = {
      a: { name: 'Startup Alpha' },
      b: { name: 'Startup Alpha 2' },
      c: { name: 'Startup Alpha 3' },
    }
    expect(nextUniqueName('Startup Alpha', companies)).toBe('Startup Alpha 4')
  })

  it('handles empty/missing baseName gracefully', () => {
    expect(nextUniqueName('', {})).toBe('Company 2')
    expect(nextUniqueName(undefined, {})).toBe('Company 2')
  })

  it('preserves multi-word stems when incrementing', () => {
    const companies = { a: { name: 'Acme Corp 5' } }
    expect(nextUniqueName('Acme Corp 5', companies)).toBe('Acme Corp 6')
  })

  it('handles single-word names', () => {
    expect(nextUniqueName('Acme', { a: { name: 'Acme' } })).toBe('Acme 2')
  })
})
