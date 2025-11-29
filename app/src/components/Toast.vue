<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  message: String,
  visible: Boolean
})

const emit = defineEmits(['hide'])

watch(() => props.visible, (val) => {
  if (val) {
    setTimeout(() => emit('hide'), 2500)
  }
})
</script>

<template>
  <Transition name="toast">
    <div 
      v-if="visible"
      class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50
             bg-surface-700 text-surface-100 px-4 py-3 rounded-xl
             shadow-lg flex items-center gap-2"
    >
      <svg class="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      {{ message }}
    </div>
  </Transition>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}
</style>