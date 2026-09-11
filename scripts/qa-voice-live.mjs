// Isolated transport-fixture QA. This is NOT a real speech/provider acceptance test.
// Synthetic audio only: no physical microphone, LINE account, paid API, or cloud write is used.
import { createRequire } from 'node:module'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4175'
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base)) throw new Error('QA fixtures are restricted to localhost.')
const out = 'outputs/voice-live-qa'
await mkdir(out, { recursive: true })
const audioFile = resolve(process.env.QA_AUDIO_FILE || resolve(out, 'speech-fixture.wav'))
await access(audioFile).catch(() => { throw new Error('Provide QA_AUDIO_FILE or generate the synthetic WAV as documented in docs/voice-create-implementation.md.') })
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-audio-capture=' + audioFile] })
const results = []
const text = '明天下午三點到四點，在大安森林公園健走。'
try {
  for (const width of [320, 390, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce', permissions: ['microphone'] })
    const page = await context.newPage(), calls = []
    let segments = 0
    await page.routeWebSocket('**/functions/v1/voice-draft', ws => {
      assert.equal(new URL(ws.url()).search, '', 'Never put a LINE credential in the socket URL')
      ws.onMessage(message => {
        if (typeof message === 'string') {
          const input = JSON.parse(message)
          if (input.type === 'authenticate') {
            assert.equal(input.token, 'qa-fixture-only'); calls.push('connect'); ws.send(JSON.stringify({ type: 'ready' }))
          } else if (input.type === 'finish') ws.send(JSON.stringify({ type: 'done' }))
          else throw new Error('Unexpected socket action')
        } else {
          assert.equal(message.toString('ascii',0,4),'RIFF')
          assert.equal(message.readUInt32LE(24),16000)
          ws.send(JSON.stringify({ type: 'transcript', seq: segments, text: segments === 0 ? text : '' })); segments++
        }
      })
    })
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (url.origin === base) {
        if (url.pathname === '/src/services/liffService.ts') return route.fulfill({ contentType: 'application/javascript', body: `
          export class LineAuthRequiredError extends Error {}
          export async function initLiff() {}
          export async function requireVerifiedLineToken() { return 'qa-fixture-only' }
          export async function shareActivityToLine() { throw new Error('QA: disabled') }
          export function useLiff() { return { liffState: { profile: null, isInitialized: true, isLoggedIn: false }, initLiff } }
        ` })
        return route.continue()
      }
      if (url.pathname === '/functions/v1/voice-draft') {
        const body = route.request().postDataJSON()
        calls.push(body.action)
        assert.equal(body.action, 'extract')
        assert.equal(body.transcript, text)
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, data: {
          transcript: text,
          extraction: { type: '健走', isoDate: '2099-09-12', startTime: '15:00', endTime: '16:00', parkQuery: '大安森林公園', meeting: null, spots: null, cost: null, costAmount: null, items: null, evidence: { type: '健走', date: '明天', time: '下午三點到四點', park: '大安森林公園', meeting: null } },
        } }) })
      }
      return route.fulfill({ status: 401, contentType: 'application/json', body: '{"ok":false,"error":{"message":"QA: external requests disabled"}}' })
    })
    await page.addInitScript(() => {
      const get = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      navigator.mediaDevices.getUserMedia = async constraints => { const stream = await get(constraints); window.__voiceQaTracks = stream.getTracks(); return stream }
    })
    await page.goto(base + '/create')
    await page.getByRole('button', { name: '開始語音說明' }).click()
    await page.getByText('正在聽，文字會即時顯示', { exact: true }).waitFor()
    await page.waitForFunction(() => document.getElementById('voice-transcript').value.includes('健走'))
    assert.equal(await page.getByLabel('語音辨識文字', { exact: true }).inputValue(), text)
    assert.deepEqual(calls, ['connect'], 'Partial text must appear before extraction')
    const layout = await page.getByLabel('語音辨識文字', { exact: true }).evaluate(el => {
      const rect = el.getBoundingClientRect()
      return { noOverflow: document.documentElement.scrollWidth <= window.innerWidth, textVisible: el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)), bottom: rect.bottom }
    })
    assert.ok(layout.noOverflow && layout.textVisible, 'Live text must be visible at ' + width)
    await page.screenshot({ path: out + '/recording-' + width + '.png' })
    await page.getByRole('button', { name: '完成錄音，開始整理草稿' }).click()
    await page.getByRole('heading', { name: '確認你的活動草稿' }).waitFor()
    assert.deepEqual(calls, ['connect', 'extract'])
    assert.equal(await page.evaluate(() => window.__voiceQaTracks.every(track => track.readyState === 'ended')), true)
    assert.match(await page.locator('[data-field="park"]').textContent(), /待確認/)
    results.push({ width, ...layout, realProvider: false, syntheticAudioCapture: true, liveTextVisible: true, segments, extractedAfterStop: true, microphoneClosed: true, noPublishedEvent: true })
    await context.close()
  }
  await writeFile(out + '/results.json', JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
} finally { await browser.close() }
