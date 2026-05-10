import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import FoundersSection from './FoundersSection'

describe('FoundersSection microinteractions', () => {
  const founders = [
    { id: 'f1', name: 'Founder One', ownershipPercent: 60 },
    { id: 'f2', name: 'Founder Two', ownershipPercent: 25 },
  ]

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('collapses a removed row and offers undo', () => {
    const onUpdate = vi.fn()
    render(<FoundersSection founders={founders} onUpdate={onUpdate} />)

    fireEvent.click(screen.getAllByTitle('Remove founder')[0])

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(onUpdate).toHaveBeenCalledWith([founders[1]])
    expect(screen.getByText('Founder removed')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /undo/i }))

    expect(onUpdate).toHaveBeenLastCalledWith(founders)
  })
})
