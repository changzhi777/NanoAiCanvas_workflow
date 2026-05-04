import Dexie, { type Table } from 'dexie'
import type { User, ChatSession, ImageAsset, Group, TaskQueueItem, StoryboardTask, StoryboardAsset, ClonedVoice } from '@/types'

// Keep the same database name and version for compatibility with "1" directory
export class BananaChatDB extends Dexie {
  users!: Table<User>
  groups!: Table<Group>
  sessions!: Table<ChatSession>
  assets!: Table<ImageAsset>
  storyboardTasks!: Table<StoryboardTask>
  storyboardAssets!: Table<StoryboardAsset>
  clonedVoices!: Table<ClonedVoice>

  constructor() {
    super('banana-chat-db')
    this.version(4).stores({
      users: 'id, username, groupId',
      groups: 'id, inviteCode, ownerId',
      sessions: 'id, userId, createdAt',
      assets: 'id, userId, groupId, isShared, createdAt',
      storyboardTasks: 'id, userId, status, createdAt',
      storyboardAssets: 'id, taskId, userId, category, createdAt',
      clonedVoices: 'id, characterId, createdAt',
    })
  }
}

export const db = new BananaChatDB()

// User operations
export async function initializeUser(
  id: string,
  username: string,
  imageApiKey: string,
  textApiKey?: string
): Promise<User> {
  const user: User = {
    id,
    username,
    displayName: username,
    role: 'admin',
    credits: 999,
    imageApiKey,
    textApiKey,
    createdAt: new Date().toISOString(),
    settings: {
      defaultSize: '1K',
      defaultAspectRatio: '1:1',
      theme: 'dark',
    },
  }
  await db.users.put(user)
  return user
}

const DEFAULT_IMAGE_API_KEY = 'dM2Gez6cbTHkRaKdoki5NBN3qc'
const DEFAULT_TEXT_API_KEY = 'a7678d1859db45a081a6caf801359436.ofG1QdlhOksfn7PA'

export async function initializeDefaultAdmin(): Promise<User> {
  const existing = await db.users.get('changzhi')
  if (existing) {
    let needsUpdate = false
    if (!existing.imageApiKey) {
      existing.imageApiKey = DEFAULT_IMAGE_API_KEY
      needsUpdate = true
    }
    if (!existing.textApiKey) {
      existing.textApiKey = DEFAULT_TEXT_API_KEY
      needsUpdate = true
    }
    if (needsUpdate) {
      await db.users.put(existing)
    }
    return existing
  }
  return initializeUser(
    'changzhi',
    '常智',
    DEFAULT_IMAGE_API_KEY,
    DEFAULT_TEXT_API_KEY
  )
}

export async function getUser(id: string): Promise<User | undefined> {
  return db.users.get(id)
}

export async function updateUser(user: User): Promise<void> {
  await db.users.put(user)
}

export async function deleteUser(id: string): Promise<void> {
  await db.users.delete(id)
}

// Session operations
export async function createSession(session: ChatSession): Promise<void> {
  await db.sessions.put(session)
}

