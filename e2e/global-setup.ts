import { createClient } from '@supabase/supabase-js'

export const TEST_EMAIL = 'playwright@test.local'
export const TEST_PASSWORD = 'playwright-test-password'

export default async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  }

  const supabase = createClient(url, serviceKey)

  // Delete the test user if it exists (clean slate each run)
  const { data: existing } = await supabase.auth.admin.listUsers()
  const existingUser = existing?.users?.find((u) => u.email === TEST_EMAIL)
  if (existingUser) {
    await supabase.auth.admin.deleteUser(existingUser.id)
  }

  // Create a pre-confirmed test user (bypasses email confirmation)
  const { error } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  })

  if (error) throw new Error(`Failed to create test user: ${error.message}`)

  console.log(`\n✓ Test user created: ${TEST_EMAIL}`)
}
