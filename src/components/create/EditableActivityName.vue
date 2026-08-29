<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef } from 'vue'

const props = defineProps<{
  modelValue: string
  autoName: string
  disabled: boolean
  isCustom: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  reset: []
}>()

const editing = shallowRef(false)
const nameInput = useTemplateRef<HTMLTextAreaElement>('nameInput')
const status = computed(() => {
  if (props.disabled) return '尚待選擇活動'
  return props.isCustom ? '已自訂' : '依行程自動產生'
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
    nameInput.value?.focus()
    nameInput.value?.select()
  }
}
</script>

<template>
  <div class="name-field-group">
    <div class="field-heading">
      <label for="event-name"><strong>活動名稱</strong></label>
      <span id="event-name-status">{{ status }}</span>
    </div>
    <textarea
      id="event-name"
      ref="nameInput"
      :value="modelValue"
      rows="2"
      :readonly="!editing"
      :aria-readonly="!editing"
      aria-describedby="event-name-status"
      placeholder="選擇活動後自動產生"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <button class="button button--secondary name-edit" type="button" :disabled="disabled" @click="toggleEditing">{{ editing ? '完成' : '編輯' }}</button>
    <button v-if="isCustom && !editing" class="text-link name-reset" type="button" @click="emit('reset')">依目前行程重新產生</button>
  </div>
</template>
