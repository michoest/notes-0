<script setup>
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useNotesStore } from '../stores/notes'
import { useAI } from '../composables/useAI'

const router = useRouter()
const route = useRoute()
const store = useNotesStore()
const { categorize } = useAI()

onMounted(async () => {
    const text = route.query.text
    const listId = route.query.list

    if (!text) {
        router.replace('/')
        return
    }

    if (listId && store.lists.find(l => l.id === listId)) {
        const list = store.lists.find(l => l.id === listId)
        await store.addItem(listId, decodeURIComponent(text))
        router.replace(`/list/${listId}`)

        // Show toast after navigation
        setTimeout(() => {
            window.showToast?.(`Added to ${list.name}`)
        }, 100)
    } else {
        // Use AI categorization with confirmation
        // Emit event to App.vue to show confirmation modal
        window.dispatchEvent(new CustomEvent('add-from-url', {
            detail: { text: decodeURIComponent(text) }
        }))
        router.replace('/')
    }
})
</script>

<template>
    <div class="min-h-screen flex items-center justify-center">
        <div class="text-surface-400">Processing...</div>
    </div>
</template>