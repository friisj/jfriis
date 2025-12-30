/**
 * Debounce utilities for preventing rapid-fire operations
 */

/**
 * Simple debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Hook for preventing duplicate async operations
 * Returns a ref that tracks if operation is in progress
 */
export function useOperationLock() {
  const lockRef = { current: false }

  const withLock = async <T>(operation: () => Promise<T>): Promise<T | null> => {
    if (lockRef.current) {
      console.warn('Operation already in progress, skipping')
      return null
    }

    lockRef.current = true
    try {
      return await operation()
    } finally {
      lockRef.current = false
    }
  }

  return { isLocked: () => lockRef.current, withLock }
}

/**
 * Throttle function - ensures function is called at most once per interval
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
