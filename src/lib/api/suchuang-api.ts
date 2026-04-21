/**
 * NanoAI Workflow API服务
 * 速创API文档地址: https://api.wuyinkeji.com/doc/65
 */

const API_BASE_URL = 'https://api.wuyinkeji.com/api';
const API_KEY = 'dM2Gez6cbTHkRaKdoki5NBN3qc';

// ==================== 类型定义 ====================

export interface NanoaiGenerateImageParams {
  prompt: string;           // 提示词（必填）
  size?: '1K' | '2K' | '4K'; // 输出图像大小，默认1K
  aspectRatio?: 'auto' | '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3' | '5:4' | '4:5' | '21:9'; // 输出图像比例，默认auto
  urls?: string[];          // 参考图URL or Base64（可选）
}

export interface SuchuangAsyncResponse {
  code: number;
  msg: string;
  data: {
    id: string;
    count: number;
  };
  exec_time: number;
  ip: string;
}

export interface SuchuangResultResponse {
  code: number;
  msg: string;
  data: {
    id: string;
    status: 'processing' | 'succeeded' | 'failed';
    images?: string[];  // 生成的图片URL数组
    error?: string;
  };
  exec_time: number;
  ip: string;
}

// ==================== API函数 ====================

/**
 * 生成图片（异步）
 * @param params 生成参数
 * @returns 请求ID
 */
export async function generateNanoaiImage(
  params: NanoaiGenerateImageParams
): Promise<string> {
  const url = `${API_BASE_URL}/async/image_nanoBanana2?key=${API_KEY}`;

  const requestBody = new URLSearchParams();
  requestBody.append('prompt', params.prompt);
  if (params.size) requestBody.append('size', params.size);
  if (params.aspectRatio) requestBody.append('aspectRatio', params.aspectRatio);
  if (params.urls && params.urls.length > 0) {
    requestBody.append('urls', JSON.stringify(params.urls));
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded;charset:utf-8',
      },
      body: requestBody,
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    const result: SuchuangAsyncResponse = await response.json();

    if (result.code !== 200) {
      throw new Error(`API返回错误: ${result.msg}`);
    }

    return result.data.id;
  } catch (error) {
    console.error('生成图片失败:', error);
    throw error;
  }
}

/**
 * 查询生成结果
 * @param requestId 请求ID
 * @returns 生成结果
 */