export async function getSessions(userId: string): Promise<ChatSession[]> {
  const sessions = await db.sessions.where('userId').equals(userId).toArray()
  return sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function getSession(id: string): Promise<ChatSession | undefined> {
  return db.sessions.get(id)
}

export async function updateSession(session: ChatSession): Promise<void> {
  await db.sessions.put(session)
}

export async function deleteSession(id: string): Promise<void> {
  await db.sessions.delete(id)
}

// Message operations
export async function dbAddMessage(sessionId: string, message: ChatSession['messages'][0]): Promise<void> {
  const session = await db.sessions.get(sessionId)
  if (session) {
    session.messages.push(message)
    session.updatedAt = new Date().toISOString()
    await db.sessions.put(session)
  }
}

export async function dbUpdateMessage(
  sessionId: string,
  messageId: string,
  updates: Partial<ChatSession['messages'][0]>
): Promise<void> {
  const session = await db.sessions.get(sessionId)
  if (session) {
    const idx = session.messages.findIndex((m) => m.id === messageId)
    if (idx !== -1) {
      Object.assign(session.messages[idx], updates)
      session.updatedAt = new Date().toISOString()
      await db.sessions.put(session)
    }
  }
}

// Asset operations
export async function saveAsset(asset: ImageAsset): Promise<void> {
  await db.assets.put(asset)
}

export async function getAssets(userId: string): Promise<ImageAsset[]> {
  const assets = await db.assets.where('userId').equals(userId).toArray()
  return assets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function getSharedAssets(): Promise<ImageAsset[]> {
  const assets = await db.assets.where('isShared').equals(1).toArray()
  return assets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function deleteAsset(id: string): Promise<void> {
  await db.assets.delete(id)
}

// Group operations
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function createGroup(
  id: string,
  name: string,
  ownerId: string
): Promise<Group> {
  const group: Group = {
    id,
    name,
    inviteCode: generateInviteCode(),
    ownerId,
    members: [{ userId: ownerId, username: '', role: 'owner', joinedAt: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
  }
  await db.groups.put(group)
  return group
}

export async function getGroups(userId: string): Promise<Group[]> {
  const allGroups = await db.groups.toArray()
  return allGroups.filter((g) => g.members.some((m) => m.userId === userId))
}

export async function joinGroupByCode(
  inviteCode: string,
  userId: string,
  username: string
): Promise<Group | null> {
  const group = await db.groups.where('inviteCode').equals(inviteCode).first()
  if (!group) return null
  if (group.members.some((m) => m.userId === userId)) return group
  group.members.push({
    userId,
    username,
    role: 'member',
    joinedAt: new Date().toISOString(),
  })
  await db.groups.put(group)
  return group
}

// Task Queue operations - get all assistant messages across sessions
export async function getAllTaskItems(userId: string): Promise<TaskQueueItem[]> {
  const sessions = await db.sessions.where('userId').equals(userId).toArray()
  const taskItems: TaskQueueItem[] = []

  for (const session of sessions) {
    const assistantMessages = session.messages.filter((m) => m.role === 'assistant')
    for (const msg of assistantMessages) {
      taskItems.push({
        id: msg.id,
        sessionId: session.id,
        sessionTitle: session.title,
        prompt: msg.prompt || msg.content,
        enhancedPrompt: msg.enhancedPrompt,
        status: msg.status,
        progress: msg.progress || 0,
        model: msg.params?.model,
        error: msg.error,
        imageUrl: msg.imageUrl,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        params: msg.params,
      })
    }
  }

  return taskItems.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

// Delete a specific message from a session
export async function dbDeleteMessage(sessionId: string, messageId: string): Promise<void> {
  const session = await db.sessions.get(sessionId)
  if (session) {
    session.messages = session.messages.filter((m) => m.id !== messageId)
    session.updatedAt = new Date().toISOString()
    await db.sessions.put(session)
  }
}

// ============== Storyboard Task operations ==============

export async function createStoryboardTask(task: StoryboardTask): Promise<void> {
  await db.storyboardTasks.put(task)
}

export async function getStoryboardTask(id: string): Promise<StoryboardTask | undefined> {
  return db.storyboardTasks.get(id)
}

export async function getStoryboardTasks(userId: string): Promise<StoryboardTask[]> {
  const tasks = await db.storyboardTasks.where('userId').equals(userId).toArray()
  return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function updateStoryboardTask(task: StoryboardTask): Promise<void> {
  task.updatedAt = new Date().toISOString()
  await db.storyboardTasks.put(task)
}

export async function deleteStoryboardTask(id: string): Promise<void> {
  await db.storyboardTasks.delete(id)
}

export async function getPendingStoryboardTasks(userId: string): Promise<StoryboardTask[]> {
  const all = await db.storyboardTasks.where('userId').equals(userId).toArray()
  return all.filter(t => t.status !== 'success' && t.status !== 'error')
}

// ============== Storyboard Asset operations ==============

export async function saveStoryboardAsset(asset: StoryboardAsset): Promise<void> {
  await db.storyboardAssets.put(asset)
}

export async function getStoryboardAssets(userId: string): Promise<StoryboardAsset[]> {
  const assets = await db.storyboardAssets.where('userId').equals(userId).toArray()
  return assets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function getStoryboardAsset(id: string): Promise<StoryboardAsset | undefined> {
  return db.storyboardAssets.get(id)
}

export async function deleteStoryboardAsset(id: string): Promise<void> {
  await db.storyboardAssets.delete(id)
}

export async function getSharedStoryboardAssets(): Promise<StoryboardAsset[]> {
  const allAssets = await db.storyboardAssets.toArray()
  const sharedAssets = allAssets.filter(asset => asset.isShared === true)
  return sharedAssets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// ============== Cloned Voice operations ==============

export async function saveClonedVoice(voice: ClonedVoice): Promise<void> {
  await db.clonedVoices.put(voice)
}

export async function getClonedVoices(): Promise<ClonedVoice[]> {
  return db.clonedVoices.orderBy('createdAt').reverse().toArray()
}

export async function getClonedVoice(id: string): Promise<ClonedVoice | undefined> {
  return db.clonedVoices.get(id)
}

export async function getClonedVoicesByCharacter(characterId: string): Promise<ClonedVoice[]> {
  return db.clonedVoices.where('characterId').equals(characterId).toArray()
}

export async function deleteClonedVoice(id: string): Promise<void> {
  await db.clonedVoices.delete(id)
}