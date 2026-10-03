/**
 * TVC 验收标准审查闸 API
 *
 * 使用方法:
 *   import { tvcAcceptanceApi } from '@/lib/api/tvc-acceptance-api'
 *   const bundle = await tvcAcceptanceApi.importFeishu('https://my.feishu.cn/base/...')
 *   await tvcAcceptanceApi.createTemplateFromBrief({...})
 *   const reports = await tvcAcceptanceApi.getReports(taskId)
 */

import { client } from './client';

// ==================== 类型 ====================

export interface BriefBundleItem {
  column: string;
  theme: string;
  fields: Record<string, string>;
  preview: {
    aspect_ratio: string;
    criteria_overrides: Record<string, Record<string, unknown>>;
    brief_ctx: Record<string, string>;
  };
}

export interface BriefBundle {
  base_name: string;
  items: BriefBundleItem[];
}

export interface AcceptanceCriterion {
  key: string;
  label: string;
  category: 'rule_hard' | 'rule_content' | 'llm_content' | 'llm_visual' | 'archive';
  weight: number;
  veto: boolean;
  rule?: Record<string, unknown> | null;
  prompt_hint?: string | null;
}

export interface AcceptanceTemplate {
  id: string;
  customer_code: string;
  name: string;
  aspect_ratio: string;
  duration_sec: number;
  criteria: AcceptanceCriterion[];
  brief_ctx?: Record<string, string>;
  is_active?: boolean;
}

export interface AcceptanceReportItem {
  key: string;
  label: string;
  category?: string;
  weight: number;
  veto: boolean;
  pass: boolean | null;
  conflict: string;
  standard_ref: string;
  actual: string;
  advice?: string;
}

export interface AcceptanceReport {
  id: string;
  task_id: string;
  gate: 'script' | 'final';
  status: 'passed' | 'failed' | 'unverified';
  score: number;
  veto_hit: string[];
  conflicts_top: { key: string; label: string; conflict: string; standard_ref: string }[];
  redo_count: number;
  decision?: string | null;
  created_at: string;
  items?: AcceptanceReportItem[];
  template_snapshot?: Record<string, unknown>;
}

// ==================== API ====================

