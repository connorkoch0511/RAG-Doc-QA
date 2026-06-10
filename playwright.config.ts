import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '.env.local') })

// Target a deployed URL by setting PLAYWRIGHT_BASE_URL (e.g. the Vercel prod URL);
// otherwise tests run against a locally-started dev server.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const isLocal = baseURL.includes('localhost')

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  // Each test includes a Clerk sign-in (beforeEach) plus, for some, an upload
  // that waits up to 60s on a HuggingFace cold start. The 30s default is too
  // tight once external latency is added in.
  timeout: 120_000,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Only manage a local dev server when testing locally. The readiness probe
  // hits a public route — every other route 307-redirects into Clerk's
  // external handshake, which the check can't resolve.
  ...(isLocal && {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: true,
      timeout: 120000,
    },
  }),
})
