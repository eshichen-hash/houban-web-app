// Microphone samples only. No credentials, networking, transcription, or audio persistence.
class HoubanVoiceCapture extends AudioWorkletProcessor {
  constructor() {
    super()
    this.samples = new Float32Array(2048)
    this.offset = 0
    this.active = true
    this.port.onmessage = ({ data }) => {
      if (data === 'flush') {
        this.flush()
        this.active = false
        this.port.postMessage({ type: 'flushed' })
      }
    }
  }
  flush() {
    if (!this.offset) return
    const audio = this.samples.slice(0, this.offset)
    this.port.postMessage({ type: 'samples', audio }, [audio.buffer])
    this.offset = 0
  }
  process(inputs) {
    const input = inputs[0]?.[0]
    if (!this.active || !input) return true
    for (let i = 0; i < input.length; i++) {
      this.samples[this.offset++] = input[i]
      if (this.offset === this.samples.length) this.flush()
    }
    return true
  }
}
registerProcessor('houban-voice-capture', HoubanVoiceCapture)
