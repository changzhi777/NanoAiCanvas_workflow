/**
 * 协作功能类型定义
 * 支持多人实时编辑和操作同步
 */

/** 用户信息 */
export interface CollaborativeUser {
  id: string;
  name: string;
  color: string; // 用户标识颜色
  cursor?: {
    x: number;
    y: number;
  };
  selection?: string[]; // 选中的节点ID列表
  isConnected: boolean;
  lastSeen: number;
}

/** 协作操作类型 */
export type CollaborationOperationType =
  | 'add_node'
  | 'remove_node'
  | 'update_node'
  | 'add_edge'
  | 'remove_edge'
  | 'move_node'
  | 'select_node'
  | 'deselect_node'
  | 'clear_workflow';

/** 协作操作 */
export interface CollaborationOperation {
  id: string; // 操作唯一ID
  type: CollaborationOperationType;
  userId: string; // 操作用户ID
  timestamp: number; // 操作时间戳
  data: any; // 操作数据
  version: number; // 版本号（用于冲突检测）
}

/** 协作状态 */
export interface CollaborationState {
  isEnabled: boolean; // 是否启用协作
  isConnected: boolean; // 是否连接到服务器
  sessionId: string; // 会话ID
  userId: string; // 当前用户ID
  userName: string; // 当前用户名
  userColor: string; // 当前用户颜色
  users: Map<string, CollaborativeUser>; // 在线用户
  operations: CollaborationOperation[]; // 操作历史
  currentVersion: number; // 当前版本号
}

/** WebSocket消息 */
export interface WebSocketMessage {
  type: 'user_join' | 'user_leave' | 'operation' | 'cursor_move' | 'selection_change' | 'presence';
  data: any;
}

/** 协作冲突解决策略 */
export type ConflictResolutionStrategy = 'last_write_wins' | 'first_write_wins' | 'manual';

/** 协作配置 */
export interface CollaborationConfig {
  enabled: boolean;
  serverUrl: string; // WebSocket服务器URL
  autoReconnect: boolean;
  reconnectInterval: number;
  conflictResolution: ConflictResolutionStrategy;
}
