import { useState, useEffect } from 'react'

const Notification = ({ message, type = 'success', duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Start animation after mount
    const animationTimeout = setTimeout(() => setIsAnimating(true), 10)
    
    // Auto dismiss after duration
    const dismissTimeout = setTimeout(() => {
      setIsAnimating(false)
      setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, 300) // Wait for exit animation
    }, duration)

    return () => {
      clearTimeout(animationTimeout)
      clearTimeout(dismissTimeout)
    }
  }, [duration, onClose])

  if (!isVisible) return null

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: '#10b981',
          border: '#059669',
          icon: '✓'
        }
      case 'info':
        return {
          bg: '#3b82f6',
          border: '#2563eb',
          icon: 'ℹ'
        }
      case 'warning':
        return {
          bg: '#f59e0b',
          border: '#d97706',
          icon: '⚠'
        }
      case 'error':
        return {
          bg: '#ef4444',
          border: '#dc2626',
          icon: '✕'
        }
      default:
        return {
          bg: '#6b7280',
          border: '#4b5563',
          icon: '•'
        }
    }
  }

  const { bg, border, icon } = getTypeStyles()

  return (
    <div 
      className={`notification ${isAnimating ? 'notification-enter' : 'notification-exit'}`}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: bg,
        color: 'white',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        border: `1px solid ${border}`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        minWidth: '200px',
        maxWidth: '400px',
        transform: isAnimating ? 'translateX(0)' : 'translateX(100%)',
        opacity: isAnimating ? 1 : 0,
        transition: 'all 0.3s ease-in-out',
        fontSize: '0.875rem',
        fontWeight: '500'
      }}
    >
      <span style={{ fontSize: '1rem' }}>{icon}</span>
      <span>{message}</span>
    </div>
  )
}

export default Notification