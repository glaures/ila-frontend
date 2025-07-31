<template>
  <div>
    <input
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
        type="text"
        class="form-control"
        :placeholder="placeholder"
        :class="{ 'is-invalid': !isValid && modelValue }"
    />
    <div v-if="!isValid && modelValue" class="invalid-feedback">
      Bitte eine gültige Uhrzeit im Format HH:mm eingeben.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: String,
  placeholder: {
    type: String,
    default: 'HH:mm'
  },
  required: {
    type: Boolean,
    default: false
  }
})

const isValid = computed(() => {
  if (!props.modelValue && !props.required) return true
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(props.modelValue)
})
</script>

<style scoped>
.is-invalid {
  border-color: #dc3545;
}
</style>
