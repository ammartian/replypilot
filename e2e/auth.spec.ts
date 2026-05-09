import { test, expect } from '@playwright/test'

test.describe('Signup form validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup')
  })

  test('renders signup form', async ({ page }) => {
    await expect(page.getByText('Create your account')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
  })

  test('shows error when name is empty', async ({ page }) => {
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('Name is required')).toBeVisible()
  })

  test('shows error for invalid email', async ({ page }) => {
    await page.fill('[name="name"]', 'Test Agent')
    // 'test@nodot' passes Chrome type="email" validation but fails our regex (no dot in domain)
    await page.fill('[name="email"]', 'test@nodot')
    await page.fill('[name="password"]', 'password123')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('Valid email required')).toBeVisible()
  })

  test('shows error for password under 8 chars', async ({ page }) => {
    await page.fill('[name="name"]', 'Test Agent')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'short')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible()
  })

  test('has link to login page', async ({ page }) => {
    await page.getByRole('link', { name: 'Sign in' }).click()
    await expect(page).toHaveURL('/login')
  })
})

test.describe('Login form validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('renders login form', async ({ page }) => {
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('shows error when email is empty', async ({ page }) => {
    await page.fill('[name="password"]', 'password123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Email is required')).toBeVisible()
  })

  test('shows error when password is empty', async ({ page }) => {
    await page.fill('[name="email"]', 'test@example.com')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Password is required')).toBeVisible()
  })

  test('has link to signup page', async ({ page }) => {
    await page.getByRole('link', { name: 'Create one' }).click()
    await expect(page).toHaveURL('/signup')
  })
})
