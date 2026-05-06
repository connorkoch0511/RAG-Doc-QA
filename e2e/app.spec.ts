import { test, expect, type Page } from '@playwright/test'
import path from 'path'

const TEST_EMAIL = `app-test-${Date.now()}@example.com`
const TEST_PASSWORD = 'testpassword123'

async function signUp(page: Page) {
  await page.goto('/auth/sign-up')
  await page.getByPlaceholder('you@example.com').fill(TEST_EMAIL)
  const passwordFields = page.getByPlaceholder('••••••••')
  await passwordFields.first().fill(TEST_PASSWORD)
  await passwordFields.last().fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL('/', { timeout: 10000 })
}

test.describe('App — Document upload and Q&A', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page)
  })

  test('shows empty state before any documents', async ({ page }) => {
    await expect(page.getByText('Upload a document to get started')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/07-empty-state.png', fullPage: true })
  })

  test('shows upload zone in sidebar', async ({ page }) => {
    await expect(page.getByText(/Drop a PDF or TXT file/)).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/08-upload-zone.png', fullPage: true })
  })

  test('uploads a document and shows pipeline progress', async ({ page }) => {
    const filePath = path.join(__dirname, 'fixtures/sample.txt')

    // Trigger file input
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(filePath)

    // Pipeline steps should appear
    await expect(page.getByText('Parsing document...')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/09-pipeline-progress.png', fullPage: true })

    // Wait for upload to complete — embedding can take up to 30s on cold start
    await expect(page.getByText('Storing in vector DB...')).toBeVisible({ timeout: 60000 })
    await page.screenshot({ path: 'e2e/screenshots/10-pipeline-complete.png', fullPage: true })

    // Document should appear in the list
    await expect(page.getByText('sample.txt')).toBeVisible({ timeout: 5000 })
    await page.screenshot({ path: 'e2e/screenshots/11-document-in-list.png', fullPage: true })
  })

  test('can ask a question and receive a streamed answer', async ({ page }) => {
    // Upload first
    const filePath = path.join(__dirname, 'fixtures/sample.txt')
    await page.locator('input[type="file"]').setInputFiles(filePath)
    await expect(page.getByText('sample.txt')).toBeVisible({ timeout: 60000 })

    // Ask a question
    const textarea = page.getByPlaceholder(/Ask a question/)
    await textarea.fill('What are the three types of layers in a neural network?')
    await page.keyboard.press('Enter')

    await page.screenshot({ path: 'e2e/screenshots/12-question-sent.png', fullPage: true })

    // Wait for a response to stream in
    await expect(page.getByText(/input layer|hidden layer|output layer/i)).toBeVisible({ timeout: 30000 })
    await page.screenshot({ path: 'e2e/screenshots/13-answer-received.png', fullPage: true })
  })

  test('answer has collapsible sources section', async ({ page }) => {
    const filePath = path.join(__dirname, 'fixtures/sample.txt')
    await page.locator('input[type="file"]').setInputFiles(filePath)
    await expect(page.getByText('sample.txt')).toBeVisible({ timeout: 60000 })

    await page.getByPlaceholder(/Ask a question/).fill('What is backpropagation?')
    await page.keyboard.press('Enter')

    // Wait for Sources button to appear
    await expect(page.getByText(/Sources \(/)).toBeVisible({ timeout: 30000 })
    await page.screenshot({ path: 'e2e/screenshots/14-sources-collapsed.png', fullPage: true })

    // Expand sources
    await page.getByText(/Sources \(/).click()
    await expect(page.getByText(/backpropagation/i).first()).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/15-sources-expanded.png', fullPage: true })
  })

  test('document checkbox scopes the search', async ({ page }) => {
    const filePath = path.join(__dirname, 'fixtures/sample.txt')
    await page.locator('input[type="file"]').setInputFiles(filePath)
    await expect(page.getByText('sample.txt')).toBeVisible({ timeout: 60000 })

    // Uncheck the document
    const checkbox = page.locator('input[type="checkbox"]').first()
    await checkbox.uncheck()

    // Chat input should be disabled
    await expect(page.getByText(/No documents selected/)).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/16-no-docs-selected.png', fullPage: true })

    // Re-check it
    await checkbox.check()
    await expect(page.getByPlaceholder(/Ask a question/)).toBeEnabled()
    await page.screenshot({ path: 'e2e/screenshots/17-doc-reselected.png', fullPage: true })
  })

  test('can delete a document', async ({ page }) => {
    const filePath = path.join(__dirname, 'fixtures/sample.txt')
    await page.locator('input[type="file"]').setInputFiles(filePath)
    await expect(page.getByText('sample.txt')).toBeVisible({ timeout: 60000 })

    // Hover to reveal delete button and click it
    const docItem = page.locator('li').filter({ hasText: 'sample.txt' })
    await docItem.hover()
    await docItem.getByTitle('Delete document').click()

    await expect(page.getByText('sample.txt')).not.toBeVisible({ timeout: 5000 })
    await page.screenshot({ path: 'e2e/screenshots/18-after-delete.png', fullPage: true })
  })
})
