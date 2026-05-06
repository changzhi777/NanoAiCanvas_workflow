import { lazy } from 'react';

// 节点导出索引
export { BaseNode, ParamEditor, ExecuteButton } from './BaseNode';
export { TaskNodeBase } from './TaskNodeBase';
export type { ApiTaskNodeData, ApiTaskParams } from './TaskNodeBase';
export { default as ScriptGeneratorNode } from './ScriptGeneratorNode';
export { default as StoryboardGeneratorNode } from './StoryboardGeneratorNode';
export { default as DialogueGeneratorNode } from './DialogueGeneratorNode';
export { default as CharacterDesignerNode } from './CharacterDesignerNode';
export { default as SceneDesignerNode } from './SceneDesignerNode';
export { default as PreviewNode } from './PreviewNode';
export { default as ConnectorNode } from './ConnectorNode';
export { default as TextInputNode } from './TextInputNode';
export { default as DirectorAgentNode } from './DirectorAgentNode';
export { default as ScreenwriterAgentNode } from './ScreenwriterAgentNode';
export { default as MilestoneNode } from './MilestoneNode';
export { default as MiniMaxTextNode } from './MiniMaxTextNode';
export { default as MiniMaxSpeechNode } from './MiniMaxSpeechNode';
export { default as MiniMaxVideoNode } from './MiniMaxVideoNode';
export { default as MiniMaxMusicNode } from './MiniMaxMusicNode';
export { default as MiniMaxImageNode } from './MiniMaxImageNode';
export { default as MiniMaxCodingNode } from './MiniMaxCodingNode';
export { default as NanoBanana2Node } from './NanoBanana2Node';
export { default as NanoBananaProNode } from './NanoBananaProNode';
export { default as GPTImage2Node } from './GPTImage2Node';
export { default as VideoGeneratorNode } from './VideoGeneratorNode';
export { default as BackgroundMusicNode } from './BackgroundMusicNode';
export { default as TransitionNode } from './TransitionNode';

// 即梦（字节AI）节点
export { default as JimengImageNode } from './JimengImageNode';
export { default as JimengVideoNode } from './JimengVideoNode';

// 智谱 GLM 节点
export { default as GlmTextNode } from './GlmTextNode';
export { default as GlmVideoNode } from './GlmVideoNode';
export { default as GlmTtsNode } from './GlmTtsNode';
export { default as GlmMultimodalNode } from './GlmMultimodalNode';

// 通义千问（阿里）节点
export { default as QwenTextNode } from './QwenTextNode';
export { default as QwenCodingNode } from './QwenCodingNode';

// Kimi（Moonshot）节点
export { default as KimiTextNode } from './KimiTextNode';

// 预览节点
export { default as ImagePreviewNode } from './ImagePreviewNode';
export { default as VideoPreviewNode } from './VideoPreviewNode';
export { default as AudioPreviewNode } from './AudioPreviewNode';
export { default as TextPreviewNode } from './TextPreviewNode';

// Skills 相关节点
export { default as SkillsDataNode } from './SkillsDataNode';
export { default as SkillsTaskNode } from './SkillsTaskNode';
export { SKILLS_CATEGORIES, SKILLS_TEMPLATES } from './SkillsDataNode';
export { default as OutputNode } from './OutputNode';

// 类型导出
export type { ScriptGeneratorData } from './ScriptGeneratorNode';
export type { StoryboardGeneratorData } from './StoryboardGeneratorNode';
export type { DialogueGeneratorData } from './DialogueGeneratorNode';
export type { CharacterDesignerData } from './CharacterDesignerNode';
export type { SceneDesignerData } from './SceneDesignerNode';
export type { PreviewNodeData } from './PreviewNode';
export type { ConnectorNodeData } from './ConnectorNode';
export type { TextInputNodeData } from './TextInputNode';

