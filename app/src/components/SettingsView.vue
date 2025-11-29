<script setup>
import QRCode from 'qrcode'
import { ref, onMounted, computed, watch } from 'vue'
import { useNotesStore } from '../stores/notes'
import { useSync } from '../composables/useSync'

const store = useNotesStore()
const { workspace, leaveWorkspace, isOnline, isSyncing, sync } = useSync()

const apiKey = ref('')
const showApiKey = ref(false)
const saving = ref(false)
const saved = ref(false)
const qrCodeUrl = ref('')

async function generateQR() {
  if (workspace.value?.code) {
    qrCodeUrl.value = await QRCode.toDataURL(workspace.value.code, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    })
  }
}

watch(() => workspace.value?.code, generateQR, { immediate: true })

watch(
  () => store.settings.openaiApiKey,
  (newVal) => {
    if (newVal && !apiKey.value) {
      apiKey.value = newVal
    }
  },
  { immediate: true }
)

async function handleLeave() {
  if (confirm('Leave workspace? Your local data will be cleared.')) {
    await leaveWorkspace()
    location.reload()
  }
}

async function saveSettings() {
  saving.value = true
  saved.value = false

  await store.saveSettings({
    openaiApiKey: apiKey.value.trim()
  })

  saving.value = false
  saved.value = true

  setTimeout(() => {
    saved.value = false
  }, 2000)
}

const isValidKey = computed(() => {
  return apiKey.value.trim().startsWith('sk-')
})

const pwaInstalled = ref(false)
let deferredPrompt = null

onMounted(() => {
  // Check if already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    pwaInstalled.value = true
  }

  // Listen for install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
  })
})

async function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      pwaInstalled.value = true
    }
    deferredPrompt = null
  }
}

async function clearAllData() {
  if (confirm('This will delete all your lists and items. Are you sure?')) {
    // Clear IndexedDB
    const { db } = await import('../stores/db')
    await db.items.clear()
    await db.lists.clear()
    await db.settings.clear()

    // Reinitialize
    await store.initialize()

    alert('All data cleared.')
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto p-4 lg:p-8">
    <header class="mb-8">
      <h1 class="font-display font-bold text-3xl text-surface-100 mb-2">Settings</h1>
      <p class="text-surface-400">Configure your Voice Notes app</p>
    </header>

    <!-- API Key Section -->
    <section class="card p-6 mb-6">
      <h2 class="font-display font-semibold text-lg text-surface-200 mb-4">
        OpenAI API Key
      </h2>
      <p class="text-surface-400 text-sm mb-4">
        Required for voice transcription. Your API key is stored locally and never sent to our servers.
      </p>

      <div class="space-y-4">
        <div class="relative">
          <input v-model="apiKey" :type="showApiKey ? 'text' : 'password'" placeholder="sk-..." class="input pr-12" />
          <button @click="showApiKey = !showApiKey"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300">
            <svg v-if="showApiKey" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
            <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>

        <div class="flex items-center gap-3">
          <button @click="saveSettings" :disabled="saving || !apiKey.trim()" class="btn-primary">
            <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <svg v-else-if="saved" class="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ saved ? 'Saved!' : saving ? 'Saving...' : 'Save' }}
          </button>

          <span v-if="apiKey && !isValidKey" class="text-yellow-500 text-sm">
            API key should start with "sk-"
          </span>
        </div>

        <a href="https://platform.openai.com/api-keys" target="_blank"
          class="inline-flex items-center gap-1 text-accent text-sm hover:underline">
          Get an API key from OpenAI
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </section>

    <!-- Workspace Section -->
    <section class="card p-6 mb-6">
      <h2 class="font-display font-semibold text-lg text-surface-200 mb-4">
        Workspace
      </h2>

      <div class="flex items-center gap-3 mb-4">
        <div :class="['w-3 h-3 rounded-full', isOnline ? 'bg-green-500' : 'bg-red-500']" />
        <span class="text-surface-400 text-sm">
          {{ isOnline ? (isSyncing ? 'Syncing...' : 'Connected') : 'Offline' }}
        </span>
      </div>

      <div class="bg-surface-900 rounded-xl p-4 mb-4">
        <p class="text-surface-400 text-sm mb-1">Workspace Code</p>
        <p class="font-mono text-2xl tracking-widest text-surface-100">
          {{ workspace?.code }}
        </p>
        <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="QR Code" class="mx-auto rounded-lg" />
      </div>

      <p class="text-surface-400 text-sm mb-4">
        Share this code with other devices to sync your lists.
      </p>

      <div class="flex gap-3">
        <button @click="sync" :disabled="!isOnline || isSyncing" class="btn-secondary flex-1">
          Sync Now
        </button>
        <button @click="handleLeave" class="btn bg-red-500/20 text-red-400 hover:bg-red-500/30">
          Leave
        </button>
      </div>
    </section>

    <!-- Install PWA Section -->
    <section class="card p-6 mb-6">
      <h2 class="font-display font-semibold text-lg text-surface-200 mb-4">
        Install App
      </h2>

      <div v-if="pwaInstalled" class="flex items-center gap-3 text-green-400">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>App installed!</span>
      </div>

      <div v-else>
        <p class="text-surface-400 text-sm mb-4">
          Install Voice Notes on your device for quick access and offline use.
        </p>

        <div class="space-y-3">
          <button v-if="deferredPrompt" @click="installPWA" class="btn-primary">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Install App
          </button>

          <div class="text-surface-400 text-sm space-y-2">
            <p><strong class="text-surface-300">On iOS:</strong> Tap the Share button in Safari, then "Add to Home
              Screen"</p>
            <p><strong class="text-surface-300">On Android:</strong> Tap the menu button in Chrome, then "Install app"
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- iOS Shortcuts Section -->
    <section class="card p-6 mb-6">
      <h2 class="font-display font-semibold text-lg text-surface-200 mb-4">
        iOS Shortcuts
      </h2>
      <p class="text-surface-400 text-sm mb-4">
        Use iOS Shortcuts to quickly open Voice Notes or jump to a specific list.
      </p>

      <div class="bg-surface-900 rounded-xl p-4 space-y-2 text-sm font-mono">
        <p class="text-surface-300">Open app:</p>
        <code class="text-accent">https://notes.michoest.com/</code>

        <p class="text-surface-300 mt-4">Quick add (voice):</p>
        <code class="text-accent">https://notes.michoest.com/#/quick-add</code>

        <p class="text-surface-300 mt-4">Open specific list:</p>
        <code class="text-accent">https://notes.michoest.com/#/list/shopping</code>
      </div>
    </section>

    <!-- Data Management -->
    <section class="card p-6">
      <h2 class="font-display font-semibold text-lg text-surface-200 mb-4">
        Data Management
      </h2>
      <p class="text-surface-400 text-sm mb-4">
        All your data is stored locally on this device.
      </p>

      <button @click="clearAllData" class="btn bg-red-500/20 text-red-400 hover:bg-red-500/30 focus:ring-red-500">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Clear All Data
      </button>
    </section>

    <!-- About -->
    <footer class="mt-8 text-center text-surface-500 text-sm">
      <p>Voice Notes v1.0.0</p>
      <p class="mt-1">Made with Vue 3, Pinia & OpenAI Whisper</p>
    </footer>
  </div>
</template>
