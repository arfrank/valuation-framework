import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import Notification from './Notification'

describe('Notification', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render success notification with correct styling', () => {
    render(
      <Notification 
        message="Test success message" 
        type="success" 
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText('Test success message')).toBeInTheDocument()
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('should render info notification with correct styling', () => {
    render(
      <Notification 
        message="Test info message" 
        type="info" 
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText('Test info message')).toBeInTheDocument()
    expect(screen.getByText('ℹ')).toBeInTheDocument()
  })

  it('should render warning notification with correct styling', () => {
    render(
      <Notification 
        message="Test warning message" 
        type="warning" 
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText('Test warning message')).toBeInTheDocument()
    expect(screen.getByText('⚠')).toBeInTheDocument()
  })

  it('should render error notification with correct styling', () => {
    render(
      <Notification 
        message="Test error message" 
        type="error" 
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText('Test error message')).toBeInTheDocument()
    expect(screen.getByText('✕')).toBeInTheDocument()
  })

  it('should auto-dismiss after specified duration', () => {
    render(
      <Notification 
        message="Auto dismiss test" 
        type="success" 
        duration={2000}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText('Auto dismiss test')).toBeInTheDocument()

    // Fast forward time wrapped in act()
    act(() => {
      vi.advanceTimersByTime(2300) // duration + animation time
    })

    expect(mockOnClose).toHaveBeenCalledOnce()
  })

  it('should use default duration when not specified', () => {
    render(
      <Notification 
        message="Default duration test" 
        type="success" 
        onClose={mockOnClose}
      />
    )

    // Default duration is 3000ms wrapped in act()
    act(() => {
      vi.advanceTimersByTime(3300)
    })

    expect(mockOnClose).toHaveBeenCalledOnce()
  })
})