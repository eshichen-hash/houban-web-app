/** Merge only the small repeated boundary introduced by a 150-ms audio overlap. */
export function appendVoiceTranscript(previous: string, incoming: string) {
  const next = incoming.trim()
  if (!next) return previous
  for (let length = Math.min(12, previous.length, next.length); length >= 2; length--) {
    if (previous.endsWith(next.slice(0,length))) return (previous + next.slice(length)).slice(0,5000)
  }
  return (previous + next).slice(0,5000)
}