export async function getNanoaiResult(
  requestId: string
): Promise<SuchuangResultResponse['data']> {
  const url = `${API_BASE_URL}/async/image_result?key=${API_KEY}&id=${requestId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    const result: SuchuangResultResponse = await response.json();

    if (result.code !== 200) {
      throw new Error(`API返回错误: ${result.msg}`);
    }

    return result.data;
  } catch (error) {
    console.error('查询生成结果失败:', error);
    throw error;
  }
}

/**
 * 轮询获取生成结果（等待生成完成）
 * @param requestId 请求ID
 * @param maxAttempts 最大尝试次数（默认30次）
 * @param interval 轮询间隔（毫秒，默认2000ms）
 * @returns 生成的图片URL数组
 */
export async function pollNanoaiResult(
  requestId: string,
  maxAttempts: number = 30,
  interval: number = 2000
): Promise<string[]> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const result = await getNanoaiResult(requestId);

      if (result.status === 'succeeded' && result.images) {
        return result.images;
      }

      if (result.status === 'failed') {
        throw new Error(result.error || '图片生成失败');
      }

      // 还在处理中，继续轮询
      attempts++;
      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error) {
      if (attempts >= maxAttempts - 1) {
        throw error;
      }
      attempts++;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  throw new Error('图片生成超时，请稍后重试');
}

/**
 * 一站式生成图片（自动轮询）
 * @param params 生成参数
 * @param onProgress 进度回调
 * @returns 生成的图片URL数组
 */
export async function generateNanoaiImageWithPolling(
  params: NanoaiGenerateImageParams,
  onProgress?: (status: string, progress: number) => void
): Promise<string[]> {
  try {
    // 步骤1：提交生成请求
    onProgress?.('提交生成请求...', 10);
    const requestId = await generateNanoaiImage(params);

    // 步骤2：轮询获取结果
    onProgress?.('正在生成图片...', 30);
    const images = await pollNanoaiResult(
      requestId,
      30,  // 最多30次尝试
      2000 // 每2秒轮询一次
    );

    onProgress?.('生成完成！', 100);
    return images;
  } catch (error) {
    onProgress?.('生成失败', 0);
    throw error;
  }
}

// ==================== 辅助函数 ====================

/**
 * 构建分镜提示词
 * @param sceneDescription 场景描述
 * @param style 风格
 * @param additionalParams 额外参数
 * @returns 完整提示词
 */
export function buildStoryboardPrompt(
  sceneDescription: string,
  style: string = 'realistic',
  additionalParams?: {
    mood?: string;
    lighting?: string;
    cameraAngle?: string;
  }
): string {
  let prompt = sceneDescription;

  // 添加风格
  const styleMap: Record<string, string> = {
    realistic: 'photorealistic, highly detailed, 8k resolution',
    anime: 'anime style, vibrant colors, detailed illustration',
    watercolor: 'watercolor painting, artistic, soft colors',
    oilpainting: 'oil painting, classical art style, rich textures',
    '3d': '3D render, CGI, high quality render',
    cyberpunk: 'cyberpunk style, neon lights, futuristic',
    steampunk: 'steampunk style, victorian era, mechanical',
    fantasy: 'fantasy art, magical, ethereal',
  };

  if (styleMap[style]) {
    prompt += `, ${styleMap[style]}`;
  }

  // 添加额外参数
  if (additionalParams) {
    if (additionalParams.mood) prompt += `, ${additionalParams.mood} mood`;
    if (additionalParams.lighting) prompt += `, ${additionalParams.lighting} lighting`;
    if (additionalParams.cameraAngle) prompt += `, ${additionalParams.cameraAngle} camera angle`;
  }

  return prompt;
}

/**
 * 构建角色设计提示词
 * @param characterInfo 角色描述
 * @param style 风格
 * @param pose 姿势
 * @param expression 表情
 * @returns 完整提示词
 */
export function buildCharacterPrompt(
  characterInfo: string,
  style: string = 'anime',
  pose: string = 'standing',
  expression: string = 'smile'
): string {
  let prompt = `character design of ${characterInfo}`;

  const styleMap: Record<string, string> = {
    anime: 'anime style, manga art, detailed character design',
    realistic: 'photorealistic, hyperrealistic, highly detailed portrait',
    comic: 'comic book style, graphic novel art, bold lines',
    chibi: 'chibi style, cute, small proportions',
    ink: 'ink wash painting, chinese art style, brush strokes',
  };

  if (styleMap[style]) {
    prompt += `, ${styleMap[style]}`;
  }

  const poseMap: Record<string, string> = {
    standing: 'standing pose, full body',
    sitting: 'sitting pose',
    walking: 'walking pose, dynamic',
    running: 'running pose, action shot',
    fighting: 'fighting stance, action pose',
  };

  if (poseMap[pose]) {
    prompt += `, ${poseMap[pose]}`;
  }

  const expressionMap: Record<string, string> = {
    smile: 'smiling, happy expression',
    serious: 'serious expression',
    angry: 'angry expression',
    sad: 'sad expression',
    surprised: 'surprised expression',
  };

  if (expressionMap[expression]) {
    prompt += `, ${expressionMap[expression]}`;
  }

  prompt += ', professional character design, high quality';

  return prompt;
}

/**
 * 构建场景设计提示词
 * @param sceneDescription 场景描述
 * @param style 风格
 * @param timeOfDay 时间
 * @param weather 天气
 * @param mood 氛围
 * @returns 完整提示词
 */
export function buildScenePrompt(
  sceneDescription: string,
  style: string = 'photorealistic',
  timeOfDay: string = 'morning',
  weather: string = 'sunny',
  mood: string = 'warm'
): string {
  let prompt = `scene of ${sceneDescription}`;

  const styleMap: Record<string, string> = {
    photorealistic: 'photorealistic, highly detailed, 8k resolution, professional photography',
    oilpainting: 'oil painting, classical art, rich textures, masterpiece',
    watercolor: 'watercolor painting, artistic, soft colors',
    cyberpunk: 'cyberpunk style, neon lights, futuristic city',
    steampunk: 'steampunk style, victorian era, mechanical details',
    fantasy: 'fantasy art, magical, ethereal atmosphere',
  };

  if (styleMap[style]) {
    prompt += `, ${styleMap[style]}`;
  }

  const timeMap: Record<string, string> = {
    dawn: 'dawn lighting, golden hour, sunrise',
    morning: 'morning light, bright and clear',
    noon: 'noon lighting, direct sunlight',
    dusk: 'dusk lighting, golden hour, sunset',
    night: 'night scene, moody lighting',
  };

  if (timeMap[timeOfDay]) {
    prompt += `, ${timeMap[timeOfDay]}`;
  }

  const weatherMap: Record<string, string> = {
    sunny: 'sunny weather, clear sky',
    cloudy: 'cloudy weather, overcast',
    rainy: 'rainy weather, raindrops, wet surfaces',
    snowy: 'snowy weather, snow falling',
    foggy: 'foggy atmosphere, mist',
    stormy: 'stormy weather, dramatic clouds',
  };

  if (weatherMap[weather]) {
    prompt += `, ${weatherMap[weather]}`;
  }

  const moodMap: Record<string, string> = {
    warm: 'warm atmosphere, cozy feeling',
    mysterious: 'mysterious atmosphere, enigmatic',
    tense: 'tense atmosphere, dramatic',
    peaceful: 'peaceful and serene',
    epic: 'epic scale, grandeur',
    horror: 'horror atmosphere, scary',
  };

  if (moodMap[mood]) {
    prompt += `, ${moodMap[mood]}`;
  }

  return prompt;
}
