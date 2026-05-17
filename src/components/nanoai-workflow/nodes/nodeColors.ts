/**
 * 节点功能语义颜色方案
 * 根据节点功能分类，使用统一的专业配色
 * • 输入节点：蓝色 #2196F3
 * • AI生成节点：绿色 #4CAF50
 * • 输出节点：橙色 #FF9800
 * • 工具节点：灰色 #607D8B
 */

export interface NodeColorScheme {
  // 标题颜色
  titleGradient: string;
  titleText: string;
  iconBg: string;
  iconText: string;

  // 边框颜色
  border: string;
  borderHover: string;

  // 背景颜色
  headerBg: string;
  headerBgHover: string;

  // 状态颜色
  statusRunning: string;
  statusSuccess: string;
  statusError: string;

  // 胶囊颜色（标题背景）
  pillGradient: string;
  pillBorder: string;
  pillGlow: string;
}

// 节点功能分类
export enum NodeFunctionCategory {
  INPUT = 'input',      // 输入节点 - 蓝色
  AI_GENERATOR = 'ai',  // AI生成节点 - 绿色
  OUTPUT = 'output',    // 输出节点 - 橙色
  TOOL = 'tool',        // 工具节点 - 灰色
}

// 功能分类颜色配置
const FUNCTION_COLOR_SCHEMES: Record<NodeFunctionCategory, NodeColorScheme> = {
  // 输入节点 - 蓝到深蓝双色渐变
  [NodeFunctionCategory.INPUT]: {
    titleGradient: 'from-blue-500 to-[#002FA7]',
    titleText: 'text-white', // 改为白色文字
    iconBg: 'bg-blue-500',
    iconText: 'text-white',
    border: 'border-blue-300',
    borderHover: 'hover:border-blue-400',
    headerBg: 'bg-gradient-to-r from-blue-500 to-[#002FA7]', // 深色渐变
    headerBgHover: 'hover:from-blue-600 hover:to-[#0038D0]',
    statusRunning: 'bg-blue-500',
    statusSuccess: 'bg-green-500',
    statusError: 'bg-red-500',
    // 胶囊颜色
    pillGradient: 'from-blue-500/80 to-[#002FA7]/80',
    pillBorder: 'from-blue-400 to-[#0038D0]',
    pillGlow: 'shadow-blue-500/50',
  },

  // AI生成节点 - 绿到蓝双色渐变
  [NodeFunctionCategory.AI_GENERATOR]: {
    titleGradient: 'from-green-500 to-blue-500',
    titleText: 'text-white', // 改为白色文字
    iconBg: 'bg-green-500',
    iconText: 'text-white',
    border: 'border-green-300',
    borderHover: 'hover:border-green-400',
    headerBg: 'bg-gradient-to-r from-green-500 to-blue-600', // 深色渐变
    headerBgHover: 'hover:from-green-600 hover:to-blue-700',
    statusRunning: 'bg-green-500',
    statusSuccess: 'bg-blue-500',
    statusError: 'bg-red-500',
    // 胶囊颜色
    pillGradient: 'from-green-500/80 to-blue-500/80',
    pillBorder: 'from-green-400 to-blue-400',
    pillGlow: 'shadow-green-500/50',
  },

  // 输出节点 - 橙到红双色渐变
  [NodeFunctionCategory.OUTPUT]: {
    titleGradient: 'from-orange-500 to-red-500',
    titleText: 'text-white', // 改为白色文字
    iconBg: 'bg-orange-500',
    iconText: 'text-white',
    border: 'border-orange-300',
    borderHover: 'hover:border-orange-400',
    headerBg: 'bg-gradient-to-r from-orange-500 to-red-600', // 深色渐变
    headerBgHover: 'hover:from-orange-600 hover:to-red-700',
    statusRunning: 'bg-orange-500',
    statusSuccess: 'bg-green-500',
    statusError: 'bg-red-500',
    // 胶囊颜色
    pillGradient: 'from-orange-500/80 to-red-500/80',
    pillBorder: 'from-orange-400 to-red-400',
    pillGlow: 'shadow-orange-500/50',
  },

  // 工具节点 - 灰到靛蓝双色渐变
  [NodeFunctionCategory.TOOL]: {
    titleGradient: 'from-slate-500 to-indigo-500',
    titleText: 'text-white', // 改为白色文字
    iconBg: 'bg-slate-500',
    iconText: 'text-white',
    border: 'border-slate-300',
    borderHover: 'hover:border-slate-400',
    headerBg: 'bg-gradient-to-r from-slate-500 to-indigo-600', // 深色渐变
    headerBgHover: 'hover:from-slate-600 hover:to-indigo-700',
    statusRunning: 'bg-slate-500',
    statusSuccess: 'bg-green-500',
    statusError: 'bg-red-500',
    // 胶囊颜色
    pillGradient: 'from-slate-500/80 to-indigo-500/80',
    pillBorder: 'from-slate-400 to-indigo-400',
    pillGlow: 'shadow-slate-500/50',
  },
};

