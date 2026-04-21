import { create } from 'zustand';
import { CollaborationState, CollaborativeUser, CollaborationOperation } from '@/types/collaboration';

// 环境配置
const IS_DEV = import.meta.env.DEV;
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

interface CollaborationStore extends CollaborationState {
  // Actions
  enableCollaboration: (sessionId: string, userName: string) => void;
  disableCollaboration: () => void;
  connect: () => void;
  disconnect: () => void;
  joinUser: (user: CollaborativeUser) => void;
  leaveUser: (userId: string) => void;
  updateUserCursor: (userId: string, cursor: { x: number; y: number }) => void;
  updateUserSelection: (userId: string, selection: string[]) => void;
  receiveOperation: (operation: CollaborationOperation) => void;
  sendOperation: (operation: Omit<CollaborationOperation, 'userId' | 'timestamp' | 'id' | 'version'>) => void;
  getOnlineUsers: () => CollaborativeUser[];
  isUserOnline: (userId: string) => boolean;
}

// 生成随机用户颜色
function generateUserColor(): string {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#f59e0b', // amber
    '#84cc16', // lime
    '#10b981', // emerald
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#002FA7', // deep blue (替换violet)
    '#d946ef', // fuchsia
    '#f43f5e', // rose
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export const useCollaborationStore = create<CollaborationStore>((set, get) => ({
  // 初始状态
  isEnabled: false,
  isConnected: false,
  sessionId: '',
  userId: '',
  userName: '',
  userColor: generateUserColor(),
  users: new Map(),
  operations: [],
  currentVersion: 0,

  enableCollaboration: (sessionId, userName) => {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    set({
      isEnabled: true,
      sessionId,
      userId,
      userName,
      userColor: generateUserColor(),
    });

    // 自动连接
    get().connect();
  },

  disableCollaboration: () => {
    get().disconnect();
    set({
      isEnabled: false,
      isConnected: false,
      sessionId: '',
      users: new Map(),
    });
  },

  connect: () => {
    const state = get();
    if (!state.isEnabled) return;

    // 开发环境：使用模拟连接
    if (IS_DEV) {
      console.log('[Collaboration] Dev mode: Using mock connection');
      setTimeout(() => {
        set({ isConnected: true });
        console.log('[Collaboration] Mock connected successfully');
      }, 500);
      return;
    }

    // 生产环境：连接真实 WebSocket 服务器
    try {
      console.log('[Collaboration] Connecting to WebSocket server:', WS_URL);
      const ws = new WebSocket(`${WS_URL}/collaboration/${state.sessionId}`);

      ws.onopen = () => {
        console.log('[Collaboration] WebSocket connected');
        set({ isConnected: true });
      };

      ws.onmessage = (event) => {
        const operation: CollaborationOperation = JSON.parse(event.data);
        get().receiveOperation(operation);
      };

      ws.onerror = (error) => {
        console.error('[Collaboration] WebSocket error:', error);
        set({ isConnected: false });
      };

      ws.onclose = () => {
        console.log('[Collaboration] WebSocket disconnected');
        set({ isConnected: false });
      };

      // 保存 WebSocket 实例（可选，用于发送消息）
      // set({ ws });
    } catch (error) {
      console.error('[Collaboration] Failed to connect:', error);
      set({ isConnected: false });
    }
  },

  disconnect: () => {
    set({ isConnected: false });
    console.log('[Collaboration] Disconnected');
  },

  joinUser: (user) => {
    set((state) => {
      const newUsers = new Map(state.users);
      newUsers.set(user.id, { ...user, isConnected: true });
      return { users: newUsers };
    });
  },

  leaveUser: (userId) => {
    set((state) => {
      const newUsers = new Map(state.users);
      newUsers.delete(userId);
      return { users: newUsers };
    });
  },

  updateUserCursor: (userId, cursor) => {
    set((state) => {
      const user = state.users.get(userId);
      if (user) {
        const newUsers = new Map(state.users);
        newUsers.set(userId, { ...user, cursor });
        return { users: newUsers };
      }
      return state;
    });
  },

  updateUserSelection: (userId, selection) => {
    set((state) => {
      const user = state.users.get(userId);
      if (user) {
        const newUsers = new Map(state.users);
        newUsers.set(userId, { ...user, selection });
        return { users: newUsers };
      }
      return state;
    });
  },

  receiveOperation: (operation) => {
    set((state) => {
      // 检查版本冲突
      if (operation.version < state.currentVersion) {
        console.warn('[Collaboration] Conflict detected: operation version is older');
        // 实现冲突解决策略
        return state;
      }

      const newOperations = [...state.operations, operation];
      return {
        operations: newOperations,
        currentVersion: operation.version,
      };
    });
  },

  sendOperation: (operationData) => {
    const state = get();
    if (!state.isConnected) return;

    const operation: CollaborationOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: state.userId,
      timestamp: Date.now(),
      version: state.currentVersion + 1,
      ...operationData,
    };

    // 发送到服务器（模拟）
    console.log('[Collaboration] Sending operation:', operation);

    set({
      operations: [...state.operations, operation],
      currentVersion: operation.version,
    });

    return operation;
  },

  getOnlineUsers: () => {
    return Array.from(get().users.values()).filter((u) => u.isConnected);
  },

  isUserOnline: (userId) => {
    const user = get().users.get(userId);
    return user?.isConnected || false;
  },
}));
