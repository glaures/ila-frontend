<template>
  <div>
    <input
        :value="displayValue"
        @input="onInput($event.target.value)"
        type="text"
        class="form-control"
        :placeholder="placeholder"
        :class="{ 'is-invalid': !isValid && modelValue }"
    />
    <div v-if="!isValid && modelValue" class="invalid-feedback">
      Bitte ein gültiges Datum im Format TT.MM.JJJJ eingeben.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: String,
  placeholder: {
    type: String,
    default: 'TT.MM.JJJJ'
  },
  required: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const normalizeDate = (str) => {
  const match = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!match) return str
  const [_, d, m, y] = match
  const dd = d.padStart(2, '0')
  const mm = m.padStart(2, '0')
  return `${dd}.${mm}.${y}`
}

const onInput = (val) => {
  const normalized = normalizeDate(val)
  emit('update:modelValue', normalized)
}

const displayValue = computed(() => props.modelValue)

const isValid = computed(() => {
  if (!props.modelValue && !props.required) return true
  return /^\d{2}\.\d{2}\.\d{4}$/.test(props.modelValue)
})
</script>

<style scoped>
.is-invalid {
  border-color: #dc3545;
}
</style>
