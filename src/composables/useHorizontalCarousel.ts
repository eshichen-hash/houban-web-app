import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  readonly,
  shallowRef,
  watch,
  type ShallowRef,
} from 'vue'

interface UseHorizontalCarouselOptions {
  itemSelector?: string
}

export function useHorizontalCarousel(
  track: Readonly<ShallowRef<HTMLElement | null>>,
  options: UseHorizontalCarouselOptions = {},
) {
  const { itemSelector = '[data-carousel-item]' } = options
  const currentIndex = shallowRef(0)
  const itemCount = shallowRef(0)
  const canPrevious = computed(() => currentIndex.value > 0)
  const canNext = computed(() => currentIndex.value < itemCount.value - 1)

  let observedTrack: HTMLElement | null = null
  let resizeObserver: ResizeObserver | null = null
  let mutationObserver: MutationObserver | null = null
  let animationFrame = 0

  function getItems(element = observedTrack) {
    return element ? Array.from(element.querySelectorAll<HTMLElement>(itemSelector)) : []
  }

  function getSnapPosition(element: HTMLElement, item: HTMLElement) {
    const paddingLeft = Number.parseFloat(window.getComputedStyle(element).paddingLeft) || 0
    return Math.max(0, item.offsetLeft - paddingLeft)
  }

  function syncState() {
    animationFrame = 0
    const element = observedTrack
    const items = getItems(element)
    itemCount.value = items.length

    if (!element || !items.length) {
      currentIndex.value = 0
      return
    }

    currentIndex.value = items.reduce((closestIndex, item, index) => {
      const closestDistance = Math.abs(getSnapPosition(element, items[closestIndex]) - element.scrollLeft)
      const itemDistance = Math.abs(getSnapPosition(element, item) - element.scrollLeft)
      return itemDistance < closestDistance ? index : closestIndex
    }, 0)
  }

  function scheduleSync() {
    if (animationFrame) return
    animationFrame = window.requestAnimationFrame(syncState)
  }

  function move(direction: -1 | 1) {
    const element = observedTrack
    const items = getItems(element)
    if (!element || !items.length) return

    syncState()
    const targetIndex = Math.max(0, Math.min(items.length - 1, currentIndex.value + direction))
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    element.scrollTo({
      left: getSnapPosition(element, items[targetIndex]),
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }

  function detach() {
    observedTrack?.removeEventListener('scroll', scheduleSync)
    resizeObserver?.disconnect()
    mutationObserver?.disconnect()
    resizeObserver = null
    mutationObserver = null
    observedTrack = null
  }

  function attach(element: HTMLElement | null) {
    if (element === observedTrack) {
      scheduleSync()
      return
    }

    detach()
    observedTrack = element
    if (!element) {
      scheduleSync()
      return
    }

    element.addEventListener('scroll', scheduleSync, { passive: true })
    resizeObserver = new ResizeObserver(scheduleSync)
    resizeObserver.observe(element)
    mutationObserver = new MutationObserver(scheduleSync)
    mutationObserver.observe(element, { childList: true })
    scheduleSync()
  }

  onMounted(async () => {
    await nextTick()
    attach(track.value)
  })
  watch(track, attach, { flush: 'post', immediate: true })

  onBeforeUnmount(() => {
    detach()
    if (animationFrame) window.cancelAnimationFrame(animationFrame)
  })

  return {
    currentIndex: readonly(currentIndex),
    itemCount: readonly(itemCount),
    canPrevious,
    canNext,
    move,
  }
}
