import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { effectScope } from 'vue'
import CreateView from '@/views/CreateView.vue'
import VoiceCaptureCard from '@/components/create/voice/VoiceCaptureCard.vue'
import ActivityDraftEditor from '@/components/create/voice/ActivityDraftEditor.vue'
import DraftFieldSheet from '@/components/create/voice/DraftFieldSheet.vue'
import { DRAFT_STORAGE_KEY, saveDraft, useVoiceActivityDraft } from '@/composables/useVoiceActivityDraft'

const { createEvent, push, processAudio } = vi.hoisted(() => ({ createEvent: vi.fn(), push: vi.fn(), processAudio: vi.fn() }))
vi.mock('@/composables/useAppState', () => ({ useAppState: () => ({ createEvent }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/services/liffService', () => ({ initLiff: vi.fn().mockResolvedValue(undefined), requireVerifiedLineToken: vi.fn().mockResolvedValue('test-token'), useLiff: () => ({ liffState: { profile: null } }) }))
vi.mock('@/services/voiceDraftService', () => ({ processActivityAudio: processAudio }))
vi.mock('@/services/activityImageService', () => ({ activityPreset: () => '/activity-presets/walking.webp', uploadActivityImage: vi.fn() }))

let wrapper: ReturnType<typeof mount>
beforeEach(() => { localStorage.clear(); createEvent.mockReset(); push.mockReset(); processAudio.mockReset() })
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = ''; localStorage.clear() })
async function open(valid = false) {
  if (valid) {
    const scope = effectScope()
    scope.run(() => {
      const d = useVoiceActivityDraft()
      Object.assign(d.form, { type: '健走', isoDate: '2099-09-12', time: '15:00', endTime: '16:00' })
      d.confirmPark({ name: '測試公園', address: '台北市測試路', district: '台北市', placeId: 'test-park' })
      d.form.meeting = '二號出口'; d.meetingConfirmed.value = true
      saveDraft(localStorage, 'guest', d.snapshot())
    })
    scope.stop()
  }
  wrapper = mount(CreateView, { attachTo: document.body, global: { stubs: { DraftPlacePicker: true } } })
  await flushPromises()
  if (valid) { await wrapper.findAll('button').find((b) => b.text() === '繼續草稿')!.trigger('click'); await flushPromises() }
}
describe('語音優先的建立活動流程', () => {
  it('正常入口只保留語音，不顯示舊三步驟與常駐文字入口', async () => {
    await open()
    expect(wrapper.text()).toContain('用說的，發起一場活動')
    expect(wrapper.text()).not.toContain('第一步')
    expect(wrapper.text()).not.toContain('改用文字輸入')
    expect(wrapper.find('.create-submit').exists()).toBe(false)
  })
  it('麥克風無法使用後進入同一個空草稿，主操作引導第一個缺少欄位', async () => {
    await open()
    wrapper.findComponent(VoiceCaptureCard).vm.$emit('text')
    await flushPromises()
    wrapper.findComponent(ActivityDraftEditor).vm.$emit('submit')
    await flushPromises()
    expect(createEvent).not.toHaveBeenCalled()
    const field = wrapper.findComponent(DraftFieldSheet)
    expect(field.props('field')).toBe('type')
    expect(document.body.textContent).toContain('請先選擇一種活動類型')
  })
  it('等待真正成功才跳轉，連按不能重複儲存', async () => {
    await open(true)
    let finish!: (event: unknown) => void
    createEvent.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const editor = wrapper.findComponent(ActivityDraftEditor)
    editor.vm.$emit('submit'); await flushPromises()
    expect(editor.props('saving')).toBe(true)
    editor.vm.$emit('submit'); await flushPromises()
    expect(createEvent).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
    finish({ title: '活動' }); await flushPromises()
    expect(push).toHaveBeenCalledWith('/manage')
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull()
  })
  it('儲存失敗保留資料、以同一 ID 重試，且不把圖片存成 Base64', async () => {
    await open(true)
    createEvent.mockRejectedValueOnce(new Error('網路異常，草稿已保留'))
    wrapper.findComponent(ActivityDraftEditor).vm.$emit('submit'); await flushPromises()
    expect(wrapper.text()).toContain('網路異常')
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toContain('二號出口')
    expect(push).not.toHaveBeenCalled()
    createEvent.mockResolvedValueOnce({ title: '活動' })
    wrapper.findComponent(ActivityDraftEditor).vm.$emit('submit'); await flushPromises()
    expect(createEvent.mock.calls[0][1]).toBe(createEvent.mock.calls[1][1])
    expect(createEvent.mock.calls[0][0].image).toBe('/activity-presets/walking.webp')
    expect(createEvent.mock.calls[0][0].costAmount).toBe(0)
  })
  it('底部面板只在確認後套用，取消不更動已辨識內容', async () => {
    await open(true)
    wrapper.findComponent(ActivityDraftEditor).vm.$emit('edit', 'spots'); await flushPromises()
    const field = wrapper.findComponent(DraftFieldSheet)
    await new DOMWrapper(document.querySelector('input[aria-label="活動名額"]')!).setValue(18)
    field.vm.$emit('close'); await flushPromises()
    expect(wrapper.findComponent(ActivityDraftEditor).props('rows').find((row: { key: string }) => row.key === 'spots')?.value).toBe('12 人')
  })
})
