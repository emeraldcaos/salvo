import { useEffect, useState } from 'react'
import { readLocationPath, toAbsoluteUrl } from './path'
import type { AppRoute } from './routes'

export function navigate(path: AppRoute | string, replace = false): void {
  const url = toAbsoluteUrl(path)
  if (replace) {
    window.history.replaceState(null, '', url)
  } else {
    window.history.pushState(null, '', url)
  }
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function usePath(): string {
  const [path, setPath] = useState(() => readLocationPath())

  useEffect(() => {
    const sync = () => setPath(readLocationPath())
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  return path
}
