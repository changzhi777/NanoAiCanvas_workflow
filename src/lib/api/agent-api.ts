// Nanoai Team8 Agent Client — V0.1.0
// Copyright © 2026 AiHXC.Team
// Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

import { client } from './client';

export const AGENT_VERSION = 'V0.3.0';
export const AGENT_COPYRIGHT = 'Copyright © 2026 AiHXC.Team';

export interface AgentAbout {
  name: string;
  version: string;
  copyright: string;
  agents: string[];
  agents_detail: { name: string; description: string }[];
  model_mode: 'local' | 'cloud' | 'hybrid';
  health: { local: boolean; cloud: boolean };
  skills_count: number;
  users_count: number;
}

export interface PipelineStatus {
  task_id: string;
  user_id: string;
  status: string;
  current_stage: number;
  total_stages: number;
  stages: { name: string; agent: string; status: string; progress: number }[];
  result: Record<string, unknown> | null;
  error?: string;
  created_at: number;
}

export async function getAgentAbout(): Promise<AgentAbout> {
  return client.get<AgentAbout>('/api/v2/agent/about');
}

export async function startPipeline(
  params: Record<string, unknown>,
  pipelineType = 'adaptation',
): Promise<{ task_id: string; status: string }> {
  return client.post('/api/v2/agent/pipeline/start', {
    params,
    pipeline_type: pipelineType,
  });
}

export async function getPipelineStatus(taskId: string): Promise<PipelineStatus> {
  return client.get<PipelineStatus>(`/api/v2/agent/pipeline/${taskId}`);
}

export async function agentChat(
  messages: { role: string; content: string }[],
  agent = 'producer',
  model?: string,
): Promise<{ status: string; agent: string }> {
  return client.post('/api/v2/agent/chat', { messages, agent, model });
}

export async function listAgents(): Promise<{
  agents: { name: string; description: string }[];
}> {
  return client.get('/api/v2/agent/agents');
}

export function connectAgentWS(
  userId: string,
  onMessage: (data: Record<string, unknown>) => void,
): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = import.meta.env.VITE_API_BASE_URL
    ? new URL(import.meta.env.VITE_API_BASE_URL).host
    : window.location.host;
  const ws = new WebSocket(`${protocol}//${host}/api/v2/agent/ws/${userId}`);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch {
      // ignore non-JSON messages
    }
  };

  return ws;
}
