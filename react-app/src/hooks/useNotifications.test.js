import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNotifications } from './useNotifications'

describe('useNotifications', () => {
  it('should initialize with empty notifications array', () => {
    const { result } = renderHook(() => useNotifications())
    
    expect(result.current.notifications).toEqual([])
  })

  it('should add notification when showNotification is called', () => {
    const { result } = renderHook(() => useNotifications())
    
    act(() => {
      result.current.showNotification('Test message', 'success', 5000)
    })

    expect(result.current.notifications).toHaveLength(1)
    expect(result.current.notifications[0]).toMatchObject({
      message: 'Test message',
      type: 'success',
      duration: 5000
    })
    expect(result.current.notifications[0].id).toBeDefined()
  })

  it('should remove notification when removeNotification is called', () => {
    const { result } = renderHook(() => useNotifications())
    
    let notificationId
    
    act(() => {
      notificationId = result.current.showNotification('Test message')
    })

    expect(result.current.notifications).toHaveLength(1)

    act(() => {
      result.current.removeNotification(notificationId)
    })

    expect(result.current.notifications).toHaveLength(0)
  })

  it('should add success notification with showSuccess', () => {
    const { result } = renderHook(() => useNotifications())
    
    act(() => {
      result.current.showSuccess('Success message')
    })

    expect(result.current.notifications[0]).toMatchObject({
      message: 'Success message',
      type: 'success'
    })
  })

  it('should add info notification with showInfo', () => {
    const { result } = renderHook(() => useNotifications())
    
    act(() => {
      result.current.showInfo('Info message')
    })

    expect(result.current.notifications[0]).toMatchObject({
      message: 'Info message',
      type: 'info'
    })
  })

  it('should add warning notification with showWarning', () => {
    const { result } = renderHook(() => useNotifications())
    
    act(() => {
      result.current.showWarning('Warning message')
    })

    expect(result.current.notifications[0]).toMatchObject({
      message: 'Warning message',
      type: 'warning'
    })
  })

  it('should add error notification with showError', () => {
    const { result } = renderHook(() => useNotifications())
    
    act(() => {
      result.current.showError('Error message')
    })

    expect(result.current.notifications[0]).toMatchObject({
      message: 'Error message',
      type: 'error'
    })
  })

  it('should handle multiple notifications', () => {
    const { result } = renderHook(() => useNotifications())
    
    act(() => {
      result.current.showSuccess('First message')
      result.current.showInfo('Second message')
      result.current.showError('Third message')
    })

    expect(result.current.notifications).toHaveLength(3)
    expect(result.current.notifications[0].message).toBe('First message')
    expect(result.current.notifications[1].message).toBe('Second message')
    expect(result.current.notifications[2].message).toBe('Third message')
  })
})