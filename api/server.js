const express = require('express')
const { WebSocketServer } = require('ws')
const { createServer } = require('http')
const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')

const app = express()
app.use(express.json())

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// Data directory
const DATA_DIR = path.join(__dirname, 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR)

// --- Database helpers ---

function getWorkspacePath(workspaceId) {
  return path.join(DATA_DIR, `${workspaceId}.json`)
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function loadWorkspace(workspaceId) {
  const filePath = getWorkspacePath(workspaceId)
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function saveWorkspace(workspace) {
  const filePath = getWorkspacePath(workspace.id)
  const temp = filePath + '.tmp'
  fs.writeFileSync(temp, JSON.stringify(workspace, null, 2))
  fs.renameSync(temp, filePath)
}

function findWorkspaceByCode(code) {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
  for (const file of files) {
    const workspace = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'))
    if (workspace.code === code.toUpperCase()) return workspace
  }
  return null
}

// --- API Routes ---

app.post('/api/workspaces', (req, res) => {
  const workspace = {
    id: uuidv4(),
    code: generateCode(),
    createdAt: Date.now(),
    lists: [],
    items: [],
    settings: {}
  }
  saveWorkspace(workspace)
  res.json({ id: workspace.id, code: workspace.code })
})

app.get('/api/workspaces/:code', (req, res) => {
  const workspace = findWorkspaceByCode(req.params.code)
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found' })
  }
  res.json({ id: workspace.id, code: workspace.code })
})

app.post('/api/sync/:workspaceId', (req, res) => {
  const { workspaceId } = req.params
  const { lastSyncAt, lists, items, deviceId } = req.body

  let workspace = loadWorkspace(workspaceId)
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found' })
  }

  const changes = { lists: [], items: [] }

  for (const incomingList of (lists || [])) {
    const existingIndex = workspace.lists.findIndex(l => l.id === incomingList.id)
    if (existingIndex === -1) {
      workspace.lists.push(incomingList)
      changes.lists.push(incomingList)
    } else if (incomingList.updatedAt > workspace.lists[existingIndex].updatedAt) {
      workspace.lists[existingIndex] = incomingList
      changes.lists.push(incomingList)
    }
  }

  for (const incomingItem of (items || [])) {
    const existingIndex = workspace.items.findIndex(i => i.id === incomingItem.id)
    if (existingIndex === -1) {
      workspace.items.push(incomingItem)
      changes.items.push(incomingItem)
    } else if (incomingItem.updatedAt > workspace.items[existingIndex].updatedAt) {
      workspace.items[existingIndex] = incomingItem
      changes.items.push(incomingItem)
    }
  }

  const serverLists = workspace.lists.filter(l => l.updatedAt > (lastSyncAt || 0))
  const serverItems = workspace.items.filter(i => i.updatedAt > (lastSyncAt || 0))

  saveWorkspace(workspace)
  broadcastToWorkspace(workspaceId, { type: 'sync', changes }, deviceId)

  res.json({
    lists: serverLists,
    items: serverItems,
    syncedAt: Date.now()
  })
})

// --- WebSocket ---

const server = createServer(app)
const wss = new WebSocketServer({ server })

const clients = new Map()

wss.on('connection', (ws, req) => {
  const workspaceId = req.url.replace('/ws/', '')
  
  if (!clients.has(workspaceId)) {
    clients.set(workspaceId, new Set())
  }
  clients.get(workspaceId).add(ws)

  ws.on('close', () => {
    clients.get(workspaceId)?.delete(ws)
  })

  ws.on('error', () => {
    clients.get(workspaceId)?.delete(ws)
  })
})

function broadcastToWorkspace(workspaceId, message, excludeDeviceId) {
  const workspaceClients = clients.get(workspaceId)
  if (!workspaceClients) return

  const data = JSON.stringify(message)
  for (const client of workspaceClients) {
    if (client.readyState === 1) {
      client.send(data)
    }
  }
}

// --- Start ---

const PORT = process.env.PORT || 3000
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})