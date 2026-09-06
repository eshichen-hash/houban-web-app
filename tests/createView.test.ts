import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { eventSeed } from '@/data/events'
import CreateView from '@/views/CreateView.vue'
import ParkAutocomplete from '@/components/ParkAutocomplete.vue'

const { createEvent, push } = vi.hoisted(() => ({ createEvent: vi.fn(), push: vi.fn() }))
vi.mock('@/composables/useAppState', () => ({ useAppState: () => ({ createEvent }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

let wrapper: ReturnType<typeof mount>
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-06T08:00:00+08:00'))
  createEvent.mockReset(); push.mockReset()
  wrapper = mount(CreateView, { attachTo: document.body, global: { stubs: { ParkAutocomplete: true, AdvancedActivitySettings: true } } })
})
afterEach(() => { wrapper.unmount(); document.body.innerHTML = ''; vi.useRealTimers() })

async function fillForm() {
  await wrapper.get('.activity-type-btn').trigger('click')
  wrapper.findComponent(ParkAutocomplete).vm.$emit('select', { name: '測試公園', address: '台中市測試路', district: '台中市', placeId: 'test-park', lat: 24.1, lng: 120.6 })
  await flushPromises()
}

describe('建立活動送出介面', () => {
  it('未填寫時顯示可聚焦摘要與欄位錯誤，不呼叫儲存', async () => {
    await wrapper.get('.create-submit').trigger('click')
    await flushPromises()
    expect(createEvent).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain('請確認以下欄位')
    expect(document.activeElement).toBe(wrapper.get('[role="alert"]').element)
    expect(wrapper.get('#create-type-error').text()).toContain('活動類型')
    await wrapper.get('a[href="#create-type-choice"]').trigger('click')
    expect(document.activeElement).toBe(wrapper.get('#create-type-choice').element)
  })

  it('等待真正儲存成功再跳轉，送出期间只呼叫一次', async () => {
    await fillForm()
    let finish!: (value: typeof eventSeed[number]) => void
    createEvent.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    await wrapper.get('.create-submit').trigger('click')
    expect(wrapper.get('.create-submit').text()).toContain('正在儲存')
    expect(wrapper.get('fieldset.create-fields').attributes('disabled')).toBeDefined()
    await wrapper.get('.create-submit').trigger('click')
    expect(createEvent).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
    finish(eventSeed[0]); await flushPromises()
    expect(push).toHaveBeenCalledWith('/manage')
  })

  it('已修正表單放置到開始時間之後，仍會顯示新的欄位錯誤', async () => {
    await wrapper.get('.create-submit').trigger('click')
    await fillForm()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    vi.setSystemTime(new Date('2026-09-06T10:00:00+08:00'))
    await wrapper.get('.create-submit').trigger('click'); await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('開始時間已過')
    expect(wrapper.get('#create-start-time-error').text()).toContain('開始時間已過')
    expect(createEvent).not.toHaveBeenCalled()
  })

  it('失敗保留表單，可使用相同 ID 重試', async () => {
    await fillForm()
    createEvent.mockRejectedValueOnce(new Error('網路異常，表單已保留'))
    await wrapper.get('.create-submit').trigger('click'); await flushPromises()
    expect(push).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain('網路異常')
    expect(wrapper.get('.selected-google-park-text').text()).toContain('測試公園')
    expect(wrapper.get('.create-submit').text()).toContain('重試')
    createEvent.mockResolvedValueOnce(eventSeed[0])
    await wrapper.get('.create-submit').trigger('click'); await flushPromises()
    expect(createEvent.mock.calls[0][1]).toBe(createEvent.mock.calls[1][1])
    expect(push).toHaveBeenCalledOnce()
  })
})
