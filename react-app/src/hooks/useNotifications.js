import { useState, useCallback } from 'react'

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([])

  const showNotification = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random()
    const notification = { id, message, type, duration }
    
    setNotifications(prev => [...prev, notification])
    
    return id
  }, [])

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const showSuccess = useCallback((message, duration) => {
    return showNotification(message, 'success', duration)
  }, [showNotification])

  const showInfo = useCallback((message, duration) => {
    return showNotification(message, 'info', duration)
  }, [showNotification])

  const showWarning = useCallback((message, duration) => {
    return showNotification(message, 'warning', duration)
  }, [showNotification])

  const showError = useCallback((message, duration) => {
    return showNotification(message, 'error', duration)
  }, [showNotification])

  return {
    notifications,
    showNotification,
    removeNotification,
    showSuccess,
    showInfo,
    showWarning,
    showError
  }
}