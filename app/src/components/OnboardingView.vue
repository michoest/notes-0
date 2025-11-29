<script setup>
import { ref, onUnmounted } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'
import { useSync } from '../composables/useSync'

const emit = defineEmits(['complete'])

const { createWorkspace, joinWorkspace } = useSync()

const mode = ref(null)
const joinCode = ref('')
const isLoading = ref(false)
const error = ref(null)
let scanner = null
const scanning = ref(false)

async function startScanner() {
  mode.value = 'scan'
  scanning.value = true
  error.value = null

  await new Promise(resolve => setTimeout(resolve, 100)) // Wait for DOM

  try {
    scanner = new Html5Qrcode('qr-reader')
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (code) => {
        await stopScanner()
        joinCode.value = code
        alert('Scanned: "' + code + '"')
        handleJoin()
      },
      () => { } // Ignore errors during scanning
    )
  } catch (err) {
    error.value = 'Could not access camera'
    scanning.value = false
    mode.value = null
  }
}

async function stopScanner() {
  scanning.value = false
  if (scanner) {
    try {
      await scanner.stop()
      scanner.clear()
    } catch (e) { }
    scanner = null
  }
}

onUnmounted(() => {
  stopScanner()
})

async function handleCreate() {
  isLoading.value = true
  error.value = null
  try {
    await createWorkspace()
    emit('complete')
  } catch (err) {
    error.value = 'Failed to create workspace'
  } finally {
    isLoading.value = false
  }
}

async function handleJoin() {
  if (joinCode.value.length !== 8) {
    error.value = 'Code must be 8 characters'
    return
  }

  isLoading.value = true
  error.value = null
  try {
    await joinWorkspace(joinCode.value)
    emit('complete')
  } catch (err) {
    error.value = 'Workspace not found'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent flex items-center justify-center">
          <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h1 class="font-display font-bold text-2xl text-surface-100">Voice Notes</h1>
        <p class="text-surface-400 mt-1">Sync across all your devices</p>
      </div>

      <div v-if="!mode" class="space-y-3">
        <button @click="mode = 'create'" class="btn-primary w-full py-4">
          Create New Workspace
        </button>
        <button @click="mode = 'join'" class="btn-secondary w-full py-4">
          Enter Code Manually
        </button>
        <button @click="startScanner" class="btn-secondary w-full py-4">
          <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          Scan QR Code
        </button>
      </div>

      <div v-else-if="mode === 'create'" class="card p-6">
        <h2 class="font-display font-semibold text-lg text-surface-100 mb-2">
          Create Workspace
        </h2>
        <p class="text-surface-400 text-sm mb-6">
          Start fresh with a new workspace. You can invite other devices later.
        </p>

        <div class="space-y-3">
          <button @click="handleCreate" :disabled="isLoading" class="btn-primary w-full">
            {{ isLoading ? 'Creating...' : 'Create Workspace' }}
          </button>
          <button @click="mode = null" class="btn-ghost w-full">
            Back
          </button>
        </div>

        <p v-if="error" class="text-red-400 text-sm mt-4">{{ error }}</p>
      </div>

      <div v-else-if="mode === 'join'" class="card p-6">
        <h2 class="font-display font-semibold text-lg text-surface-100 mb-2">
          Join Workspace
        </h2>
        <p class="text-surface-400 text-sm mb-4">
          Enter the 8-character code from another device.
        </p>

        <input v-model="joinCode" type="text" placeholder="ABCD1234" maxlength="8"
          class="input text-center text-xl tracking-widest uppercase mb-4" @keyup.enter="handleJoin" />

        <p v-if="error" class="text-red-400 text-sm mb-4">{{ error }}</p>

        <div class="space-y-3">
          <button @click="handleJoin" :disabled="isLoading || joinCode.length !== 8" class="btn-primary w-full">
            {{ isLoading ? 'Joining...' : 'Join Workspace' }}
          </button>
          <button @click="mode = null; joinCode = ''; error = null" class="btn-ghost w-full">
            Back
          </button>
        </div>
      </div>
      <div v-else-if="mode === 'scan'" class="card p-6">
        <h2 class="font-display font-semibold text-lg text-surface-100 mb-4">
          Scan QR Code
        </h2>

        <div id="qr-reader" class="rounded-lg overflow-hidden mb-4"></div>

        <p v-if="error" class="text-red-400 text-sm mb-4">{{ error }}</p>

        <button @click="stopScanner(); mode = null" class="btn-ghost w-full">
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>