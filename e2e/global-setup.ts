import { clerkSetup } from '@clerk/testing/playwright'

// Credentials of a real test user that exists in your Clerk instance.
// Create one in the Clerk dashboard (or via the API) and set these in .env.local:
//   E2E_CLERK_USER_IDENTIFIER=playwright@example.com
//   E2E_CLERK_USER_PASSWORD=...
export const TEST_IDENTIFIER = process.env.E2E_CLERK_USER_IDENTIFIER ?? ''
export const TEST_PASSWORD = process.env.E2E_CLERK_USER_PASSWORD ?? ''

export default async function globalSetup() {
  if (!process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    throw new Error('Missing CLERK_SECRET_KEY / NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in .env.local')
  }
  if (!TEST_IDENTIFIER || !TEST_PASSWORD) {
    throw new Error(
      'Missing E2E_CLERK_USER_IDENTIFIER / E2E_CLERK_USER_PASSWORD in .env.local — ' +
        'create a test user in Clerk and set these to its credentials.'
    )
  }

  // Fetches a Testing Token so Clerk bypasses bot detection during tests.
  await clerkSetup()

  console.log(`\n✓ Clerk testing configured for user: ${TEST_IDENTIFIER}`)
}
