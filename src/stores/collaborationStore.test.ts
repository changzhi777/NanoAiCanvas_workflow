import { describe, it, expect, beforeEach } from 'vitest'
import { useCollaborationStore } from '@/stores/collaborationStore'

describe('CollaborationStore', () => {
  beforeEach(() => {
    useCollaborationStore.setState({
      isEnabled: false,
      isConnected: false,
      sessionId: '',
      userId: '',
      userName: '',
      userColor: '#3b82f6',
      users: new Map(),
      operations: [],
      currentVersion: 0,
    })
  })

  it('should have correct initial state', () => {
    const state = useCollaborationStore.getState()
    expect(state.isEnabled).toBe(false)
    expect(state.isConnected).toBe(false)
    expect(state.sessionId).toBe('')
    expect(state.users.size).toBe(0)
    expect(state.operations).toEqual([])
    expect(state.currentVersion).toBe(0)
  })

  describe('enableCollaboration', () => {
    it('should enable and auto-assign user info', () => {
      useCollaborationStore.getState().enableCollaboration('session-1', 'Alice')

      const state = useCollaborationStore.getState()
      expect(state.isEnabled).toBe(true)
      expect(state.sessionId).toBe('session-1')
      expect(state.userName).toBe('Alice')
      expect(state.userId).toContain('user_')
    })
  })

  describe('disableCollaboration', () => {
    it('should disable and clear state', () => {
      useCollaborationStore.getState().enableCollaboration('s1', 'Bob')
      useCollaborationStore.getState().disableCollaboration()

      const state = useCollaborationStore.getState()
      expect(state.isEnabled).toBe(false)
      expect(state.isConnected).toBe(false)
      expect(state.sessionId).toBe('')
      expect(state.users.size).toBe(0)
    })
  })

  describe('joinUser / leaveUser', () => {
    it('should add user to the map', () => {
      const user = { id: 'u1', name: 'Alice', color: '#ef4444', cursor: null, selection: [], isConnected: true }
      useCollaborationStore.getState().joinUser(user)

      expect(useCollaborationStore.getState().users.get('u1')).toEqual({ ...user, isConnected: true })
    })

    it('should remove user from the map', () => {
      const user = { id: 'u1', name: 'Alice', color: '#ef4444', cursor: null, selection: [], isConnected: true }
      useCollaborationStore.getState().joinUser(user)
      useCollaborationStore.getState().leaveUser('u1')

      expect(useCollaborationStore.getState().users.has('u1')).toBe(false)
    })
  })

  describe('updateUserCursor / updateUserSelection', () => {
    it('should update cursor for existing user', () => {
      const user = { id: 'u1', name: 'Alice', color: '#ef4444', cursor: null, selection: [], isConnected: true }
      useCollaborationStore.getState().joinUser(user)

      useCollaborationStore.getState().updateUserCursor('u1', { x: 100, y: 200 })

      const updated = useCollaborationStore.getState().users.get('u1')
      expect(updated?.cursor).toEqual({ x: 100, y: 200 })
    })

    it('should update selection for existing user', () => {
      const user = { id: 'u1', name: 'Alice', color: '#ef4444', cursor: null, selection: [], isConnected: true }
      useCollaborationStore.getState().joinUser(user)

      useCollaborationStore.getState().updateUserSelection('u1', ['node-1', 'node-2'])

      const updated = useCollaborationStore.getState().users.get('u1')
      expect(updated?.selection).toEqual(['node-1', 'node-2'])
    })

    it('should not change state for non-existent user', () => {
      const before = useCollaborationStore.getState()
      useCollaborationStore.getState().updateUserCursor('nonexistent', { x: 0, y: 0 })

      const after = useCollaborationStore.getState()
      expect(before.users.size).toBe(after.users.size)
    })
  })

  describe('receiveOperation', () => {
    it('should add operation and update version', () => {
      const op = { id: 'op1', userId: 'u1', type: 'add', data: {}, timestamp: Date.now(), version: 1 }
      useCollaborationStore.getState().receiveOperation(op as any)

      const state = useCollaborationStore.getState()
      expect(state.operations).toHaveLength(1)
      expect(state.currentVersion).toBe(1)
    })

    it('should ignore operations with older version', () => {
      useCollaborationStore.getState().receiveOperation({
        id: 'op1', userId: 'u1', type: 'add', data: {}, timestamp: Date.now(), version: 2,
      } as any)

      useCollaborationStore.getState().receiveOperation({
        id: 'op2', userId: 'u1', type: 'add', data: {}, timestamp: Date.now(), version: 1,
      } as any)

      expect(useCollaborationStore.getState().operations).toHaveLength(1)
      expect(useCollaborationStore.getState().currentVersion).toBe(2)
    })
  })

  describe('sendOperation', () => {
    it('should not send when not connected', () => {
      useCollaborationStore.setState({ isConnected: false })
      const result = useCollaborationStore.getState().sendOperation({ type: 'move', data: {} })

      expect(result).toBeUndefined()
    })

    it('should add operation with auto-generated fields', () => {
      useCollaborationStore.setState({
        isConnected: true,
        userId: 'user-me',
        currentVersion: 0,
      })

      useCollaborationStore.getState().sendOperation({ type: 'move', data: { x: 10 } })

      const state = useCollaborationStore.getState()
      expect(state.operations).toHaveLength(1)
      expect(state.operations[0].userId).toBe('user-me')
      expect(state.operations[0].version).toBe(1)
      expect(state.currentVersion).toBe(1)
    })
  })

  describe('getOnlineUsers / isUserOnline', () => {
    it('should return only connected users', () => {
      // joinUser always sets isConnected: true, so we manually set one to false
      useCollaborationStore.getState().joinUser({ id: 'u1', name: 'A', color: '#fff', cursor: null, selection: [], isConnected: true })
      useCollaborationStore.getState().joinUser({ id: 'u2', name: 'B', color: '#fff', cursor: null, selection: [], isConnected: true })

      // Manually set u2 to disconnected
      const users = new Map(useCollaborationStore.getState().users)
      users.set('u2', { ...users.get('u2')!, isConnected: false })
      useCollaborationStore.setState({ users })

      const online = useCollaborationStore.getState().getOnlineUsers()
      expect(online).toHaveLength(1)
      expect(online[0].id).toBe('u1')
    })

    it('should check if specific user is online', () => {
      useCollaborationStore.getState().joinUser({ id: 'u1', name: 'A', color: '#fff', cursor: null, selection: [], isConnected: true })

      expect(useCollaborationStore.getState().isUserOnline('u1')).toBe(true)
      expect(useCollaborationStore.getState().isUserOnline('u2')).toBe(false)
    })
  })
})
