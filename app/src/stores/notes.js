import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from './db'
import { useSync } from '../composables/useSync'

export const useNotesStore = defineStore('notes', () => {
  // State
  const listSettings = ref({})
  const lists = ref([])
  const items = ref([])
  const settings = ref({
    openaiApiKey: '',
    defaultListId: 'inbox'
  })
  const currentListId = ref('inbox')
  const isLoading = ref(true)

  // Getters
  const currentList = computed(() =>
    lists.value.find(l => l.id === currentListId.value)
  )

  const currentItems = computed(() =>
    items.value
      .filter(item => item.listId === currentListId.value && !item.deletedAt)
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1
        return b.createdAt - a.createdAt
      })
  )

  const itemsByList = computed(() => {
    const grouped = {}
    lists.value.forEach(list => {
      grouped[list.id] = items.value.filter(item => item.listId === list.id)
    })
    return grouped
  })

  const hasApiKey = computed(() => !!settings.value.openaiApiKey)

  // Actions
  async function initialize() {
    isLoading.value = true
    try {
      // Load settings
      const savedSettings = await db.settings.get('main')
      if (savedSettings) {
        settings.value = { ...settings.value, ...savedSettings.value }
      }

      // Load lists
      const savedLists = await db.lists.toArray()
      if (savedLists.length === 0) {
        // Create default lists
        const defaultLists = [
          { id: 'inbox', name: 'Inbox', icon: 'inbox', color: '#64748b', order: 0, updatedAt: Date.now() },
          { id: 'todo', name: 'To-Do', icon: 'check-circle', color: '#22c55e', order: 1, updatedAt: Date.now() },
          { id: 'shopping', name: 'Shopping', icon: 'shopping-cart', color: '#f97316', order: 2, updatedAt: Date.now() },
          { id: 'ideas', name: 'Ideas', icon: 'lightbulb', color: '#eab308', order: 3, updatedAt: Date.now() },
        ]
        await db.lists.bulkAdd(defaultLists)
        lists.value = defaultLists
      } else {
        lists.value = savedLists.sort((a, b) => a.order - b.order)
      }

      // Load items
      items.value = await db.items.toArray()
      await loadListSettings()
    } catch (error) {
      console.error('Failed to initialize store:', error)
    } finally {
      isLoading.value = false
    }
  }

  function setCurrentList(listId) {
    currentListId.value = listId
  }

  async function addItem(listId, text) {
    const item = {
      id: crypto.randomUUID(),
      listId,
      text,
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null
    }

    await db.items.add(item)
    items.value.push(item)

    const { sync } = useSync()
    sync()

    return item
  }

  async function updateItem(itemId, updates) {
    const item = items.value.find(i => i.id === itemId)
    if (!item) return

    const updatedItem = {
      ...item,
      ...updates,
      updatedAt: Date.now()
    }

    await db.items.put({ ...updatedItem })
    const index = items.value.findIndex(i => i.id === itemId)
    items.value[index] = updatedItem

    const { sync } = useSync()
    sync()
  }

  async function toggleItem(itemId) {
    const item = items.value.find(i => i.id === itemId)
    if (item) {
      await updateItem(itemId, { completed: !item.completed })
    }
  }

  async function deleteItem(itemId) {
    const item = items.value.find(i => i.id === itemId)
    if (!item) return

    const deletedItem = {
      ...item,
      deletedAt: Date.now(),
      updatedAt: Date.now()
    }

    await db.items.put({ ...deletedItem })
    items.value = items.value.filter(i => i.id !== itemId)

    const { sync } = useSync()
    sync()
  }

  async function moveItem(itemId, newListId) {
    await updateItem(itemId, { listId: newListId })
  }

  async function addList(name, icon = 'folder', color = '#64748b') {
    const list = {
      id: crypto.randomUUID(),
      name,
      icon,
      color,
      order: lists.value.length,
      updatedAt: Date.now()
    }

    await db.lists.add(list)
    lists.value.push(list)

    const { sync } = useSync()
    sync()

    return list
  }

  async function updateList(listId, updates) {
    const list = lists.value.find(l => l.id === listId)
    if (!list) return

    const updatedList = { ...list, ...updates }
    await db.lists.put(updatedList)
    const index = lists.value.findIndex(l => l.id === listId)
    lists.value[index] = updatedList
  }

  async function deleteList(listId) {
    // Don't delete default lists
    if (['inbox', 'todo', 'shopping', 'ideas'].includes(listId)) return

    // Move all items to inbox
    const listItems = items.value.filter(i => i.listId === listId)
    for (const item of listItems) {
      await moveItem(item.id, 'inbox')
    }

    await db.lists.delete(listId)
    lists.value = lists.value.filter(l => l.id !== listId)
  }

  async function saveSettings(newSettings) {
    settings.value = { ...settings.value, ...newSettings }
    await db.settings.put({ id: 'main', value: { ...settings.value } })
  }

  async function clearCompleted(listId) {
    const completedItems = items.value.filter(
      i => i.listId === listId && i.completed
    )

    for (const item of completedItems) {
      await db.items.delete(item.id)
    }

    items.value = items.value.filter(
      i => !(i.listId === listId && i.completed)
    )
  }

  async function getShowCompleted(listId) {
    const setting = await db.settings.get(`showCompleted_${listId}`)
    return setting?.value ?? false
  }

  async function setShowCompleted(listId, show) {
    listSettings.value[listId] = show
    await db.settings.put({ id: `showCompleted_${listId}`, value: show })
  }

  async function loadListSettings() {
    const allSettings = await db.settings.toArray()
    for (const s of allSettings) {
      if (s.id.startsWith('showCompleted_')) {
        const listId = s.id.replace('showCompleted_', '')
        listSettings.value[listId] = s.value
      }
    }
  }

  return {
    // State
    lists,
    items,
    settings,
    currentListId,
    isLoading,
    // Getters
    currentList,
    currentItems,
    itemsByList,
    hasApiKey,
    // Actions
    initialize,
    setCurrentList,
    addItem,
    updateItem,
    toggleItem,
    deleteItem,
    moveItem,
    addList,
    updateList,
    deleteList,
    saveSettings,
    clearCompleted,
    listSettings,
    setShowCompleted,
  }
})
