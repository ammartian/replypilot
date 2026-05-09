import { test, expect } from '@playwright/test'

test('home page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL('/')
  await expect(page.locator('body')).toBeVisible()
})

test('signup page loads', async ({ page }) => {
  await page.goto('/signup')
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
})

test('login page loads', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
})

test('unauthenticated /dashboard redirects to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL('/login', { timeout: 10_000 })
})

test('unauthenticated /onboarding renders without crash', async ({ page }) => {
  await page.goto('/onboarding')
  // ConvexAuthNextjsProvider holds queries until auth state resolves.
  // The page shows a loading spinner until Convex confirms no session.
  await expect(page.locator('body')).toBeVisible()
})
