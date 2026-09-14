"""
Nano2 API - AI Image Generation Service

Copyright ©2026 IoTchange (外星动物/常智)
All Rights Reserved.

Author: 外星动物（常智）IoTchange
Email: 14455975@qq.com
Version: 2.2.2

本软件著作权归作者 IoTchange 完整所有。
商用需授权，开源使用需标明作者。
"""

import asyncio
import json
import re
from datetime import datetime
from typing import Optional, Callable, Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.pipeline import (
    PipelineStep,
    PipelineInput,
    ProgressInfo,
    StoryAnalysisResult,
    AdaptationOptions,
    PipelineResult,
)
from app.schemas.storyboard import (
    StoryboardStyle,
    CharacterDesignInfo,
    SceneInfo,
)
from app.providers.glm import GLMProvider
from app.services.image import ImageService
from app.core.redis_client import RedisClient


class StoryboardPipelineService:
    """故事板生成流水线服务

    完整的 9 步工作流：
    input → analyzing → adaptation → characters → char_design → storyboard → prompts → images → complete
    """

    def __init__(
        self,
        session: AsyncSession,
        text_api_key: Optional[str] = None,
        image_api_key: Optional[str] = None,
    ):
        self.session = session
        self.text_api_key = text_api_key
        self.image_api_key = image_api_key
        self.glm_provider = GLMProvider()
        self.image_service = ImageService(session)
        self.task_id = f"task_{int(datetime.utcnow().timestamp())}_{id(datetime.utcnow()).microsecond}"

    # ============ Step 1: 故事分析 ============

    async def analyze_story(
        self,
        input_text: str,
        on_progress: Optional[Callable[[ProgressInfo], None]] = None,
    ) -> StoryAnalysisResult:
        """分析故事结构和提取大纲"""
        progress_info = ProgressInfo(
            step=PipelineStep.ANALYZING,
            progress=5,
            message="正在分析故事结构...",
        )
        on_progress(progress_info) if on_progress else None

        system_prompt = """你是一个专业的剧本分析师。请分析以下故事内容，提取核心要素并生成结构化大纲。

输出要求:
1. 提取故事标题
2. 生成故事梗概(100-200字)
3. 分析故事结构(起承转合)
4. 提取主题(1-3个)
5. 确定整体情绪基调
6. 估算适合的场景数量(3-5分钟短剧建议6-10个场景)

输出格式(JSON):
{
  "title": "故事标题",
  "synopsis": "故事梗概...",
  "structure": {
    "setup": "故事的铺垫和背景",
    "conflict": "主要冲突和矛盾",
    "climax": "高潮和转折点",
    "resolution": "结局和解决",
    "hook": "结尾钩子/悬念"
  },
  "themes": ["主题1", "主题2"],
  "mood": "整体情绪",
  "estimatedScenes": 8
}
请只输出JSON，不要其他内容。"""

        user_prompt = f"请分析以下故事：\n\n{input_text}"

        try:
            response = await self.glm_provider.chat(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=2048,
            )

            content = response.get("content", "") if isinstance(response, dict) else str(response)

            # 解析 JSON 响应
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                data = json.loads(json_match.group())
                result = StoryAnalysisResult(
                    title=data.get("title", "未命名故事"),
                    synopsis=data.get("synopsis", input_text[:200]),
                    structure=data.get("structure", {}),
                    themes=data.get("themes", ["剧情"]),
                    mood=data.get("mood", "中性"),
                    estimated_scenes=data.get("estimatedScenes", 6),
                )
            else:
                # 返回默认结构
                result = StoryAnalysisResult(
                    title="未命名故事",
                    synopsis=input_text[:200],
                    structure={
                        "setup": "故事开始",
                        "conflict": "冲突发展",
                        "climax": "高潮",
                        "resolution": "结局",
                        "hook": "悬念",
                    },
                    themes=["剧情"],
                    mood="中性",
                    estimated_scenes=6,
                )

            progress_info.progress = 10
            progress_info.message = "故事分析完成"
            on_progress(progress_info) if on_progress else None

            return result

        except Exception as e:
            raise Exception(f"故事分析失败: {str(e)}")

    # ============ Step 2: 剧本改编 ============

    async def adapt_script(
        self,
        input_text: str,
        story_analysis: StoryAnalysisResult,
        options: AdaptationOptions,
        style: StoryboardStyle,
        on_progress: Optional[Callable[[ProgressInfo], None]] = None,
    ) -> str:
        """根据故事分析改编为短剧剧本"""
        mode_desc = (
            "扩写模式：3-4分钟短剧\n"
            " - 扩展高潮部分，增加戏剧冲突和情感张力\n"
            " - 保留后续剧情钩子，设置悬念\n"
            f" - 目标时长: {options.target_duration or 180}-{options.target_duration or 240}秒\n"
            " - 丰富角色内心戏和对白\n"
            " - 强化视觉表现力"
            if options.mode == "expanded"
            else "忠实原著模式：\n"
            " - 保持原故事的核心情节和节奏\n"
            " - 不增加或删减主要情节\n"
            " - 忠实还原原作风格"
        )

        progress_info = ProgressInfo(
            step=PipelineStep.ADAPTATION,
            progress=15,
            message=f"正在改编剧本({'扩写' if options.mode == 'expanded' else '忠实原著'}模式)...",
        )
        on_progress(progress_info) if on_progress else None

        system_prompt = f"""你是一个专业的短剧编剧。根据故事分析和大纲，创作一个完整的短剧剧本。

{mode_desc}

输出要求:
1. 标准影视剧本格式
2. 包含场景描述、角色对白、动作指示
3. 适合 {style.value} 风格的视觉呈现
4. 明确的角色设定
5. 清晰的场景划分({story_analysis.estimated_scenes or 6}-10个场景)

输出格式:
# 剧本标题

## 角色设定
- 角色名: 描述

## 第一场: 场景名
**场景**: 详细场景描述
**时间**: 时间设定
**人物**: 出场角色

(角色): 对白内容
[动作描述]

## 第二场: ...
...

请直接输出剧本内容，不要有其他说明。"""

        user_prompt = f"""故事分析:
{json.dumps(story_analysis.model_dump(), ensure_ascii=False)}

原始故事:
{input_text}

请根据以上内容创作短剧剧本。"""

        try:
            response = await self.glm_provider.chat(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=4096,
            )

            content = response.get("content", "") if isinstance(response, dict) else str(response)

            progress_info.progress = 20
            progress_info.message = "剧本改编完成"
            on_progress(progress_info) if on_progress else None

            return content

        except Exception as e:
            raise Exception(f"剧本改编失败: {str(e)}")

    # ============ Step 3: 提取角色 ============

    async def extract_characters(
        self,
        input_text: str,
        style: StoryboardStyle,
        on_progress: Optional[Callable[[ProgressInfo], None]] = None,
    ) -> list[dict]:
        """从故事文本中提取角色设定"""
        progress_info = ProgressInfo(
            step=PipelineStep.CHARACTERS,
            progress=20,
            message="正在提取角色...",
        )
        on_progress(progress_info) if on_progress else None

        system_prompt = f"""你是一个专业的角色设计师。根据故事文案，提取主要角色并生成详细的角色设定。

输出要求:
1. 提取 1-5 个主要角色
2. 为每个角色生成详细的外貌、服装、性格描述
3. 描述要具体,适合AI绘图生成角色设计图
4. 风格: {style.value}

输出格式(JSON):
[
  {{
    "id": "char_1",
    "name": "角色名",
    "role": "protagonist",
    "description": "角色描述",
    "appearance": {{
      "age": "20多岁",
      "gender": "男/女",
      "build": "身材",
      "height": "身高",
      "hairColor": "发色",
      "hairStyle": "发型",
      "eyeColor": "瞳色",
      "skinTone": "肤色",
      "distinctiveFeatures": ["特征1", "特征2"]
    }},
    "costume": {{
      "mainOutfit": "主要服装",
      "accessories": ["配饰1", "配饰2"],
      "colors": ["颜色1", "颜色2"]
    }},
    "personality": {{
      "traits": ["性格1", "性格2"],
      "mannerisms": ["习惯动作"]
    }}
  }}
]
请只输出JSON，不要其他内容。"""

        user_prompt = f"请根据以下故事内容提取角色: {input_text}"

        try:
            response = await self.glm_provider.chat(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=2048,
            )

            content = response.get("content", "") if isinstance(response, dict) else str(response)

            # 解析 JSON 响应
            json_match = re.search(r'\[[\s\S]*\]', content)
            characters = []
            if json_match:
                characters = json.loads(json_match.group())

            progress_info.progress = 25
            progress_info.message = f"角色提取完成，共 {len(characters)} 个角色"
            on_progress(progress_info) if on_progress else None

            return characters

        except Exception as e:
            print(f"角色提取失败: {e}")
            return []

    # ============ Step 4: 生成角色设计图 ============

    async def generate_character_designs(
        self,
        characters: list[dict],
        style: StoryboardStyle,
        user_id: int,
        on_progress: Optional[Callable[[ProgressInfo], None]] = None,
    ) -> list[dict]:
        """为角色生成设计图"""
        if not characters:
            return []

        progress_info = ProgressInfo(
            step=PipelineStep.CHAR_DESIGN,
            progress=25,
            message=f"正在生成 {len(characters)} 个角色设计图...",
        )
        on_progress(progress_info) if on_progress else None

        style_prompts = {
            StoryboardStyle.COMIC: "comic book character design sheet, black and white manga style, ink drawing, clear outlines, multiple views",
            StoryboardStyle.REALISTIC: "professional character design sheet, realistic film style, detailed rendering, production artwork",
            StoryboardStyle.ANIME: "anime character design sheet, Japanese animation style, clean lines, vibrant colors, character turnaround",
            StoryboardStyle.CINEMATIC: "cinematic character design sheet, professional film style, detailed rendering",
            StoryboardStyle.WATERCOLOR: "watercolor character design, soft brush strokes, artistic illustration, hand-painted style",
            StoryboardStyle.SKETCH: "pencil sketch character design, rough sketch style, artistic drawing, hand-drawn",
        }

        style_prompt = style_prompts.get(style, style_prompts[StoryboardStyle.CINEMATIC])

        for i, char in enumerate(characters):
            char_name = char.get("name", f"角色{i+1}")
            progress_info.progress = 25 + int((i / len(characters)) * 10)
            progress_info.message = f'正在生成角色 "{char_name}" 设计图...'
            on_progress(progress_info) if on_progress else None

            try:
                # 构建设计图提示词
                appearance = char.get("appearance", {})
                costume = char.get("costume", {})

                design_prompt = f"""character design sheet, {char_name},
{appearance.get('age', '未知')}, {appearance.get('gender', '未知')}, {appearance.get('height', '中等')}, {appearance.get('build', '普通')},
{appearance.get('hairColor', '黑色')} {appearance.get('hairStyle', '普通')}, {appearance.get('eyeColor', '黑色')} eyes, {appearance.get('skinTone', '自然')} skin,
{', '.join(appearance.get('distinctiveFeatures', [])) or 'no distinctive features'},
wearing {costume.get('mainOutfit', '普通服装')}, {', '.join(costume.get('accessories', [])) or 'no accessories'},
color scheme: {', '.join(costume.get('colors', [])) or 'default'},

layout: 3 full body standing poses (front view, side view, 3/4 angle) on the left,
4 face close-up expressions (smile, serious, surprised, sad) on the right in 2x2 grid,

{style_prompt},
white background, professional character design, clean lines, detailed, high quality,
reference sheet style, multiple views, character turnaround"""

                # 调用图片生成服务
                try:
                    image_result = await self.image_service.generate_image(
                        user_id=user_id,
                        prompt=design_prompt,
                        aspect_ratio="9:16",
                        style=style.value,
                    )
                    if image_result and image_result.get("image_url"):
                        char["imageUrl"] = image_result["image_url"]
                        char["designPrompt"] = design_prompt
                except Exception as img_error:
                    print(f"角色 {char_name} 设计图生成失败: {img_error}")
                    # 继续处理其他角色

            except Exception as e:
                print(f"处理角色 {char_name} 时出错: {e}")

        progress_info.progress = 35
        progress_info.message = f"角色设计完成，共 {len(characters)} 个"
        on_progress(progress_info) if on_progress else None

        return characters

    # ============ Step 5: 生成分镜脚本 ============

    async def generate_storyboard(
        self,
        script: str,
        style: StoryboardStyle,
        characters: list[dict],
        on_progress: Optional[Callable[[ProgressInfo], None]] = None,
    ) -> dict:
        """生成分镜脚本"""
        progress_info = ProgressInfo(
            step=PipelineStep.STORYBOARD,
            progress=40,
            message="正在生成分镜脚本...",
        )
        on_progress(progress_info) if on_progress else None

        char_info = "\n".join([
            f"{c.get('name', '未知')}: {c.get('description', '')}"
            for c in characters
        ]) if characters else "无角色信息"

        system_prompt = f"""你是一个分镜师。根据剧本生成详细的分镜脚本。

输出 6-10 个场景, 每个场景包含:
- id: 场景编号
- duration: 时长(秒)
- shotType: 景别(远景/全景/中景/近景/特写)
- description: 场景描述
- camera: 镜头运动
- dialogue: 对白/旁白
- prompt: 图像生成提示词

输出格式(JSON):
{{
  "title": "分镜标题",
  "totalDuration": "3:00",
  "scenes": [...],
  "characters": [...]
}}
请只输出JSON, 不要其他内容."""

        user_prompt = f"""请根据以下剧本生成分镜脚本:

剧本:
{script}

角色:
{char_info}

风格: {style.value}

请生成{len(characters) * 2 if characters else 6}个场景的分镜。"""

        try:
            response = await self.glm_provider.chat(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=4096,
            )

            content = response.get("content", "") if isinstance(response, dict) else str(response)

            # 解析 JSON 响应
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                storyboard = json.loads(json_match.group())
            else:
                storyboard = {
                    "title": "Untitled Storyboard",
                    "totalDuration": "3:00",
                    "scenes": [],
                    "characters": [],
                }

            progress_info.progress = 50
            progress_info.message = f"分镜脚本生成完成，共 {len(storyboard.get('scenes', []))} 个场景"
            on_progress(progress_info) if on_progress else None

            return storyboard

        except Exception as e:
            raise Exception(f"分镜脚本生成失败: {str(e)}")

    # ============ Step 6: 生成图片 ============

    async def generate_images(
        self,
        storyboard: dict,
        style: StoryboardStyle,
        characters: list[dict],
        user_id: int,
        on_progress: Optional[Callable[[ProgressInfo], None]] = None,
    ) -> list[str]:
        """生成场景图片"""
        progress_info = ProgressInfo(
            step=PipelineStep.IMAGES,
            progress=50,
            message="正在生成场景图片...",
        )
        on_progress(progress_info) if on_progress else None

        scenes = storyboard.get("scenes", [])
        images = []

        style_prompts = {
            StoryboardStyle.COMIC: "comic book style, black and white manga panel, ink drawing, screentone, clear outlines, storyboard frame",
            StoryboardStyle.REALISTIC: "cinematic storyboard sketch, realistic film style, professional storyboard artist, pencil sketch",
            StoryboardStyle.ANIME: "anime storyboard style, Japanese animation, clean lines, vibrant colors, anime production art",
            StoryboardStyle.CINEMATIC: "cinematic storyboard, film style, professional, detailed, dramatic lighting",
            StoryboardStyle.WATERCOLOR: "watercolor storyboard style, soft brush strokes, artistic illustration, hand-painted look",
            StoryboardStyle.SKETCH: "pencil sketch storyboard, rough sketch style, artistic drawing, hand-drawn",
        }

        style_prompt = style_prompts.get(style, style_prompts[StoryboardStyle.CINEMATIC])

        # 构建角色描述
        char_descs = []
        if characters:
            for c in characters:
                appearance = c.get("appearance", {})
                costume = c.get("costume", {})
                char_descs.append(
                    f"{c.get('name', '未知')}: {appearance.get('age', '')}, {appearance.get('gender', '')}, "
                    f"{appearance.get('build', '')}, {appearance.get('hairColor', '')} {appearance.get('hairStyle', '')}, "
                    f"{costume.get('mainOutfit', '')}"
                )
        elif storyboard.get("characters"):
            for c in storyboard["characters"]:
                char_descs.append(f"{c.get('name', '未知')}: {c.get('description', '')}")

        for i, scene in enumerate(scenes):
            progress_info.progress = 50 + int(((i + 1) / len(scenes)) * 45)
            progress_info.message = f"正在生成图片 {i + 1}/{len(scenes)}..."
            on_progress(progress_info) if on_progress else None

            try:
                description = scene.get("description", "")
                shot_type = scene.get("shotType", "中景")

                shot_type_prompts = {
                    "远景": "wide establishing shot",
                    "全景": "full shot",
                    "中景": "medium shot",
                    "近景": "close-up shot",
                    "特写": "extreme close-up",
                    "大特写": "extreme close-up detail",
                }
                shot_prompt = shot_type_prompts.get(shot_type, "medium shot")

                prompt = f"""A {style.value} style storyboard panel.

Scene {scene.get('id', i + 1)}: {description}
Shot: {shot_prompt}
Camera: {scene.get('camera', '固定镜头')}

Character: {'; '.join(char_descs) if char_descs else 'None'}

Visual details:
- High quality
- Cinematic lighting
- Dynamic composition
- Clear focus
- {style_prompt} style elements"""

                # 调用图片生成
                image_result = await self.image_service.generate_image(
                    user_id=user_id,
                    prompt=prompt,
                    aspect_ratio="9:16",
                    style=style.value,
                )

                if image_result and image_result.get("image_url"):
                    images.append(image_result["image_url"])
                    scene["imageUrl"] = image_result["image_url"]
                else:
                    images.append("")

            except Exception as e:
                print(f"图片 {i + 1} 生成失败: {e}")
                images.append("")

        progress_info.step = PipelineStep.STORYBOARD  # 使用正确的完成步骤
        progress_info.progress = 100
        progress_info.message = "全部生成完成!"
        on_progress(progress_info) if on_progress else None

        return images

    # ============ 主流水线执行方法 ============

    async def run_pipeline(
        self,
        input_data: PipelineInput,
        user_id: int,
        on_progress: Optional[Callable[[ProgressInfo], Any]] = None,
    ) -> PipelineResult:
        """执行完整的流水线"""
        result = PipelineResult(
            task_id=self.task_id,
            status="processing",
            characters=[],
            script=None,
            storyboard=None,
            images=[],
        )

        try:
            # Step 0: 输入处理
            if on_progress:
                await on_progress(ProgressInfo(
                    step=PipelineStep.INPUT,
                    progress=0,
                    message="开始处理输入...",
                ))

            # Step 1: 故事分析
            story_analysis = await self.analyze_story(
                input_data.input_text,
                on_progress=on_progress if asyncio.iscoroutinefunction(on_progress) else None,
            )

            # Step 2: 剧本改编
            adaptation_options = input_data.adaptation_options or AdaptationOptions()
            script = await self.adapt_script(
                input_data.input_text,
                story_analysis,
                adaptation_options,
                input_data.style,
                on_progress=on_progress if asyncio.iscoroutinefunction(on_progress) else None,
            )
            result.script = script

            # Step 3: 提取角色
            characters = []
            if not input_data.skip_characters:
                characters = await self.extract_characters(
                    input_data.input_text,
                    input_data.style,
                    on_progress=on_progress if asyncio.iscoroutinefunction(on_progress) else None,
                )

                # Step 4: 生成角色设计图
                if characters:
                    characters = await self.generate_character_designs(
                        characters,
                        input_data.style,
                        user_id,
                        on_progress=on_progress if asyncio.iscoroutinefunction(on_progress) else None,
                    )

            result.characters = characters

            # Step 5: 生成分镜脚本
            storyboard = await self.generate_storyboard(
                script,
                input_data.style,
                characters,
                on_progress=on_progress if asyncio.iscoroutinefunction(on_progress) else None,
            )
            result.storyboard = storyboard

            # Step 6: 生成图片
            images = await self.generate_images(
                storyboard,
                input_data.style,
                characters,
                user_id,
                on_progress=on_progress if asyncio.iscoroutinefunction(on_progress) else None,
            )
            result.images = images

            result.status = "success"
            result.completed_at = datetime.utcnow().isoformat()

            return result

        except Exception as e:
            result.status = "failed"
            result.error = str(e)
            raise

    def get_task_id(self) -> str:
        """获取任务ID"""
        return self.task_id


# ============ 工厂函数 ============

def create_storyboard_pipeline(
    session: AsyncSession,
    text_api_key: Optional[str] = None,
    image_api_key: Optional[str] = None,
) -> StoryboardPipelineService:
    """创建流水线服务实例"""
    return StoryboardPipelineService(
        session=session,
        text_api_key=text_api_key,
        image_api_key=image_api_key,
    )
