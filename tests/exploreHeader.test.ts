import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ExploreHeader from '@/components/explore/ExploreHeader.vue'

const globalStubs = {
  RouterLink: { template: '<a><slot /></a>' },
}

describe('探索頁位置摘要', () => {
  it('尚未設定位置時只顯示狀態，不再提供第二個定位按鈕', () => {
    const wrapper = mount(ExploreHeader, {
      global: { stubs: globalStubs },
      props: { scopeSummary: '', radius: 3 },
    })

    expect(wrapper.find('button.explore-header__scope').exists()).toBe(false)
    expect(wrapper.find('[role="status"]').text()).toContain('請在下方設定')
  })

  it('已有有效位置時，頁首摘要才成為可調整位置的按鈕', () => {
    const wrapper = mount(ExploreHeader, {
      global: { stubs: globalStubs },
      props: {
        scopeSummary: '台北市大安區',
        radius: 3,
        locationMode: 'current',
        locationSource: 'current',
      },
    })

    expect(wrapper.find('button.explore-header__scope').exists()).toBe(true)
    expect(wrapper.find('button.explore-header__scope').attributes('aria-label')).toContain('點擊調整')
  })
})
