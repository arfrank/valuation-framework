import { useCallback, useRef, useState } from 'react'

export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Latest committed value. Functional updates read from here rather than from
  // the render-time snapshot, so two updates in the same tick compose instead
  // of the second overwriting the first.
  const latestRef = useRef(storedValue)

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(latestRef.current) : value
      if (Object.is(valueToStore, latestRef.current)) return
      latestRef.current = valueToStore
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }, [key])

  return [storedValue, setValue]
}
