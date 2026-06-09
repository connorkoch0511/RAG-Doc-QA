import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import { expect, type Page } from '@playwright/test'
import { TEST_IDENTIFIER, TEST_PASSWORD } from './global-setup'

// Signs in via Clerk's testing helper (no brittle UI scripting), then lands on the app.
export async function signIn(page: Page) {
  await setupClerkTestingToken({ page })
  await page.goto('/sign-in')
  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: TEST_IDENTIFIER,
      password: TEST_PASSWORD,
    },
  })
  await page.goto('/')
  await expect(page).toHaveURL('/', { timeout: 10000 })
}
