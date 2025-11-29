<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useNotesStore } from '../stores/notes'
import NoteItem from './NoteItem.vue'
import VoiceButton from './VoiceButton.vue'

const route = useRoute()
const store = useNotesStore()

const newItemText = ref('')
const inputRef = ref(null)
const showVoiceRecorder = ref(false)

const list = computed(() =>
  store.lists.find(l => l.id === route.params.listId)
)

const showCompleted = computed(() =>
  store.listSettings[route.params.listId] ?? false
)

const items = computed(() =>
  store.items
    .filter(item =>
      item.listId === route.params.listId &&
      !item.deletedAt &&
      (showCompleted.value || !item.completed)
    )
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return b.createdAt - a.createdAt
    })
)

function toggleShowCompleted() {
  store.setShowCompleted(route.params.listId, !showCompleted.value)
}

const incompleteCount = computed(() =>
  items.value.filter(i => !i.completed).length
)

const completedCount = computed(() =>
  items.value.filter(i => i.completed).length
)

watch(() => route.params.listId, (newId) => {
  if (newId) {
    store.setCurrentList(newId)
  }
}, { immediate: true })

async function addItem() {
  const text = newItemText.value.trim()
  if (!text) return

  await store.addItem(route.params.listId, text)
  newItemText.value = ''
  await nextTick()
  inputRef.value?.focus()
}

function handleVoiceResult(text) {
  if (text) {
    store.addItem(route.params.listId, text)
  }
  showVoiceRecorder.value = false
}

async function clearCompleted() {
  if (confirm('Remove all completed items?')) {
    await store.clearCompleted(route.params.listId)
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto p-4 lg:p-8">
    <!-- List Header (desktop) -->
    <header class="hidden lg:block mb-8">
      <h1 class="font-display font-bold text-3xl text-surface-100 mb-2">
        {{ list?.name || 'Loading...' }}
      </h1>
      <p class="text-surface-400">
        <span v-if="incompleteCount > 0">{{ incompleteCount }} item{{ incompleteCount !== 1 ? 's' : '' }}</span>
        <span v-else>No items</span>
        <span v-if="completedCount > 0"> · {{ completedCount }} completed</span>
      </p>
    </header>

    <!-- Add Item Form -->
    <div class="card mb-6">
      <div class="p-4 flex gap-3">
        <input ref="inputRef" v-model="newItemText" @keyup.enter="addItem" type="text" placeholder="Add a new item..."
          class="input flex-1" />
        <button @click="addItem" :disabled="!newItemText.trim()" class="btn-primary px-4">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span class="hidden sm:inline">Add</span>
        </button>

        <!-- Desktop Voice Button -->
        <button @click="showVoiceRecorder = !showVoiceRecorder" :class="[
          'btn hidden lg:flex',
          showVoiceRecorder
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'btn-secondary'
        ]">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
      </div>

      <!-- Voice Recorder (desktop inline) -->
      <Transition name="slide">
        <div v-if="showVoiceRecorder" class="border-t border-surface-700 p-6">
          <VoiceButton @result="handleVoiceResult" @cancel="showVoiceRecorder = false" :compact="true" />
        </div>
      </Transition>
    </div>

    <!-- Items List -->
    <div v-if="items.length > 0" class="card">
      <TransitionGroup name="list" tag="div">
        <NoteItem v-for="item in items" :key="item.id" :item="item" />
      </TransitionGroup>

      <!-- Clear Completed -->
      <button v-if="completedCount > 0 && showCompleted" @click="clearCompleted" class="w-full p-3 text-sm text-surface-500 hover:text-red-400 
         hover:bg-red-500/10 transition-colors border-t border-surface-700/30">
        Clear {{ completedCount }} completed item{{ completedCount !== 1 ? 's' : '' }}
      </button>

      <!-- Show/Hide Completed Toggle -->
      <button v-if="completedCount > 0" @click="toggleShowCompleted" class="w-full p-3 text-sm text-surface-400 hover:text-surface-200 
         hover:bg-surface-700/30 transition-colors border-t border-surface-700/30">
        {{ showCompleted ? 'Hide' : 'Show' }} {{ completedCount }} completed item{{ completedCount !== 1 ? 's' : '' }}
      </button>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-16">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-800 flex items-center justify-center">
        <svg class="w-8 h-8 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <h3 class="font-display font-semibold text-surface-300 mb-1">No items yet</h3>
      <p class="text-surface-500 text-sm">Add your first item above or use voice input</p>
    </div>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.list-move {
  transition: transform 0.3s ease;
}
</style>
