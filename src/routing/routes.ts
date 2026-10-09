import type { IconName } from '../ui'

export const routes = {
  welcome: '/welcome',
  lock: '/lock',
  home: '/home',
  plan: '/plan',
  help: '/help',
  alerts: '/alerts',
  rights: '/rights',
  settings: '/settings',
  verifier: '/verifier',
  gallery: '/gallery',
} as const

export type AppRoute = (typeof routes)[keyof typeof routes]

export type TabId = 'home' | 'plan' | 'help' | 'alerts' | 'rights' | 'settings'

export interface TabDefinition {
  id: TabId
  path: AppRoute
  icon: IconName
}

export const tabBar: readonly TabDefinition[] = [
  { id: 'home', path: routes.home, icon: 'home' },
  { id: 'plan', path: routes.plan, icon: 'plan' },
  { id: 'help', path: routes.help, icon: 'help' },
  { id: 'alerts', path: routes.alerts, icon: 'alerts' },
  { id: 'rights', path: routes.rights, icon: 'rights' },
  { id: 'settings', path: routes.settings, icon: 'settings' },
] as const

const knownRoutes = new Set<string>(Object.values(routes))

export function isAppRoute(path: string): path is AppRoute {
  return knownRoutes.has(path)
}

export function isTabRoute(path: string): boolean {
  return tabBar.some((tab) => tab.path === path)
}

export function showsTabBar(path: string): boolean {
  return isTabRoute(path)
}
