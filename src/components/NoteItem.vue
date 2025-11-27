<script setup>
import { ref, nextTick } from 'vue'
import { useNotesStore } from '../stores/notes'

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
})

const store = useNotesStore()

const isEditing = ref(false)
const editText = ref('')
const editInput = ref(null)
const showActions = ref(false)

async function startEditing() {
  editText.value = props.item.text
  isEditing.value = true
  await nextTick()
  editInput.value?.focus()
  editInput.value?.select()
}

async function saveEdit() {
  const text = editText.value.trim()
  if (text && text !== props.item.text) {
    await store.updateItem(props.item.id, { text })
  }
  isEditing.value = false
}

function cancelEdit() {
  isEditing.value = false
  editText.value = ''
}

async function deleteItem() {
  if (confirm('Delete this item?')) {
    await store.deleteItem(props.item.id)
  }
}

function formatDate(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  // Less than 1 minute
  if (diff < 60000) return 'Just now'
  
  // Less than 1 hour
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000)
    return `${mins}m ago`
  }
  
  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}h ago`
  }
  
  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000)
    return `${days}d ago`
  }
  
  // Otherwise show date
  return date.toLocaleDateString()
}
</script>

<template>
  <div 
    :class="[
      'list-item group',
      item.completed && 'list-item-completed'
    ]"
    @mouseenter="showActions = true"
    @mouseleave="showActions = false"
  >
    <!-- Checkbox -->
    <button 
      @click="store.toggleItem(item.id)"
      :class="[
        'checkbox',
        item.completed && 'checkbox-checked'
      ]"
    >
      <svg 
        v-if="item.completed" 
        class="w-3 h-3 text-white" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
      </svg>
    </button>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <!-- Edit Mode -->
      <div v-if="isEditing" class="flex gap-2">
        <input
          ref="editInput"
          v-model="editText"
          @keyup.enter="saveEdit"
          @keyup.escape="cancelEdit"
          @blur="saveEdit"
          type="text"
          class="input flex-1 py-1 text-sm"
        />
      </div>

      <!-- View Mode -->
      <div v-else>
        <p 
          :class="[
            'text-surface-200 break-words',
            item.completed && 'line-through text-surface-500'
          ]"
        >
          {{ item.text }}
        </p>
        <p class="text-xs text-surface-500 mt-1">
          {{ formatDate(item.createdAt) }}
        </p>
      </div>
    </div>

    <!-- Actions -->
    <div 
      :class="[
        'flex items-center gap-1 transition-opacity',
        showActions ? 'opacity-100' : 'opacity-0 lg:opacity-0'
      ]"
    >
      <button 
        @click="startEditing"
        class="p-2 text-surface-500 hover:text-surface-200 transition-colors"
        title="Edit"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button 
        @click="deleteItem"
        class="p-2 text-surface-500 hover:text-red-400 transition-colors"
        title="Delete"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>

    <!-- Mobile touch actions (always visible on mobile) -->
    <div class="flex lg:hidden items-center gap-1">
      <button 
        @click="startEditing"
        class="p-2 text-surface-500 active:text-surface-200"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button 
        @click="deleteItem"
        class="p-2 text-surface-500 active:text-red-400"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  </div>
</template>
