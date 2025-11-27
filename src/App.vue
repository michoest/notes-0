<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useNotesStore } from './stores/notes'
import Sidebar from './components/Sidebar.vue'
import VoiceButton from './components/VoiceButton.vue'

const router = useRouter()
const route = useRoute()
const store = useNotesStore()

const sidebarOpen = ref(false)
const showVoiceModal = ref(false)

onMounted(async () => {
  await store.initialize()
})

// Close sidebar on route change (mobile)
watch(() => route.path, () => {
  sidebarOpen.value = false
})

function handleVoiceResult(text) {
  if (text && route.params.listId) {
    store.addItem(route.params.listId, text)
  }
  showVoiceModal.value = false
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Mobile Header -->
    <header class="lg:hidden flex items-center justify-between px-4 py-3 bg-surface-900/80 backdrop-blur-lg border-b border-surface-800 sticky top-0 z-40 safe-top">
      <button @click="sidebarOpen = true" class="btn-ghost p-2 -ml-2">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      <h1 class="font-display font-semibold text-lg">
        {{ store.currentList?.name || 'Voice Notes' }}
      </h1>
      
      <button @click="router.push('/settings')" class="btn-ghost p-2 -mr-2">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </header>

    <div class="flex-1 flex overflow-hidden">
      <!-- Sidebar Overlay (mobile) -->
      <Transition name="fade">
        <div 
          v-if="sidebarOpen" 
          @click="sidebarOpen = false"
          class="lg:hidden fixed inset-0 bg-black/60 z-40"
        />
      </Transition>

      <!-- Sidebar -->
      <Sidebar 
        :open="sidebarOpen" 
        @close="sidebarOpen = false"
        class="fixed lg:relative z-50 lg:z-auto"
      />

      <!-- Main Content -->
      <main class="flex-1 overflow-y-auto pb-24 lg:pb-8">
        <router-view v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </router-view>
      </main>
    </div>

    <!-- Voice Recording FAB (mobile) -->
    <div class="lg:hidden fixed bottom-6 right-6 z-30 safe-bottom">
      <button 
        @click="showVoiceModal = true"
        class="w-16 h-16 rounded-full bg-accent text-white shadow-lg shadow-accent/30 
               flex items-center justify-center transition-transform active:scale-95
               hover:bg-accent-dark focus:outline-none focus:ring-4 focus:ring-accent/30"
      >
        <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>
    </div>

    <!-- Voice Recording Modal -->
    <Transition name="fade">
      <div 
        v-if="showVoiceModal" 
        class="fixed inset-0 bg-surface-900/95 backdrop-blur-xl z-50 flex items-center justify-center"
      >
        <VoiceButton 
          @result="handleVoiceResult" 
          @cancel="showVoiceModal = false"
          :auto-start="true"
        />
      </div>
    </Transition>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
