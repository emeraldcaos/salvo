import { describe, expect, it } from 'vitest'
import { resolveGuardedRoute } from './path'
import { routes } from './routes'

describe('resolveGuardedRoute', () => {
  it('sends first run to Welcome from any path', () => {
    expect(
      resolveGuardedRoute({
        requestedPath: routes.home,
        pinConfigured: false,
        unlocked: false,
      }),
    ).toBe(routes.welcome)
    expect(
      resolveGuardedRoute({
        requestedPath: routes.verifier,
        pinConfigured: false,
        unlocked: false,
      }),
    ).toBe(routes.welcome)
  })

  it('blocks every route while locked', () => {
    for (const path of Object.values(routes)) {
      expect(
        resolveGuardedRoute({
          requestedPath: path,
          pinConfigured: true,
          unlocked: false,
        }),
      ).toBe(routes.lock)
    }
  })

  it('allows tab and hidden routes when unlocked', () => {
    expect(
      resolveGuardedRoute({
        requestedPath: routes.plan,
        pinConfigured: true,
        unlocked: true,
      }),
    ).toBe(routes.plan)
    expect(
      resolveGuardedRoute({
        requestedPath: routes.verifier,
        pinConfigured: true,
        unlocked: true,
      }),
    ).toBe(routes.verifier)
  })

  it('sends unlocked Welcome and Lock to Home', () => {
    expect(
      resolveGuardedRoute({
        requestedPath: routes.welcome,
        pinConfigured: true,
        unlocked: true,
      }),
    ).toBe(routes.home)
    expect(
      resolveGuardedRoute({
        requestedPath: '/',
        pinConfigured: true,
        unlocked: true,
      }),
    ).toBe(routes.home)
  })
})