// 节点类型到功能分类的映射
export const NODE_TYPE_TO_CATEGORY: Record<string, NodeFunctionCategory> = {
  // 输入节点 - 蓝色
  'input_text': NodeFunctionCategory.INPUT,
  'input_image': NodeFunctionCategory.INPUT,
  'text_input': NodeFunctionCategory.INPUT,

  // AI生成节点 - 绿色
  'script_generator': NodeFunctionCategory.AI_GENERATOR,
  'storyboard_generator': NodeFunctionCategory.AI_GENERATOR,
  'dialogue_generator': NodeFunctionCategory.AI_GENERATOR,
  'character_designer': NodeFunctionCategory.AI_GENERATOR,
  'scene_designer': NodeFunctionCategory.AI_GENERATOR,
  'screenwriter_agent': NodeFunctionCategory.AI_GENERATOR,
  'tvc_script': NodeFunctionCategory.AI_GENERATOR,
  'storyboard_video': NodeFunctionCategory.AI_GENERATOR,

  // 输出节点 - 橙色
  'output_preview': NodeFunctionCategory.OUTPUT,
  'output_export': NodeFunctionCategory.OUTPUT,
  'output_save': NodeFunctionCategory.OUTPUT,
  'milestone': NodeFunctionCategory.OUTPUT,

  // 工具节点 - 灰色
  'connector': NodeFunctionCategory.TOOL,
  'text_processor': NodeFunctionCategory.TOOL,
  'image_processor': NodeFunctionCategory.TOOL,
  'data_transformer': NodeFunctionCategory.TOOL,
  'director_agent': NodeFunctionCategory.TOOL,
};

/**
 * 获取节点颜色方案（浅色模式）
 */
export const getNodeColorScheme = (nodeType: string): NodeColorScheme => {
  const category = NODE_TYPE_TO_CATEGORY[nodeType] || NodeFunctionCategory.TOOL;
  return FUNCTION_COLOR_SCHEMES[category];
};

/**
 * 暗色模式节点颜色方案
 */
