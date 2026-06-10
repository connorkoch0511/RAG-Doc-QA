import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { signIn } from './auth-helpers'

// Submits a question and waits for an answer that cites sources. HuggingFace's
// free inference occasionally cold-starts on the query embedding and returns
// zero chunks — yielding a "not enough information" answer with no Sources
// section. When that happens we simply re-ask; by the retry the model is warm.
async function askWithSources(page: Page, question: string) {
  const input = page.getByPlaceholder(/Ask a question/)
  const sources = page.getByText(/Sources \(/).first()

  for (let attempt = 1; attempt <= 3; attempt++) {
    await expect(input).toBeEnabled()
    await input.fill(question)
    await page.keyboard.press('Enter')
    try {
      await expect(sources).toBeVisible({ timeout: 30000 })
      return
    } catch {
      if (attempt === 3) throw new Error(`No sources returned after ${attempt} attempts`)
      // Cold-start retrieval miss — let streaming settle, then re-ask.
      await expect(input).toBeEnabled({ timeout: 30000 })
    }
  }
}

test.describe('App — Document upload and Q&A', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    // Delete all existing documents for a clean slate
    const res = await page.request.get('/api/documents')
    const { documents } = await res.json()
    for (const doc of documents ?? []) {
      await page.request.delete(`/api/documents/${doc.id}`)
    }
    await page.reload()
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

    await page.locator('input[type="file"]').setInputFiles(filePath)

    await expect(page.getByText('Parsing document...')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/09-pipeline-progress.png', fullPage: true })

    // Wait for upload to complete — embedding can take up to 30s on HF cold start
    await expect(page.getByText('Storing in vector DB...')).toBeVisible({ timeout: 60000 })
    await page.screenshot({ path: 'e2e/screenshots/10-pipeline-complete.png', fullPage: true })

    await expect(page.getByText('sample.txt')).toBeVisible({ timeout: 5000 })
    await page.screenshot({ path: 'e2e/screenshots/11-document-in-list.png', fullPage: true })
  })

  test('can ask a question and receive a streamed answer', async ({ page }) => {
    const filePath = path.join(__dirname, 'fixtures/sample.txt')
    await page.locator('input[type="file"]').setInputFiles(filePath)
    await expect(page.getByText('sample.txt')).toBeVisible({ timeout: 60000 })

    await askWithSources(page, 'What are the three types of layers in a neural network?')
    await page.screenshot({ path: 'e2e/screenshots/12-question-sent.png', fullPage: true })

    await expect(page.getByText(/input layer|hidden layer|output layer/i)).toBeVisible({ timeout: 60000 })
    await page.screenshot({ path: 'e2e/screenshots/13-answer-received.png', fullPage: true })
  })

  test('answer has collapsible sources section', async ({ page }) => {
    const filePath = path.join(__dirname, 'fixtures/sample.txt')
    await page.locator('input[type="file"]').setInputFiles(filePath)
    await expect(page.getByText('sample.txt')).toBeVisible({ timeout: 60000 })

    await askWithSources(page, 'What is backpropagation?')
    await page.screenshot({ path: 'e2e/screenshots/14-sources-collapsed.png', fullPage: true })

    await page.getByText(/Sources \(/).first().click()
    await expect(page.getByText(/backpropagation/i).first()).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/15-sources-expanded.png', fullPage: true })
  })

  test('document checkbox scopes the search', async ({ page }) => {
    const filePath = path.join(__dirname, 'fixtures/sample.txt')
    await page.locator('input[type="file"]').setInputFiles(filePath)
    await expect(page.getByText('sample.txt')).toBeVisible({ timeout: 60000 })

    const checkbox = page.locator('input[type="checkbox"]').first()
    await checkbox.uncheck()

    await expect(page.getByText(/No documents selected/)).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/16-no-docs-selected.png', fullPage: true })

    await checkbox.check()
    await expect(page.getByPlaceholder(/Ask a question/)).toBeEnabled()
    await page.screenshot({ path: 'e2e/screenshots/17-doc-reselected.png', fullPage: true })
  })

  test('can delete a document', async ({ page }) => {
    const filePath = path.join(__dirname, 'fixtures/sample.txt')
    await page.locator('input[type="file"]').setInputFiles(filePath)
    await expect(page.getByText('sample.txt')).toBeVisible({ timeout: 60000 })

    const docItem = page.locator('li').filter({ hasText: 'sample.txt' })
    await docItem.hover()
    await docItem.getByTitle('Delete document').click()

    await expect(page.getByText('sample.txt')).not.toBeVisible({ timeout: 5000 })
    await page.screenshot({ path: 'e2e/screenshots/18-after-delete.png', fullPage: true })
  })
})
