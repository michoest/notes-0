import { ref } from 'vue'
import { db } from '../stores/db'

const PUBLIC_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const LOCAL_URL = 'http://192.168.178.97:3001'

let API_URL = PUBLIC_URL

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

async function detectApiUrl() {
    try {
        const controller = new AbortController()
        setTimeout(() => controller.abort(), 2000)

        await fetch(`${PUBLIC_URL}/api/workspaces/test`, {
            signal: controller.signal,
            mode: 'no-cors'
        })
        API_URL = PUBLIC_URL
    } catch {
        API_URL = LOCAL_URL
    }
    console.log('Using API:', API_URL)
}

const workspace = ref(null)
const deviceId = ref(null)
const lastSyncAt = ref(0)
const isOnline = ref(navigator.onLine)
const isSyncing = ref(false)
const onSyncComplete = ref(null)
let ws = null

export function useSync() {

    async function init() {
        await detectApiUrl()

        let stored = await db.settings.get('deviceId')
        if (!stored) {
            stored = { id: 'deviceId', value: crypto.randomUUID() }
            await db.settings.put(stored)
        }
        deviceId.value = stored.value

        const wsData = await db.settings.get('workspace')
        if (wsData) {
            workspace.value = wsData.value
            lastSyncAt.value = wsData.value.lastSyncAt || 0
            connectWebSocket()
        }

        window.addEventListener('online', () => {
            isOnline.value = true
            sync()
        })
        window.addEventListener('offline', () => {
            isOnline.value = false
        })

        if (workspace.value) {
            subscribeToPush()
        }
    }

    async function createWorkspace() {
        const res = await fetch(`${API_URL}/api/workspaces`, { method: 'POST' })
        if (!res.ok) throw new Error('Failed to create workspace')

        const data = await res.json()
        workspace.value = { id: data.id, code: data.code, lastSyncAt: 0 }
        await db.settings.put({ id: 'workspace', value: { ...workspace.value } })

        connectWebSocket()
        await subscribeToPush()  // Add this
        return data
    }

    async function joinWorkspace(code) {
        const res = await fetch(`${API_URL}/api/workspaces/${code.toUpperCase()}`)
        if (!res.ok) throw new Error('Workspace not found')

        const data = await res.json()
        workspace.value = { id: data.id, code: data.code, lastSyncAt: 0 }
        await db.settings.put({ id: 'workspace', value: { ...workspace.value } })

        connectWebSocket()
        await sync()
        await subscribeToPush()  // Add this
        return data
    }

    async function leaveWorkspace() {
        disconnectWebSocket()
        workspace.value = null
        await db.settings.delete('workspace')
        await db.lists.clear()
        await db.items.clear()
    }

    function connectWebSocket() {
        if (!workspace.value || ws) return

        const wsUrl = API_URL.replace('http', 'ws') + '/ws/' + workspace.value.id
        ws = new WebSocket(wsUrl)

        ws.onmessage = async (event) => {
            const data = JSON.parse(event.data)
            if (data.type === 'sync') {
                await applyChanges(data.changes)
                if (onSyncComplete.value) {
                    onSyncComplete.value()
                }
            }
        }

        ws.onclose = () => {
            ws = null
            if (workspace.value) {
                setTimeout(connectWebSocket, 5000)
            }
        }
    }

    function disconnectWebSocket() {
        if (ws) {
            ws.close()
            ws = null
        }
    }

    async function sync() {
        if (!workspace.value || !isOnline.value || isSyncing.value) return

        isSyncing.value = true

        try {
            const lists = await db.lists.toArray()
            const items = await db.items.toArray()

            const res = await fetch(`${API_URL}/api/sync/${workspace.value.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId: deviceId.value,
                    lastSyncAt: lastSyncAt.value,
                    lists: lists.filter(l => l.updatedAt > lastSyncAt.value),
                    items: items.filter(i => i.updatedAt > lastSyncAt.value)
                })
            })

            if (!res.ok) throw new Error('Sync failed')

            const data = await res.json()
            await applyChanges(data)

            lastSyncAt.value = data.syncedAt
            workspace.value.lastSyncAt = data.syncedAt
            await db.settings.put({ id: 'workspace', value: { ...workspace.value } })

        } catch (err) {
            console.error('Sync error:', err)
        } finally {
            isSyncing.value = false

            if (onSyncComplete.value) {
                onSyncComplete.value()
            }
        }
    }

    async function applyChanges({ lists = [], items = [] }) {
        for (const list of lists) {
            const existing = await db.lists.get(list.id)
            if (!existing || list.updatedAt > existing.updatedAt) {
                await db.lists.put(list)
            }
        }

        for (const item of items) {
            const existing = await db.items.get(item.id)
            if (!existing || item.updatedAt > existing.updatedAt) {
                await db.items.put(item)
            }
        }
    }

    async function subscribeToPush() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('Push not supported')
            return
        }

        try {
            const permission = await Notification.requestPermission()
            if (permission !== 'granted') {
                console.log('Notification permission denied')
                return
            }

            const registration = await navigator.serviceWorker.ready

            let subscription = await registration.pushManager.getSubscription()

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                })
            }

            // Send subscription to server
            await fetch(`${API_URL}/api/workspaces/${workspace.value.id}/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId: deviceId.value,
                    subscription: subscription.toJSON()
                })
            })

            console.log('Push subscription successful')
        } catch (err) {
            console.error('Push subscription failed:', err)
        }
    }

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4)
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
        const rawData = window.atob(base64)
        const outputArray = new Uint8Array(rawData.length)
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i)
        }
        return outputArray
    }

    return {
        workspace,
        deviceId,
        isOnline,
        isSyncing,
        onSyncComplete,  // add this
        init,
        createWorkspace,
        joinWorkspace,
        leaveWorkspace,
        sync,
        subscribeToPush
    }
}