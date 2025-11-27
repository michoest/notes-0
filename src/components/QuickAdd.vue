<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNotesStore } from '../stores/notes'
import VoiceButton from './VoiceButton.vue'

const router = useRouter()
const store = useNotesStore()

const selectedList = ref('inbox')

function handleResult(text) {
  if (text) {
    store.addItem(selectedList.value, text)
    // Navigate to the list to show the new item
    router.push(`/list/${selectedList.value}`)
  }
}

function handleCancel() {
  router.push(`/list/${store.settings.defaultListId || 'inbox'}`)
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-8">
    <div class="w-full max-w-sm">
      <!-- List Selector -->
      <div class="mb-8">
        <label class="block text-surface-400 text-sm mb-2">Add to list:</label>
        <select v-model="selectedList" class="input">
          <option v-for="list in store.lists" :key="list.id" :value="list.id">
            {{ list.name }}
          </option>
        </select>
      </div>

      <!-- Voice Recording -->
      <VoiceButton 
        @result="handleResult"
        @cancel="handleCancel"
        :auto-start="true"
      />
    </div>
  </div>
</template>
