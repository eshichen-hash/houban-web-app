<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { nextTick, onBeforeUnmount, useTemplateRef, watch } from 'vue'
import type { EventType } from '@/data/events'

const props = defineProps<{
  open: boolean
  types: readonly EventType[]
  selected: EventType | '全部'
}>()

const emit = defineEmits<{
  close: []
  select: [value: EventType | '全部']
}>()

const panel = useTemplateRef<HTMLElement>('panel')
let previousFocus: HTMLElement | null = null
let previousBodyOverflow = ''

function choose(value: EventType | '全部') {
  emit('select', value)
  emit('close')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
    return
  }
  if (event.key !== 'Tab' || !panel.value) return

  const focusable = Array.from(panel.value.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
  const first = focusable[0]
  const last = focusable.at(-1)
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    await nextTick()
    panel.value?.focus()
    return
  }

  document.body.style.overflow = previousBodyOverflow
  await nextTick()
  previousFocus?.focus()
}, { immediate: true })

onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="open" class="responsive-dialog responsive-dialog--nested" role="presentation">
      <div class="responsive-dialog__backdrop" aria-hidden="true"></div>
      <section
        ref="panel"
        class="responsive-dialog__panel interest-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="interest-dialog-title"
        tabindex="-1"
        @keydown="handleKeydown"
      >
        <div class="responsive-dialog__handle" aria-hidden="true"></div>
        <header class="responsive-dialog__header">
          <div>
            <span class="eyebrow">單選</span>
            <h2 id="interest-dialog-title">查看全部 15 種活動</h2>
          </div>
          <button class="icon-button responsive-dialog__close" type="button" aria-label="關閉興趣選擇" @click="emit('close')">
            <X :size="22" aria-hidden="true" />
          </button>
        </header>

        <div class="interest-dialog__grid" role="group" aria-label="選擇一種活動興趣">
          <button class="interest-option" :class="{ 'is-selected': selected === '全部' }" type="button" :aria-pressed="selected === '全部'" @click="choose('全部')">
            全部
          </button>
          <button
            v-for="type in types"
            :key="type"
            class="interest-option"
            :class="{ 'is-selected': selected === type }"
            type="button"
            :aria-pressed="selected === type"
            @click="choose(type)"
          >
            {{ type }}
          </button>
        </div>
      </section>
      </div>
    </Transition>
  </Teleport>
</template>