export const DARK_NODE_COLOR_SCHEMES: Record<NodeFunctionCategory, NodeColorScheme> = {
  // 输入节点 - 蓝到深蓝双色渐变
  [NodeFunctionCategory.INPUT]: {
    titleGradient: 'from-blue-400 to-[#0038D0]',
    titleText: 'text-white', // 改为白色文字
    iconBg: 'bg-blue-500/20',
    iconText: 'text-blue-400',
    border: 'border-blue-500/30',
    borderHover: 'hover:border-blue-500/50',
    headerBg: 'bg-gradient-to-r from-blue-500/80 to-[#002FA7]/80', // 深色渐变（半透明）
    headerBgHover: 'hover:from-blue-600/90 hover:to-[#0038D0]/90',
    statusRunning: 'bg-blue-500',
    statusSuccess: 'bg-green-500',
    statusError: 'bg-red-500',
    // 胶囊颜色
    pillGradient: 'from-blue-500/80 to-[#002FA7]/80',
    pillBorder: 'from-blue-400 to-[#0038D0]',
    pillGlow: 'shadow-blue-500/50',
  },

  // AI生成节点 - 绿到蓝双色渐变
  [NodeFunctionCategory.AI_GENERATOR]: {
    titleGradient: 'from-green-400 to-blue-400',
    titleText: 'text-white', // 改为白色文字
    iconBg: 'bg-green-500/20',
    iconText: 'text-green-400',
    border: 'border-green-500/30',
    borderHover: 'hover:border-green-500/50',
    headerBg: 'bg-gradient-to-r from-green-500/80 to-blue-600/80', // 深色渐变（半透明）
    headerBgHover: 'hover:from-green-600/90 hover:to-blue-700/90',
    statusRunning: 'bg-green-500',
    statusSuccess: 'bg-blue-500',
    statusError: 'bg-red-500',
    // 胶囊颜色
    pillGradient: 'from-green-500/80 to-blue-500/80',
    pillBorder: 'from-green-400 to-blue-400',
    pillGlow: 'shadow-green-500/50',
  },

  // 输出节点 - 橙到红双色渐变
  [NodeFunctionCategory.OUTPUT]: {
    titleGradient: 'from-orange-400 to-red-400',
    titleText: 'text-white', // 改为白色文字
    iconBg: 'bg-orange-500/20',
    iconText: 'text-orange-400',
    border: 'border-orange-500/30',
    borderHover: 'hover:border-orange-500/50',
    headerBg: 'bg-gradient-to-r from-orange-500/80 to-red-600/80', // 深色渐变（半透明）
    headerBgHover: 'hover:from-orange-600/90 hover:to-red-700/90',
    statusRunning: 'bg-orange-500',
    statusSuccess: 'bg-green-500',
    statusError: 'bg-red-500',
    // 胶囊颜色
    pillGradient: 'from-orange-500/80 to-red-500/80',
    pillBorder: 'from-orange-400 to-red-400',
    pillGlow: 'shadow-orange-500/50',
  },

  // 工具节点 - 灰到靛蓝双色渐变
  [NodeFunctionCategory.TOOL]: {
    titleGradient: 'from-slate-400 to-indigo-400',
    titleText: 'text-white', // 改为白色文字
    iconBg: 'bg-slate-500/20',
    iconText: 'text-slate-400',
    border: 'border-slate-500/30',
    borderHover: 'hover:border-slate-500/50',
    headerBg: 'bg-gradient-to-r from-slate-500/80 to-indigo-600/80', // 深色渐变（半透明）
    headerBgHover: 'hover:from-slate-600/90 hover:to-indigo-700/90',
    statusRunning: 'bg-slate-500',
    statusSuccess: 'bg-green-500',
    statusError: 'bg-red-500',
    // 胶囊颜色
    pillGradient: 'from-slate-500/80 to-indigo-500/80',
    pillBorder: 'from-slate-400 to-indigo-400',
    pillGlow: 'shadow-slate-500/50',
  },
};

/**
 * 获取暗色模式节点颜色方案
 */
export const getDarkNodeColorScheme = (nodeType: string): NodeColorScheme => {
  const category = NODE_TYPE_TO_CATEGORY[nodeType] || NodeFunctionCategory.TOOL;
  return DARK_NODE_COLOR_SCHEMES[category];
};

// 向后兼容：保留旧的导出格式
export const NODE_COLOR_SCHEMES: Record<string, NodeColorScheme> = Object.entries(
  NODE_TYPE_TO_CATEGORY
).reduce((acc, [nodeType, category]) => {
  acc[nodeType] = FUNCTION_COLOR_SCHEMES[category];
  return acc;
}, {} as Record<string, NodeColorScheme>);
