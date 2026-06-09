import { test, expect } from '@playwright/test'
import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { signIn } from './auth-helpers'

test.describe('Authentication', () => {
  test('redirects unauthenticated users to sign-in', async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/')
    await expect(page).toHaveURL(/\/sign-in/)
    await page.screenshot({ path: 'e2e/screenshots/01-sign-in-page.png', fullPage: true })
  })

  test('shows the Clerk sign-in form', async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/sign-in')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible({ timeout: 10000 })
    await page.screenshot({ path: 'e2e/screenshots/02-sign-in-form.png', fullPage: true })
  })

  test('shows the Clerk sign-up form', async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/sign-up')
    await expect(page.getByRole('heading', { name: /sign up|create your account/i })).toBeVisible({ timeout: 10000 })
    await page.screenshot({ path: 'e2e/screenshots/03-sign-up-form.png', fullPage: true })
  })

  test('can sign in and reach the app', async ({ page }) => {
    await signIn(page)
    await expect(page.getByText('Knowledge Base')).toBeVisible({ timeout: 10000 })
    await page.screenshot({ path: 'e2e/screenshots/04-after-signin.png', fullPage: true })
  })

  test('can sign out', async ({ page }) => {
    await signIn(page)
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 10000 })
    await page.screenshot({ path: 'e2e/screenshots/05-after-signout.png', fullPage: true })
  })
})
