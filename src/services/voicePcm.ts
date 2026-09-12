import { encodeVoiceWave, VOICE_SAMPLE_RATE } from '../../supabase/functions/_shared/voiceAudio'

function resample(samples: Float32Array, rate: number) {
  const ratio = rate / VOICE_SAMPLE_RATE, length = Math.floor(samples.length / ratio), output = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    const start = Math.floor(i * ratio), end = Math.max(start + 1, Math.floor((i + 1) * ratio))
    let sum = 0
    for (let j = start; j < end && j < samples.length; j++) sum += samples[j]!
    output[i] = sum / (end - start)
  }
  return output
}

/** Complete WAV segments; MediaRecorder timeslices are not independent MP4/WebM files. */
export function createVoiceSegmenter(rate: number, onSegment: (wave: ArrayBuffer) => void) {
  let frames: Float32Array[] = [], length = 0, silence = 0, voiced = false
  function flush(overlap = false) {
    const samples = new Float32Array(length)
    let offset = 0
    for (const part of frames) { samples.set(part, offset); offset += part.length }
    if (voiced && length >= rate * 0.1) onSegment(encodeVoiceWave(resample(samples, rate)))
    const tail = overlap ? samples.slice(-Math.floor(rate * 0.15)) : new Float32Array()
    frames = tail.length ? [tail] : []; length = tail.length; silence = 0; voiced = false
  }
  function push(frame: Float32Array) {
    if (!frame.length) return 0
    frames.push(frame); length += frame.length
    const energy = Math.sqrt(frame.reduce((sum, value) => sum + value * value, 0) / frame.length)
    if (energy >= 0.003) { voiced = true; silence = 0 } else silence += frame.length
    if (length >= rate * 4) flush(true)
    else if (length >= rate * 2 && silence >= rate * 0.64) flush()
    return Math.min(1, energy * 12)
  }
  return { push, flush: () => flush() }
}

interface VoicePcmCaptureOptions {
  signal: AbortSignal
  onSegment: (wave: ArrayBuffer) => void
  onLevel?: (level: number) => void
}

export async function captureVoicePcm(stream: MediaStream, options: VoicePcmCaptureOptions) {
  const { signal, onSegment, onLevel } = options
  const context = new AudioContext()
  let node: AudioWorkletNode | null = null, source: MediaStreamAudioSourceNode | null = null, gain: GainNode | null = null
  const segmenter = createVoiceSegmenter(context.sampleRate, onSegment)
  let flushDone: (() => void) | null = null, lastLevelAt = 0
  function close() {
    if (node) { node.port.onmessage = null; node.disconnect() }
    source?.disconnect(); gain?.disconnect()
    void context.close().catch(() => {})
    signal.removeEventListener('abort', close)
    onLevel?.(0)
    flushDone?.()
  }
  signal.addEventListener('abort', close, { once: true })
  try {
    await context.resume()
    await context.audioWorklet.addModule('/voice-capture-worklet.js')
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
    source = context.createMediaStreamSource(stream)
    node = new AudioWorkletNode(context, 'houban-voice-capture')
    gain = context.createGain(); gain.gain.value = 0
    node.port.onmessage = ({ data }) => {
      if (data.type === 'samples' && data.audio instanceof Float32Array) {
        const level = segmenter.push(data.audio), now = performance.now()
        if (now - lastLevelAt >= 80) { lastLevelAt = now; onLevel?.(level) }
      }
      if (data.type === 'flushed') flushDone?.()
    }
    source.connect(node); node.connect(gain); gain.connect(context.destination)
    return {
      close,
      async finish() {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 400)
          flushDone = () => { clearTimeout(timeout); resolve() }
          node?.port.postMessage('flush')
        })
        segmenter.flush(); close()
      },
    }
  } catch (error) { close(); throw error }
}
