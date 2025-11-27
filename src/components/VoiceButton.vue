<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useNotesStore } from '../stores/notes'

const props = defineProps({
  autoStart: Boolean,
  compact: Boolean
})

const emit = defineEmits(['result', 'cancel'])

const store = useNotesStore()

// State
const isRecording = ref(false)
const isProcessing = ref(false)
const error = ref(null)
const transcript = ref('')
const audioLevel = ref(0)

// Audio
let mediaRecorder = null
let audioChunks = []
let audioContext = null
let analyser = null
let animationFrame = null

const hasApiKey = computed(() => !!store.settings.openaiApiKey)

onMounted(() => {
  if (props.autoStart && hasApiKey.value) {
    startRecording()
  }
})

onUnmounted(() => {
  stopRecording()
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
})

async function startRecording() {
  error.value = null
  transcript.value = ''
  audioChunks = []

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    })

    // Set up audio analysis for visual feedback
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    analyser = audioContext.createAnalyser()
    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)
    analyser.fftSize = 256

    // Start level monitoring
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    function updateLevel() {
      analyser.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length
      audioLevel.value = average / 255
      animationFrame = requestAnimationFrame(updateLevel)
    }
    updateLevel()

    // Set up media recorder
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4'
    })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.onstop = async () => {
      // Stop all tracks
      stream.getTracks().forEach(track => track.stop())
      
      // Stop audio analysis
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
      if (audioContext) {
        audioContext.close()
      }

      // Process audio
      await processAudio()
    }

    mediaRecorder.start(100) // Collect data every 100ms
    isRecording.value = true
  } catch (err) {
    console.error('Failed to start recording:', err)
    error.value = err.name === 'NotAllowedError' 
      ? 'Microphone access denied. Please allow microphone access and try again.'
      : 'Failed to access microphone. Please check your device settings.'
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording.value) {
    mediaRecorder.stop()
    isRecording.value = false
  }
}

async function processAudio() {
  if (audioChunks.length === 0) {
    error.value = 'No audio recorded'
    return
  }

  isProcessing.value = true
  error.value = null

  try {
    const audioBlob = new Blob(audioChunks, { 
      type: mediaRecorder.mimeType 
    })

    // Send to OpenAI Whisper API
    const formData = new FormData()
    formData.append('file', audioBlob, 'recording.webm')
    formData.append('model', 'whisper-1')
    formData.append('language', 'en') // Can be made configurable

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${store.settings.openaiApiKey}`
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `API error: ${response.status}`)
    }

    const data = await response.json()
    transcript.value = data.text

    if (data.text?.trim()) {
      emit('result', data.text.trim())
    } else {
      error.value = 'No speech detected. Please try again.'
    }
  } catch (err) {
    console.error('Transcription failed:', err)
    error.value = err.message || 'Failed to transcribe audio'
  } finally {
    isProcessing.value = false
  }
}

function handleCancel() {
  stopRecording()
  emit('cancel')
}

function toggleRecording() {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}
</script>

<template>
  <div :class="['flex flex-col items-center', compact ? 'gap-4' : 'gap-8']">
    <!-- No API Key Warning -->
    <div v-if="!hasApiKey" class="text-center">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
        <svg class="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 class="font-display font-semibold text-surface-200 mb-2">API Key Required</h3>
      <p class="text-surface-400 text-sm mb-4">
        Add your OpenAI API key in Settings to enable voice input.
      </p>
      <router-link to="/settings" class="btn-primary" @click="$emit('cancel')">
        Go to Settings
      </router-link>
    </div>

    <!-- Recording UI -->
    <template v-else>
      <!-- Visual Feedback -->
      <div class="relative">
        <!-- Pulse rings -->
        <div 
          v-if="isRecording"
          class="absolute inset-0 flex items-center justify-center"
        >
          <div 
            class="absolute w-32 h-32 rounded-full bg-accent/20 animate-ping"
            :style="{ transform: `scale(${1 + audioLevel * 0.5})` }"
          />
          <div 
            class="absolute w-24 h-24 rounded-full bg-accent/30 animate-pulse"
            :style="{ transform: `scale(${1 + audioLevel * 0.3})` }"
          />
        </div>

        <!-- Main Button -->
        <button
          @click="toggleRecording"
          :disabled="isProcessing"
          :class="[
            'relative z-10 w-20 h-20 rounded-full flex items-center justify-center',
            'transition-all duration-300 focus:outline-none focus:ring-4',
            isRecording 
              ? 'bg-red-500 text-white focus:ring-red-500/30 animate-recording' 
              : isProcessing
                ? 'bg-surface-700 text-surface-400'
                : 'bg-accent text-white hover:bg-accent-dark focus:ring-accent/30'
          ]"
        >
          <!-- Recording icon -->
          <svg v-if="isRecording" class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
          
          <!-- Processing spinner -->
          <svg v-else-if="isProcessing" class="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          
          <!-- Microphone icon -->
          <svg v-else class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
      </div>

      <!-- Status Text -->
      <div class="text-center">
        <p v-if="isRecording" class="text-surface-200 font-medium">
          Listening...
        </p>
        <p v-else-if="isProcessing" class="text-surface-400">
          Transcribing...
        </p>
        <p v-else class="text-surface-400">
          Tap to start recording
        </p>
      </div>

      <!-- Error -->
      <div v-if="error" class="text-center">
        <p class="text-red-400 text-sm">{{ error }}</p>
        <button 
          v-if="!isRecording && !isProcessing"
          @click="startRecording"
          class="btn-secondary mt-3"
        >
          Try Again
        </button>
      </div>

      <!-- Cancel Button -->
      <button 
        v-if="!compact"
        @click="handleCancel"
        class="btn-ghost text-surface-400"
      >
        Cancel
      </button>
    </template>
  </div>
</template>
