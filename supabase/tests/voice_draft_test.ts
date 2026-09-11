import { assertEquals, assert } from 'jsr:@std/assert@1.0.14'
import { startVoiceSession } from '../functions/_shared/voiceSocket.ts'
import { encodeVoiceWave } from '../functions/_shared/voiceAudio.ts'

let handler: (request: Request) => Promise<Response>
const originalServe = Deno.serve
Object.defineProperty(Deno, 'serve', { configurable: true, value: (fn: typeof handler) => { handler = fn } })
await import('../functions/voice-draft/index.ts')
Object.defineProperty(Deno, 'serve', { configurable: true, value: originalServe })

async function withDependencies(run: (calls: string[]) => Promise<void>, provider: (url: string, init?: RequestInit) => Response, legacy = false) {
  const originalFetch = globalThis.fetch
  const env = ['OPENROUTER_API_KEY','VITE_OPENROUTER_API_KEY','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY']
  const saved = env.map((name) => Deno.env.get(name)), calls: string[] = []
  Deno.env.delete('OPENROUTER_API_KEY'); Deno.env.delete('VITE_OPENROUTER_API_KEY')
  Deno.env.set(legacy ? 'VITE_OPENROUTER_API_KEY' : 'OPENROUTER_API_KEY', 'test-only')
  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co'); Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-only')
  globalThis.fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input), parsed = new URL(url)
    calls.push(parsed.pathname)
    if (parsed.hostname === 'api.line.me') return Response.json({ iss: 'https://access.line.me', aud: '2011461980', sub: 'test-user', exp: Date.now() / 1000 + 600 })
    if (url.endsWith('/rpc/reserve_voice_quota')) return Response.json('2026-09-11')
    if (url.endsWith('/rpc/refund_creation_quota')) return Response.json(null)
    if (parsed.hostname === 'openrouter.ai') return provider(url, init)
    throw new Error('Unexpected dependency host')
  }
  try { await run(calls) } finally {
    globalThis.fetch = originalFetch
    env.forEach((name, i) => saved[i] === undefined ? Deno.env.delete(name) : Deno.env.set(name, saved[i]!))
  }
}
function request(body: unknown, authenticated = true) {
  return new Request('http://localhost/voice-draft', {
    method: 'POST', headers: { ...(authenticated ? { Authorization: 'Bearer test' } : {}), ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) },
    body: body instanceof FormData ? body : JSON.stringify(body),
  })
}
Deno.test('OpenRouter 402 is actionable, preserves input and refunds quota', async () => {
  await withDependencies(async (calls) => {
    const transcript = '明天下午在大安森林公園健走'
    const response = await handler!(request({ action: 'extract', transcript }))
    const result = await response.json()
    assertEquals(response.status,503); assertEquals(result.error.code,'VOICE_BILLING_REQUIRED')
    assertEquals(result.transcript,transcript)
    assertEquals(calls.filter(path => path.endsWith('/refund_creation_quota')).length,1)
  }, () => Response.json({ error: { code: 402, message: 'Provider details must not be exposed' } }, { status:402 }))
})
Deno.test('existing secret name and old audio upload use OpenRouter, not direct OpenAI', async () => {
  await withDependencies(async (calls) => {
    const audio = new FormData(); audio.set('audio',new Blob(['fixture'],{type:'audio/mp4'}),'test.mp4')
    const response = await handler!(request(audio)), result = await response.json()
    assertEquals(response.status,200); assertEquals(result.data.extraction.type,'健走')
    assertEquals(result.data.transcript,'明天在公園健走')
    assertEquals(calls.includes('/api/v1/audio/transcriptions'),true)
    assertEquals(calls.includes('/api/v1/chat/completions'),true)
  }, (url, init) => {
    assertEquals(new Headers(init?.headers).get('authorization'),'Bearer test-only')
    if (url.endsWith('/audio/transcriptions')) {
      const form = init?.body as FormData
      assertEquals(form.get('model'),'qwen/qwen3-asr-1.7b')
      assertEquals((form.get('file') as File).name,'recording.m4a')
      return Response.json({text:'明天在公园健走'})
    }
    const body = JSON.parse(String(init?.body))
    assertEquals(body.model,'google/gemini-2.5-flash-lite')
    assertEquals(body.provider.require_parameters,true)
    assertEquals(body.response_format.type,'json_schema')
    return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({type:'健走',evidence:{type:'健走'}})}}]})
  }, true)
})
Deno.test('unauthenticated HTTP never reaches quota or OpenRouter', async () => {
  await withDependencies(async calls => {
    assertEquals((await handler!(request({action:'extract',transcript:'test'},false))).status,401)
    assertEquals(calls,[])
  }, () => { throw new Error('Must not reach provider') })
})
Deno.test('unsupported old RTC action does not consume paid quota', async () => {
  await withDependencies(async calls => {
    assertEquals((await handler!(request({action:'connect',sdp:'v=0'}))).status,400)
    assertEquals(calls.some(path => path.endsWith('/reserve_voice_quota')),false)
  }, () => { throw new Error('Must not reach provider') })
})

