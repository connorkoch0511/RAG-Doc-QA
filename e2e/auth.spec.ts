import { test, expect } from '@playwright/test'

const TEST_EMAIL = `test-${Date.now()}@example.com`
const TEST_PASSWORD = 'testpassword123'

test.describe('Authentication', () => {
  test('redirects unauthenticated users to sign-in', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/auth\/sign-in/)
    await page.screenshot({ path: 'e2e/screenshots/01-sign-in-page.png', fullPage: true })
  })

  test('shows sign-up page', async ({ page }) => {
    await page.goto('/auth/sign-up')
    await expect(page.getByRole('heading', { name: 'RAG Doc Q&A' })).toBeVisible()
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/02-sign-up-page.png', fullPage: true })
  })

  test('shows validation error for mismatched passwords', async ({ page }) => {
    await page.goto('/auth/sign-up')
    await page.getByPlaceholder('you@example.com').fill('user@example.com')
    await page.getByPlaceholder('Min. 6 characters').fill('password123')
    await page.getByPlaceholder('••••••••').fill('different456')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('Passwords do not match')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/03-password-mismatch.png', fullPage: true })
  })

  test('can sign up and is redirected to app', async ({ page }) => {
    await page.goto('/auth/sign-up')
    await page.getByPlaceholder('you@example.com').fill(TEST_EMAIL)
    const passwordFields = page.getByPlaceholder('••••••••')
    await passwordFields.first().fill(TEST_PASSWORD)
    await passwordFields.last().fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page).toHaveURL('/', { timeout: 10000 })
    await page.screenshot({ path: 'e2e/screenshots/04-after-signup.png', fullPage: true })
  })

  test('can sign out', async ({ page }) => {
    // Sign in first
    await page.goto('/auth/sign-in')
    await page.getByPlaceholder('you@example.com').fill(TEST_EMAIL)
    await page.getByPlaceholder('••••••••').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL('/', { timeout: 10000 })

    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 5000 })
    await page.screenshot({ path: 'e2e/screenshots/05-after-signout.png', fullPage: true })
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/sign-in')
    await page.getByPlaceholder('you@example.com').fill('wrong@example.com')
    await page.getByPlaceholder('••••••••').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.locator('.text-red-400')).toBeVisible({ timeout: 5000 })
    await page.screenshot({ path: 'e2e/screenshots/06-invalid-credentials.png', fullPage: true })
  })
})
