import Dexie from 'dexie'

export const db = new Dexie('VoiceNotesDB')

db.version(1).stores({
  lists: 'id, name, order',
  items: 'id, listId, completed, createdAt',
  settings: 'id'
})

// Export for debugging
if (typeof window !== 'undefined') {
  window.db = db
}
