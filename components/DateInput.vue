<template>
  <div>
    <input
        :value="isoValue"
        @input="onInput($event.target.value)"
        type="date"
        class="form-control"
        :required="required"
        :class="{ 'is-invalid': !isValid }"
    />
    <div v-if="!isValid" class="invalid-feedback">
      Bitte ein gültiges Datum wählen.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: String,
  required: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

/** "dd.MM.yyyy" -> "yyyy-MM-dd" (leer, wenn nicht parsebar) */
const germanToIso = (val) => {
  const match = (val || '').match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!match) return ''
  const [, d, m, y] = match
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

/** "yyyy-MM-dd" -> "dd.MM.yyyy" (leer, wenn nicht parsebar) */
const isoToGerman = (val) => {
  const match = (val || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ''
  const [, y, m, d] = match
  return `${d}.${m}.${y}`
}

const isoValue = computed(() => germanToIso(props.modelValue))

const onInput = (val) => {
  emit('update:modelValue', isoToGerman(val))
}

const isValid = computed(() => {
  if (!props.modelValue) return !props.required
  return /^\d{2}\.\d{2}\.\d{4}$/.test(props.modelValue)
})
</script>

<style scoped>
.is-invalid {
  border-color: #dc3545;
}
</style>
