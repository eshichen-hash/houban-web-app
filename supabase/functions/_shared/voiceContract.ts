/** Shared, provider-independent boundary. Never treat extracted places as confirmed. */
export const VOICE_TYPES = ['健走', '太極', '唱歌', '聊天', '球類', '健康活動', '舞蹈', '園藝', '棋藝', '手作', '攝影', '閱讀', '樂器', '志工服務', '寵物同樂'] as const
export interface VoiceExtraction {
  type: typeof VOICE_TYPES[number] | null
  isoDate: string | null
  startTime: string | null
  endTime: string | null
  parkQuery: string | null
  meeting: string | null
  spots: number | null
  cost: '免費' | '付費' | null
  costAmount: number | null
  items: string | null
  evidence: { type: string | null; date: string | null; time: string | null; park: string | null; meeting: string | null }
}

const nullableText = { type: ['string', 'null'] }
export const extractionSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    type: { type: ['string', 'null'], enum: [...VOICE_TYPES, null] },
    isoDate: nullableText, startTime: nullableText, endTime: nullableText,
    parkQuery: nullableText, meeting: nullableText,
    spots: { type: ['integer', 'null'] },
    cost: { type: ['string', 'null'], enum: ['免費', '付費', null] },
    costAmount: { type: ['integer', 'null'] }, items: nullableText,
    evidence: {
      type: 'object', additionalProperties: false,
      properties: { type: nullableText, date: nullableText, time: nullableText, park: nullableText, meeting: nullableText },
      required: ['type', 'date', 'time', 'park', 'meeting'],
    },
  },
  required: ['type', 'isoDate', 'startTime', 'endTime', 'parkQuery', 'meeting', 'spots', 'cost', 'costAmount', 'items', 'evidence'],
} as const

/** AI output is untrusted: only known fields, bounded text, and actual transcript evidence survive. */
export function normalizeExtraction(value: unknown, transcript: string): VoiceExtraction {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('語音整理格式不正確，請重試。')
  const raw = value as Record<string, unknown>
  const e = raw.evidence && typeof raw.evidence === 'object' ? raw.evidence as Record<string, unknown> : {}
  const text = (v: unknown, limit = 300) => typeof v === 'string' && v.trim() ? v.trim().slice(0, limit) : null
  const evidence = (key: string) => {
    const v = text(e[key])
    return v && transcript.includes(v) ? v : null
  }
  const date = evidence('date'), time = evidence('time'), park = evidence('park'), meeting = evidence('meeting'), type = evidence('type')
  const integer = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) ? v : null
  return {
    type: type && VOICE_TYPES.includes(raw.type as VoiceExtraction['type'] & string) ? raw.type as VoiceExtraction['type'] : null,
    isoDate: date ? text(raw.isoDate, 10) : null,
    startTime: time ? text(raw.startTime, 5) : null,
    endTime: time ? text(raw.endTime, 5) : null,
    parkQuery: park ? text(raw.parkQuery) : null,
    meeting: meeting ? text(raw.meeting) : null,
    spots: integer(raw.spots), cost: raw.cost === '免費' || raw.cost === '付費' ? raw.cost : null,
    costAmount: integer(raw.costAmount), items: text(raw.items, 1000),
    evidence: { type, date, time, park, meeting },
  }
}
