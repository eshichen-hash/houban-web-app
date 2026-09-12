// Isolated browser QA: local fixtures only. Never records a real microphone or publishes an event.
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4175'
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base)) throw new Error('QA fixtures are restricted to localhost.')
const out = 'outputs/voice-create-qa'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const results = []
const viewports = [
  { label: '320', width: 320, height: 844 },
  { label: '390', width: 390, height: 844 },
  { label: '768', width: 768, height: 844 },
  { label: '1280', width: 1280, height: 844 },
  { label: 'landscape-844', width: 844, height: 390 },
]
try {
  for (const { label, width, height } of viewports) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' })
    const page = await context.newPage()
    // Do not allow this smoke test to perform any cloud writes.
    await page.route('**/functions/v1/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ ok: false, error: { code: 'QA', message: 'QA：不執行雲端寫入' } }) }))
    await page.addInitScript(() => { Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined }) })
    await page.goto(base + '/create')
    await page.getByRole('heading', { name: '用說的，發起一場活動' }).waitFor()
    const micBounds = await page.getByRole('button', { name: '開始語音說明' }).boundingBox()
    if (height >= 700) assert.ok(micBounds && micBounds.y + micBounds.height < height - 100, 'Microphone must be visible above mobile navigation at ' + label)
    else {
      await page.getByRole('button', { name: '開始語音說明' }).evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
      assert.equal(await page.getByRole('button', { name: '開始語音說明' }).evaluate((el) => { const rect = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)) }), true)
    }
    await page.screenshot({ path: out + '/entry-' + label + '.png', fullPage: true })
    assert.equal(await page.locator('.vd-sentence-formula li').count(), 3)
    await page.getByText('想一次說完整？查看說話提示', { exact: true }).click()
    const guideOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    assert.equal(guideOverflow, false, 'expanded speaking guide overflow at ' + label)
    await page.screenshot({ path: out + '/guide-' + label + '.png', fullPage: true })
    await page.getByText('想一次說完整？查看說話提示', { exact: true }).click()
    assert.equal(await page.getByRole('button', { name: '改用文字輸入' }).count(), 0)
    await page.getByRole('button', { name: '開始語音說明' }).click()
    await page.getByRole('button', { name: '改用文字輸入' }).click()
    await page.getByRole('heading', { name: '確認你的活動草稿' }).waitFor()
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    assert.ok(noOverflow, 'page overflow at ' + label)
    const minRowHeight = await page.locator('.vd-field').evaluateAll((rows) => Math.min(...rows.map((row) => row.getBoundingClientRect().height)))
    assert.ok(minRowHeight >= 48)
    await page.getByRole('button', { name: '確認並建立活動' }).click()
    await page.getByRole('dialog').waitFor()
    assert.equal(await page.getByRole('dialog').getByRole('heading').textContent(), '活動類型')
    await page.getByRole('radio', { name: '健走', exact: true }).check()
    await page.getByRole('button', { name: '確認修改', exact: true }).click()
    await page.locator('[data-field="date"]').click()
    await page.getByLabel('活動日期', { exact: true }).fill('2099-09-12')
    await page.getByRole('button', { name: '確認修改', exact: true }).click()
    await page.locator('[data-field="time"]').click()
    await page.getByLabel('活動開始', { exact: true }).fill('15:00')
    await page.getByLabel('活動結束', { exact: true }).fill('16:00')
    await page.screenshot({ path: out + '/time-sheet-' + label + '.png' })
    const sheetOverflow = await page.getByRole('dialog').evaluate((el) => el.scrollWidth > el.clientWidth)
    assert.equal(sheetOverflow, false)
    await page.getByRole('button', { name: '確認修改', exact: true }).click()
    await page.locator('[data-field="cost"]').click()
    await page.getByRole('radio', { name: '付費', exact: true }).check()
    await page.getByLabel('每人費用（新台幣）').fill('100')
    await page.getByRole('button', { name: '確認修改', exact: true }).click()
    assert.match(await page.locator('[data-field="cost"]').textContent(), /100/)
    const createButton = page.getByRole('button', { name: '確認並建立活動' })
    // Scroll the last actions clear of the floating navigation, as a user can.
    await createButton.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
    const createButtonClear = await createButton.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      return el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))
    })
    assert.ok(createButtonClear, 'Main action must not be obscured by navigation at ' + label)
    await page.screenshot({ path: out + '/draft-' + label + '.png', fullPage: true })
    results.push({ viewport: `${width}x${height}`, minRowHeight, noOverflow, guideOverflow, sheetOverflow, createButtonClear, fieldsEditable: true, noCloudWrites: true })
    await context.close()
  }
  await writeFile(out + '/results.json', JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
} finally { await browser.close() }
