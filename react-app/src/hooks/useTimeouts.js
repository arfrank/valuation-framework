import { useCallback, useEffect, useRef } from 'react'

/**
 * Returns a `setTimeout` that is cancelled when the component unmounts, so a
 * pending callback can never set state on a component that is gone.
 */
export const useTimeouts = () => {
  const timersRef = useRef(new Set())

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach(clearTimeout)
      timers.clear()
    }
  }, [])

  return useCallback((callback, delay) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id)
      callback()
    }, delay)
    timersRef.current.add(id)
    return id
  }, [])
}
