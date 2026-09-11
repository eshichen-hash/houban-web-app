/** Wire format shared by the browser and Edge: complete 16-kHz mono PCM WAV files. */
export const VOICE_SAMPLE_RATE = 16000
export function encodeVoiceWave(samples: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2), view = new DataView(buffer)
  const tag = (offset: number, text: string) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)) }
  tag(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); tag(8, 'WAVE'); tag(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, VOICE_SAMPLE_RATE, true); view.setUint32(28, VOICE_SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); tag(36, 'data'); view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, samples[i]!)) * 32767), true)
  return buffer
}
export function validateVoiceWave(buffer: ArrayBuffer) {
  if (buffer.byteLength < 44 + 3200 || buffer.byteLength > 44 + 6 * VOICE_SAMPLE_RATE * 2 || buffer.byteLength % 2) throw new Error('Invalid audio frame size')
  const v = new DataView(buffer), tag = (offset: number, value: string) => [...value].every((c, i) => v.getUint8(offset + i) === c.charCodeAt(0))
  if (!tag(0,'RIFF') || !tag(8,'WAVE') || !tag(12,'fmt ') || !tag(36,'data') || v.getUint32(4,true) !== buffer.byteLength - 8 || v.getUint32(16,true) !== 16 || v.getUint16(20,true) !== 1 || v.getUint16(22,true) !== 1 || v.getUint32(24,true) !== VOICE_SAMPLE_RATE || v.getUint32(28,true) !== VOICE_SAMPLE_RATE * 2 || v.getUint16(32,true) !== 2 || v.getUint16(34,true) !== 16 || v.getUint32(40,true) !== buffer.byteLength - 44) throw new Error('Invalid audio frame format')
  let sum = 0
  const samples = (buffer.byteLength - 44) / 2
  for (let i = 44; i < buffer.byteLength; i += 2) sum += (v.getInt16(i,true) / 32768) ** 2
  return { samples, silent: Math.sqrt(sum / samples) < 0.002 }
}
