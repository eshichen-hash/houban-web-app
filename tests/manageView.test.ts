import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { eventSeed } from '@/data/events'

const { updateEvent, updateStatus, createdEvents } = vi.hoisted(() => ({
  updateEvent: vi.fn(),
  updateStatus: vi.fn(),
  createdEvents: [] as unknown[],
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/services/eventService', () => ({
  updateEventInSupabase: updateEvent,
  updateEventStatusInSupabase: updateStatus,
}))
vi.mock('@/composables/useAppState', () => ({
  useAppState: () => ({
    state: { createdEvents },
    getEventParticipants: vi.fn().mockResolvedValue([]),
    checkInAttendee: vi.fn().mockResolvedValue(true),
  }),
}))

import ManageView from '@/views/ManageView.vue'

const ManageEventCardStub = {
  props: ['event'],
  emits: ['edit', 'attendees', 'change', 'end'],
  template: '<button class="open-edit" type="button" @click="$emit(\'edit\', event)">編輯</button>',
}

beforeEach(() => {
  createdEvents.splice(0, createdEvents.length, { ...eventSeed[0], park: { ...eventSeed[0].park } })
  updateEvent.mockReset()
  updateStatus.mockReset()
})

describe('活動管理儲存回饋', () => {
  it('等待伺服器確認後才顯示成功', async () => {
    let finishSave: ((saved: boolean) => void) | undefined
    updateEvent.mockReturnValue(new Promise<boolean>((resolve) => { finishSave = resolve }))
    const wrapper = mount(ManageView, { global: { stubs: { ManageEventCard: ManageEventCardStub } } })

    await wrapper.get('.open-edit').trigger('click')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('正在儲存…')
    expect(wrapper.text()).not.toContain('已儲存活動變更')

    finishSave?.(true)
    await flushPromises()

    expect(wrapper.text()).toContain('已儲存活動變更')
  })

  it('伺服器拒絕時留在編輯畫面並顯示失敗', async () => {
    updateEvent.mockResolvedValue(false)
    const wrapper = mount(ManageView, { global: { stubs: { ManageEventCard: ManageEventCardStub } } })

    await wrapper.get('.open-edit').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('活動變更尚未儲存')
    expect(wrapper.find('#edit-title').exists()).toBe(true)
  })
})
