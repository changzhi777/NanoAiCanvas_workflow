import { lazy } from 'react';

// 节点导出索引
export { BaseNode, ParamEditor, ExecuteButton } from './BaseNode';
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
};
