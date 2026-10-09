import { isAppRoute, routes, type AppRoute } from './routes'

function trimTrailingSlash(value: string): string {
  if (value.length > 1 && value.endsWith('/')) return value.slice(0, -1)
  return value
}

export function getBasePath(): string {
  const base = import.meta.env.BASE_URL || '/'
  return trimTrailingSlash(base === '/' ? '' : base)
}

/** Pathname relative to the Vite base, always starting with `/`. */
export function readLocationPath(
  pathname: string = window.location.pathname,
): string {
  const base = getBasePath()
  let path = pathname
  if (base && (path === base || path.startsWith(`${base}/`))) {
    path = path.slice(base.length) || '/'
  }
  if (!path.startsWith('/')) path = `/${path}`
  return trimTrailingSlash(path) || '/'
}

export function toAbsoluteUrl(path: AppRoute | string): string {
  const base = getBasePath()
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}` || normalized
}

export function resolveGuardedRoute(options: {
  requestedPath: string
  pinConfigured: boolean
  unlocked: boolean
}): AppRoute {
  const { requestedPath, pinConfigured, unlocked } = options

  if (!pinConfigured) return routes.welcome

  if (!unlocked) return routes.lock

  if (
    requestedPath === '/' ||
    requestedPath === routes.welcome ||
    requestedPath === routes.lock
  ) {
    return routes.home
  }

  if (isAppRoute(requestedPath)) return requestedPath

  return routes.home
}