// React Flow 节点类型映射
export const nodeTypes = {
  input_text: lazy(() => import('./TextInputNode').then(m => ({ default: m.TextInputNode }))),
  script_generator: lazy(() => import('./ScriptGeneratorNode').then(m => ({ default: m.ScriptGeneratorNode }))),
  storyboard_generator: lazy(() => import('./StoryboardGeneratorNode').then(m => ({ default: m.StoryboardGeneratorNode }))),
  dialogue_generator: lazy(() => import('./DialogueGeneratorNode').then(m => ({ default: m.DialogueGeneratorNode }))),
  character_designer: lazy(() => import('./CharacterDesignerNode').then(m => ({ default: m.CharacterDesignerNode }))),
  scene_designer: lazy(() => import('./SceneDesignerNode').then(m => ({ default: m.SceneDesignerNode }))),
  director_agent: lazy(() => import('./DirectorAgentNode')),
  screenwriter_agent: lazy(() => import('./ScreenwriterAgentNode')),
  milestone: lazy(() => import('./MilestoneNode')),
  text_processor: lazy(() => import('./ConnectorNode').then(m => ({ default: m.ConnectorNode }))),
  data_transformer: lazy(() => import('./ConnectorNode').then(m => ({ default: m.ConnectorNode }))),
  output_preview: lazy(() => import('./PreviewNode').then(m => ({ default: m.PreviewNode }))),
  connector: lazy(() => import('./ConnectorNode').then(m => ({ default: m.ConnectorNode }))),
  // MiniMax 节点
  minimax_text: lazy(() => import('./MiniMaxTextNode').then(m => ({ default: m.MiniMaxTextNode }))),
  minimax_speech: lazy(() => import('./MiniMaxSpeechNode').then(m => ({ default: m.MiniMaxSpeechNode }))),
  minimax_video: lazy(() => import('./MiniMaxVideoNode').then(m => ({ default: m.MiniMaxVideoNode }))),
  minimax_music: lazy(() => import('./MiniMaxMusicNode').then(m => ({ default: m.MiniMaxMusicNode }))),
  minimax_image: lazy(() => import('./MiniMaxImageNode').then(m => ({ default: m.MiniMaxImageNode }))),
  minimax_coding: lazy(() => import('./MiniMaxCodingNode').then(m => ({ default: m.MiniMaxCodingNode }))),
  // 图片生成节点
  nano_banana_2: lazy(() => import('./NanoBanana2Node').then(m => ({ default: m.NanoBanana2Node }))),
  nano_banana_pro: lazy(() => import('./NanoBananaProNode').then(m => ({ default: m.NanoBananaProNode }))),
  gpt_image_2: lazy(() => import('./GPTImage2Node').then(m => ({ default: m.GPTImage2Node }))),
  // 故事板扩展节点
  video_generator: lazy(() => import('./VideoGeneratorNode').then(m => ({ default: m.VideoGeneratorNode }))),
  background_music: lazy(() => import('./BackgroundMusicNode').then(m => ({ default: m.BackgroundMusicNode }))),
  transition: lazy(() => import('./TransitionNode').then(m => ({ default: m.TransitionNode }))),

  // 即梦（字节AI）节点
  jimeng_image: lazy(() => import('./JimengImageNode').then(m => ({ default: m.JimengImageNode }))),
  jimeng_video: lazy(() => import('./JimengVideoNode').then(m => ({ default: m.JimengVideoNode }))),

  // 智谱 GLM 节点
  glm_text: lazy(() => import('./GlmTextNode').then(m => ({ default: m.GlmTextNode }))),
  glm_video: lazy(() => import('./GlmVideoNode').then(m => ({ default: m.GlmVideoNode }))),
  glm_tts: lazy(() => import('./GlmTtsNode').then(m => ({ default: m.GlmTtsNode }))),
  glm_multimodal: lazy(() => import('./GlmMultimodalNode').then(m => ({ default: m.GlmMultimodalNode }))),

  // 通义千问（阿里）节点
  qwen_text: lazy(() => import('./QwenTextNode').then(m => ({ default: m.QwenTextNode }))),
  qwen_coding: lazy(() => import('./QwenCodingNode').then(m => ({ default: m.QwenCodingNode }))),

  // Kimi（Moonshot）节点
  kimi_text: lazy(() => import('./KimiTextNode').then(m => ({ default: m.KimiTextNode }))),

  // 预览节点
  image_preview: lazy(() => import('./ImagePreviewNode').then(m => ({ default: m.ImagePreviewNode }))),
  video_preview: lazy(() => import('./VideoPreviewNode').then(m => ({ default: m.VideoPreviewNode }))),
  audio_preview: lazy(() => import('./AudioPreviewNode').then(m => ({ default: m.AudioPreviewNode }))),
  text_preview: lazy(() => import('./TextPreviewNode').then(m => ({ default: m.TextPreviewNode }))),

  // Skills 相关节点
  skills_data: lazy(() => import('./SkillsDataNode').then(m => ({ default: m.default }))),
  skills_task: lazy(() => import('./SkillsTaskNode').then(m => ({ default: m.default }))),

  // 输出节点（结束）
  output_node: lazy(() => import('./OutputNode').then(m => ({ default: m.OutputNode }))),
};
