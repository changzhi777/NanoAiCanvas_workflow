/**
 * WebSocket 客户端 - 任务状态实时推送
 * 通过 WebSocket 连接后端，接收 Redis Pub/Sub 发布的任务状态更新
 */

import { getApiKey } from './client';

export interface TaskStatusMessage {
  type: 'connected' | 'status_update' | 'ping' | 'error';
  task_id?: string;
  status?: string;
  images?: Array<{ url: string }>;
  error?: string;
  progress?: number;
  message?: string;
}

export type TaskStatusCallback = (message: TaskStatusMessage) => void;

class TaskWebSocketClient {
  private ws: WebSocket | null = null;
  private taskId: string | null = null;
  private callbacks: Set<TaskStatusCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000;
  private _resolved = false;

  /**
   * 连接到任务的 WebSocket 频道
   */
  connect(taskId: string): Promise<void> {
    // 不同任务时先断开旧连接
    if (this.taskId !== taskId && this.ws) {
      this.ws.close()
      this.ws = null
    }

    return new Promise((resolve, reject) => {
      this.taskId = taskId;
      this.reconnectAttempts = 0;
      this._resolved = false;

      const apiKey = getApiKey();
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/tasks/${taskId}`;

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log(`[WS] Connected to task ${taskId}`);
          if (apiKey) {
            this.sendAuth(apiKey);
          }
          if (!this._resolved) {
            this._resolved = true;
            resolve();
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const message: TaskStatusMessage = JSON.parse(event.data);

            if (message.type === 'connected') {
              console.log('[WS] Received connected confirmation');
            } else if (message.type === 'ping') {
              // 心跳响应，不需要处理
            } else {
              // 状态更新消息
              console.log('[WS] Received status:', message);
              this.callbacks.forEach(cb => cb(message));
            }
          } catch (e) {
            console.error('[WS] Failed to parse message:', e);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WS] WebSocket error:', error);
          if (!this._resolved) {
            this._resolved = true;
            reject(error);
          }
        };

        this.ws.onclose = (event) => {
          console.log(`[WS] Connection closed:`, event.code, event.reason);
          this.ws = null;

          // 指数退避重连
          if (this.reconnectAttempts < this.maxReconnectAttempts && this.taskId) {
            this.reconnectAttempts++;
            const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            const maxDelay = 30000;
            const actualDelay = Math.min(delay, maxDelay);
            console.log(`[WS] Reconnecting... attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${actualDelay}ms`);
            setTimeout(() => {
              this.connect(this.taskId!).catch(console.error);
            }, actualDelay);
          }
        };
      } catch (error) {
        if (!this._resolved) {
          this._resolved = true;
          reject(error);
        }
      }
    });
  }

  /**
   * 发送认证信息
   */
  private sendAuth(apiKey: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'auth', apiKey }));
    }
  }

  /**
   * 订阅状态更新回调
   */
  subscribe(callback: TaskStatusCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.taskId = null;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.callbacks.clear();
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// 单例模式
let wsClient: TaskWebSocketClient | null = null;

export function getTaskWebSocketClient(): TaskWebSocketClient {
  if (!wsClient) {
    wsClient = new TaskWebSocketClient();
  }
  return wsClient;
}

/**
 * 订阅任务状态实时更新
 */
export function subscribeTaskStatus(
  taskId: string,
  callback: TaskStatusCallback
): () => void {
  const client = getTaskWebSocketClient();

  client.connect(taskId).catch(console.error);

  return client.subscribe(callback);
}
