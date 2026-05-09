import { test, expect } from '@playwright/test'

// Full flow: signup → onboarding → dashboard
// Requires: Convex dev server running (NEXT_PUBLIC_CONVEX_URL set)
// External services (Stripe, 360dialog) are mocked via page.route()

function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.replypilot.dev`
}

async function signUp(page: import('@playwright/test').Page, name: string, email: string) {
  await page.goto('/signup')
  await page.fill('[name="name"]', name)
  await page.fill('[name="email"]', email)
  await page.fill('[name="password"]', 'password-e2e-test')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL('/onboarding', { timeout: 15_000 })
}

test.describe('Agent signup flow', () => {
  test('signs up and reaches onboarding', async ({ page }) => {
    await page.goto('/signup')
    await page.fill('[name="name"]', 'E2E Test Agent')
    await page.fill('[name="email"]', uniqueEmail())
    await page.fill('[name="password"]', 'password-e2e-test')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page).toHaveURL('/onboarding', { timeout: 15_000 })
    await expect(page.getByText('Welcome to ReplyPilot')).toBeVisible()
    await expect(page.getByText('Choose your plan')).toBeVisible()
  })

  test('onboarding subscribe step calls checkout', async ({ page }) => {
    let checkoutCalled = false

    await page.route('/api/checkout/create-session', async (route) => {
      checkoutCalled = true
      const body = route.request().postDataJSON()
      expect(['plus', 'pro']).toContain(body.plan)
      await route.fulfill({ json: { url: 'https://checkout.stripe.com/pay/test_session' } })
    })

    // Must be authenticated for onboarding to resolve Convex queries
    await signUp(page, 'E2E Checkout Agent', uniqueEmail())

    await page.getByRole('button', { name: 'Get Plus' }).click()
    await expect.poll(() => checkoutCalled, { timeout: 10_000 }).toBe(true)
  })

  test('authenticated user stays on onboarding when not fully set up', async ({ page }) => {
    await signUp(page, 'E2E Auth Test', uniqueEmail())

    // Already on /onboarding — verify the subscribe step is shown
    await expect(page.getByText('Choose your plan')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: 'Get Plus' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Get Pro' })).toBeVisible()
  })
})

test.describe('Dashboard', () => {
  test('unauthenticated redirect to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login', { timeout: 10_000 })
  })

  test('new user stays on onboarding (not dashboard) after signup', async ({ page }) => {
    await signUp(page, 'E2E Dashboard Agent', uniqueEmail())
    // Signup redirects to /onboarding, not /dashboard
    await expect(page).toHaveURL('/onboarding')
    await expect(page).not.toHaveURL('/dashboard')
  })
})
