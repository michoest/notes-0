<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useNotesStore } from '../stores/notes'
import ListIcon from './ListIcon.vue'

defineProps({
  open: Boolean
})

const emit = defineEmits(['close'])

const router = useRouter()
const route = useRoute()
const store = useNotesStore()

const isActive = (listId) => route.params.listId === listId

function navigateTo(listId) {
  router.push(`/list/${listId}`)
  emit('close')
}

function getItemCount(listId) {
  return store.items.filter(i => i.listId === listId && !i.completed).length
}
</script>

<template>
  <aside 
    :class="[
      'w-72 h-full bg-surface-900 border-r border-surface-800 flex flex-col',
      'transform transition-transform duration-300 ease-out',
      'lg:translate-x-0',
      open ? 'translate-x-0' : '-translate-x-full'
    ]"
  >
    <!-- Header -->
    <div class="p-6 border-b border-surface-800">
      <div class="flex items-center justify-between">
        <h1 class="font-display font-bold text-xl text-surface-100">
          Voice Notes
        </h1>
        <button 
          @click="$emit('close')"
          class="lg:hidden btn-ghost p-1"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Lists -->
    <nav class="flex-1 overflow-y-auto p-4 space-y-1">
      <button
        v-for="list in store.lists"
        :key="list.id"
        @click="navigateTo(list.id)"
        :class="[
          'nav-item w-full text-left group',
          isActive(list.id) && 'nav-item-active'
        ]"
      >
        <ListIcon :icon="list.icon" :color="list.color" class="w-5 h-5" />
        <span class="flex-1 truncate">{{ list.name }}</span>
        <span 
          v-if="getItemCount(list.id) > 0"
          class="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-700 text-surface-400"
        >
          {{ getItemCount(list.id) }}
        </span>
      </button>
    </nav>

    <!-- Footer Actions -->
    <div class="p-4 border-t border-surface-800 space-y-1">
      <button 
        @click="router.push('/settings'); $emit('close')"
        :class="[
          'nav-item w-full text-left',
          route.path === '/settings' && 'nav-item-active'
        ]"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>Settings</span>
      </button>
    </div>
  </aside>
</template>
