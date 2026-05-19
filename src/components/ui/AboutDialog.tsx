// Nanoai Team8 Agent Client — V0.1.0
// Copyright © 2026 AiHXC.Team
// Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { getAgentAbout, AGENT_VERSION, AGENT_COPYRIGHT, type AgentAbout } from '../../lib/api/agent-api';

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  const [about, setAbout] = useState<AgentAbout | null>(null);

  useEffect(() => {
    if (open) {
      getAgentAbout().then(setAbout).catch(() => setAbout(null));
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>关于</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* 系统信息 */}
          <div className="space-y-1">
            <h3 className="font-semibold text-base">NanoAiCanvas</h3>
            <p className="text-muted-foreground">版本 2.12.350</p>
          </div>

          <hr className="border-border" />

          {/* Agent 信息 */}
          <div className="space-y-2">
            <h3 className="font-semibold text-base">
              {about?.name ?? 'Nanoai Team8 Agent System'}
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
              <span>版本</span>
              <span>{about?.version ?? AGENT_VERSION}</span>
              <span>模型模式</span>
              <span>
                {about?.model_mode === 'cloud'
                  ? '☁️ 云端'
                  : about?.model_mode === 'local'
                    ? '💻 本地'
                    : about?.model_mode === 'hybrid'
                      ? '🔄 混合'
                      : '—'}
              </span>
              <span>技能数量</span>
              <span>{about?.skills_count ?? 0}</span>
              <span>活跃用户</span>
              <span>{about?.users_count ?? 0}</span>
            </div>
          </div>

          {/* Agent 列表 */}
          {about?.agents_detail && about.agents_detail.length > 0 && (
            <div className="space-y-1">
              <h4 className="font-medium text-xs uppercase text-muted-foreground tracking-wider">
                已注册 Agent
              </h4>
              <div className="flex flex-wrap gap-1">
                {about.agents_detail.map((a) => (
                  <span
                    key={a.name}
                    className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                    title={a.description}
                  >
                    {a.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <hr className="border-border" />

          {/* 著作权 */}
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>{about?.copyright ?? AGENT_COPYRIGHT}</p>
            <p>作者: 外星动物（常智）/ IoTchange</p>
            <p>邮箱: 14455975@qq.com</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