export const tvcAcceptanceApi = {
  /** 抓取飞书 Brief（预览，不落库） */
  async importFeishu(shareUrl: string): Promise<BriefBundle> {
    return client.post('/v2/tvc-acceptance/import-feishu', { share_url: shareUrl });
  },

  /** 从 Brief 条目 upsert 模板 */
  async createTemplateFromBrief(req: {
    customer_code: string;
    name: string;
    aspect_ratio: string;
    duration_sec: number;
    criteria: AcceptanceCriterion[];
    brief_ctx: Record<string, string>;
  }): Promise<{ id: string; created?: boolean; updated?: boolean }> {
    return client.post('/v2/tvc-acceptance/templates/from-brief', req);
  },

  async listTemplates(): Promise<{ items: Omit<AcceptanceTemplate, 'criteria'>[] }> {
    return client.get('/v2/tvc-acceptance/templates');
  },

  async getTemplate(id: string): Promise<AcceptanceTemplate> {
    return client.get(`/v2/tvc-acceptance/templates/${id}`);
  },

  async updateTemplate(id: string, patch: Partial<Pick<AcceptanceTemplate, 'name' | 'aspect_ratio' | 'duration_sec' | 'criteria' | 'is_active'>>): Promise<void> {
    return client.put(`/v2/tvc-acceptance/templates/${id}`, patch);
  },

  async deleteTemplate(id: string): Promise<void> {
    return client.delete(`/v2/tvc-acceptance/templates/${id}`);
  },

  async getReports(taskId: string): Promise<{ items: AcceptanceReport[] }> {
    return client.get(`/v2/tvc-acceptance/reports?task_id=${taskId}`);
  },

  async decide(reportId: string, action: 'accept' | 'redo_done'): Promise<void> {
    return client.post(`/v2/tvc-acceptance/reports/${reportId}/decision`, { action });
  },

  /** 单步重做（正常计费，上限 3 次） */
  async redo(taskId: string, fromStep: 'images' | 'video', forcePersonalPoints = false): Promise<void> {
    return client.post(`/v2/tvc-tasks/${taskId}/redo`, {
      from_step: fromStep,
      force_personal_points: forcePersonalPoints,
    });
  },

  /** 客户版报告下载（blob 走 fetch 带 token，<a> 直下会 401） */
  async exportClientVersion(reportId: string): Promise<void> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('nanoai_token') : '';
    const resp = await fetch(this.exportUrl(reportId), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) throw new Error(`导出失败 HTTP ${resp.status}`);
    const blob = await resp.blob();
    const disposition = resp.headers.get('Content-Disposition') || '';
    const m = disposition.match(/filename=(acceptance-[^;]+)/);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = m ? m[1] : `acceptance-${reportId}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  /** 客户版报告导出 URL（浏览器直接下载） */
  exportUrl(reportId: string): string {
    const base = import.meta.env.VITE_API_BASE_URL || '';
    return `${base}/api/v2/tvc-acceptance/reports/${reportId}/export`;
  },
};

// ==================== 标准集合成（前端合成完整 criteria） ====================

/** KFC 默认 14 项骨架（与后端 DEFAULT_KFC_TEMPLATE 对齐的轻量副本，用于 from-brief 合成） */
export const BASE_CRITERIA: AcceptanceCriterion[] = [
  { key: 'aspect_ratio', label: '画面比例 9:16', category: 'rule_hard', weight: 10, veto: true, rule: { type: 'aspect_ratio', expect: '9:16' }, prompt_hint: null },
  { key: 'duration', label: '时长 15s 左右', category: 'rule_hard', weight: 10, veto: true, rule: { type: 'duration', expect_sec: 15, tolerance: 2 }, prompt_hint: null },
  { key: 'product_name_hit', label: '主推产品全称命中', category: 'rule_content', weight: 10, veto: true, rule: { type: 'text_contains', source: 'product_name' }, prompt_hint: null },
  { key: 'price_hit', label: '价格/活动信息命中', category: 'rule_content', weight: 8, veto: false, rule: { type: 'text_contains', source: 'price_info' }, prompt_hint: null },
  { key: 'ad_law_compliance', label: '广告法合规（极限词/食品违禁语）', category: 'rule_content', weight: 8, veto: true, rule: { type: 'ad_law' }, prompt_hint: null },
  { key: 'copy_fidelity', label: '指定文案忠实度', category: 'llm_content', weight: 8, veto: false, rule: null, prompt_hint: '脚本中配音/字幕/台词是否与 Brief 指定文案一致' },
  { key: 'offer_mechanism', label: '活动机制完整', category: 'llm_content', weight: 8, veto: false, rule: null, prompt_hint: 'Brief 要求的活动机制/日期/价格信息是否完整' },
  { key: 'must_elements', label: '必现元素齐全', category: 'llm_content', weight: 10, veto: true, rule: null, prompt_hint: '必现元素（产品全貌/logo/道具/文字标识）是否在镜头中体现' },
  { key: 'ending_norm', label: '结尾 KV/海报规范', category: 'llm_content', weight: 8, veto: false, rule: null, prompt_hint: '结尾是否定格产品 KV/海报并呈现价格与时间' },
  { key: 'scene_mood_text', label: '故事场景/氛围符合', category: 'llm_content', weight: 5, veto: false, rule: null, prompt_hint: '脚本场景是否在 Brief 指定的环境/氛围/色调内' },
  { key: 'ip_consistency', label: 'IP 形象一致性', category: 'llm_visual', weight: 10, veto: true, rule: null, prompt_hint: '人物形象与 Brief 设定/参照图一致，不得改动面部服饰细节' },
  { key: 'product_fidelity', label: '产品还原度', category: 'llm_visual', weight: 10, veto: true, rule: null, prompt_hint: '产品外观与参照 KV 一致，颜色材质不能变形' },
  { key: 'logo_integrity', label: 'Logo/上校头像完整性', category: 'llm_visual', weight: 10, veto: true, rule: null, prompt_hint: 'KFC Logo 与上校头像是否变形/改色/加特效（Logo 不可修改，KFC Red 参考 #E4002B）' },
  { key: 'scene_mood_visual', label: '画面氛围/品牌色调', category: 'llm_visual', weight: 5, veto: false, rule: null, prompt_hint: '画面色调氛围符合 Brief' },
  { key: 'delivery_date', label: '交付日期', category: 'archive', weight: 0, veto: false, rule: { type: 'archive', source: 'delivery_date' }, prompt_hint: null },
  { key: 'video_theme', label: '本期视频主题', category: 'archive', weight: 0, veto: false, rule: { type: 'archive', source: 'theme' }, prompt_hint: null },
];

/** 用 Brief 预览合成完整 criteria（覆盖 aspect_ratio + prompt_hint） */
export function composeCriteria(item: BriefBundleItem): { criteria: AcceptanceCriterion[]; aspect: string; briefCtx: Record<string, string> } {
  const aspect = item.preview.aspect_ratio || '9:16';
  const overrides = item.preview.criteria_overrides || {};
  const criteria = BASE_CRITERIA.map((c) => {
    const ov = overrides[c.key];
    return ov ? { ...c, ...(ov as Partial<AcceptanceCriterion>) } : { ...c };
  });
  const ar = criteria.find((c) => c.key === 'aspect_ratio');
  if (ar && ar.rule) ar.rule = { type: 'aspect_ratio', expect: aspect };
  return { criteria, aspect, briefCtx: item.preview.brief_ctx || {} };
}

export default tvcAcceptanceApi;
