import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from '@convex-dev/auth/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/login',
  '/signup',
  '/api/webhook/whatsapp',
  '/api/webhook/stripe',
])

export const proxy = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authenticated = await convexAuth.isAuthenticated()

  if (!isPublicRoute(request) && !authenticated) {
    return nextjsMiddlewareRedirect(request, '/login')
  }

  if (authenticated && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    return nextjsMiddlewareRedirect(request, '/dashboard')
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