class FakeSocket {
  readyState = 1
  binaryType = ''
  onmessage: ((event: {data: unknown}) => Promise<void>) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  messages: Array<Record<string,unknown>> = []
  send(text: string) { this.messages.push(JSON.parse(text)) }
  close() { this.readyState = 3; this.onclose?.() }
  async emit(data: unknown) { await this.onmessage?.({data}) }
}
const wave = () => encodeVoiceWave(new Float32Array(32000).fill(.1))
const settle = async () => { for(let i=0;i<10;i++) await Promise.resolve() }
Deno.test('socket authenticates once, streams real transcriptions, and waits for the last segment', async () => {
  const socket = new FakeSocket(); let auth = 0, refunds = 0, resolve!: (text:string) => void
  const closed = startVoiceSession(socket as unknown as WebSocket, {
    authorize: async token => { assertEquals(token,'test'); auth++ }, refund: async () => { refunds++ },
    transcribe: () => new Promise(done => { resolve = done }),
  })
  await socket.emit(JSON.stringify({type:'authenticate',token:'test'}))
  await socket.emit(wave()); await socket.emit(JSON.stringify({type:'finish'}))
  assertEquals(socket.messages.map(m=>m.type),['ready'])
  resolve('明天下午健走'); await settle(); await closed
  assertEquals(socket.messages.map(m=>m.type),['ready','transcript','done'])
  assertEquals(socket.messages[1]?.text,'明天下午健走')
  assertEquals(auth,1); assertEquals(refunds,0)
})
Deno.test('socket cannot send audio before LINE authentication', async () => {
  const socket = new FakeSocket(); let calls = 0
  const closed = startVoiceSession(socket as unknown as WebSocket, {
    authorize: async () => { calls++ }, refund: async () => {}, transcribe: async () => { calls++; return '' },
  })
  await socket.emit(wave()); await closed
  assertEquals(calls,0); assertEquals(socket.messages[0]?.code,'LINE_LOGIN_REQUIRED')
})
Deno.test('socket provider failure refunds once and never emits successful completion', async () => {
  const socket = new FakeSocket(); let refunds = 0
  const closed = startVoiceSession(socket as unknown as WebSocket, {
    authorize: async () => {}, refund: async () => { refunds++ }, transcribe: async () => { throw new Error('fixture error') },
  })
  await socket.emit(JSON.stringify({type:'authenticate',token:'test'})); await socket.emit(wave())
  await closed
  assertEquals(refunds,1); assert(socket.messages.some(m=>m.type==='error')); assertEquals(socket.messages.some(m=>m.type==='done'),false)
})
Deno.test('silence never reaches STT and oversized waves are rejected', async () => {
  const socket = new FakeSocket(); let calls = 0
  const closed = startVoiceSession(socket as unknown as WebSocket, {
    authorize: async () => {}, refund: async () => {}, transcribe: async () => { calls++; return '' },
  })
  await socket.emit(JSON.stringify({type:'authenticate',token:'test'}))
  await socket.emit(encodeVoiceWave(new Float32Array(32000))); await settle()
  await socket.emit(encodeVoiceWave(new Float32Array(16000*7))); await closed
  assertEquals(calls,0); assert(socket.messages.some(m=>m.type==='error'))
})
