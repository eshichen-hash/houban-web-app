import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import VoiceCaptureCard from '@/components/create/voice/VoiceCaptureCard.vue'

describe('錄音即時文字與失敗救援', () => {
  it('說話時將真實辨識文字放進可讀取的輸入框', () => {
    const wrapper = mount(VoiceCaptureCard, { props: {
      state: 'recording', elapsed: 5, error: '', unavailable: false,
      processing: false, canRetry: false, authorizing: false,
      transcript: '明天下午三點，在大安森林公園健走', liveStatus: 'listening',
    } })
    expect(wrapper.find('textarea[aria-label="語音辨識文字"]').exists()).toBe(true)
    expect(wrapper.find('textarea').element.value).toContain('大安森林公園')
    wrapper.unmount()
  })
  it('整理服務失敗仍可從文字／空白草稿繼續，不困在重錄循環', () => {
    const wrapper = mount(VoiceCaptureCard, { props: {
      state: 'stopped', elapsed: 5, error: '語音服務暫時無法使用', unavailable: false,
      processing: false, canRetry: true, authorizing: false, transcript: '', liveStatus: 'unavailable',
    } })
    expect(wrapper.text()).toContain('改用文字輸入')
    wrapper.unmount()
  })
})
