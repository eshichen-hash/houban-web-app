<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef } from 'vue'

const props = defineProps<{
  modelValue: string
  autoIntro: string
  disabled: boolean
  isCustom: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  reset: []
}>()

const editing = shallowRef(false)
const introInput = useTemplateRef<HTMLTextAreaElement>('introInput')
const status = computed(() => {
  if (props.disabled) return '尚待選擇活動'
  return props.isCustom ? '已自訂' : '依選擇自動產生'
})

async function toggleEditing() {
  if (props.disabled) return
  if (editing.value && !props.modelValue.trim()) {
    emit('reset')
    editing.value = false
    return
  }

  editing.value = !editing.value
  if (editing.value) {
    await nextTick()
    introInput.value?.focus()
    introInput.value?.select()
  }
}
</script>

<template>
  <div class="name-field-group name-field-group--intro">
    <div class="field-heading">
      <label for="event-intro"><strong>活動介紹</strong></label>
      <span id="event-intro-status">{{ status }}</span>
    </div>
    <textarea
      id="event-intro"
      ref="introInput"
      :value="modelValue"
      name="event-intro"
      rows="4"
      :readonly="!editing"
      :aria-readonly="!editing"
      aria-describedby="event-intro-status"
      autocomplete="off"
      :placeholder="autoIntro || '選定活動類型後，系統會依目前行程自動產生活動介紹。'"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <button class="button button--secondary name-edit" type="button" :disabled="disabled" @click="toggleEditing">
      {{ editing ? '完成' : '編輯' }}
    </button>
    <button v-if="isCustom && !editing" class="text-link name-reset" type="button" @click="emit('reset')">
      依目前選擇重新產生
    </button>
  </div>
</template>
