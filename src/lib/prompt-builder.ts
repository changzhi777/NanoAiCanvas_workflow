// Simple prompt builder for storyboard nodes
export function buildPrompt(
  scene: string,
  style: string = 'realistic',
  extras?: { mood?: string; lighting?: string }
): string {
  let prompt = scene;
  const styleMap: Record<string, string> = {
    realistic: 'photorealistic, highly detailed, 8k resolution',
    anime: 'anime style, vibrant colors, detailed illustration',
    watercolor: 'watercolor painting, artistic, soft colors',
    oilpainting: 'oil painting, classical art style, rich textures',
    '3d': '3D render, CGI, high quality render',
  };
  if (styleMap[style]) prompt += `, ${styleMap[style]}`;
  if (extras?.mood) prompt += `, ${extras.mood} mood`;
  if (extras?.lighting) prompt += `, ${extras.lighting} lighting`;
  return prompt;
}