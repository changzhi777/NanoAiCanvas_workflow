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
import uuid
from datetime import datetime
from typing import Optional, Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task, TaskStatus, TaskType
from app.schemas.storyboard import (
    StoryboardStyle,
    AspectRatio,
    SceneInfo,
    CharacterDesignInfo,
    CharacterAppearance,
    CharacterCostume,
    CharacterPersonality,
)
from app.providers.glm import GLMProvider
from app.services.image import ImageService
from app.config import settings


class StoryboardService:
    """故事板服务"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.glm_provider = GLMProvider()
        self.image_service = ImageService(session)

    def _get_api_key(self, provider_code: str) -> Optional[str]:
        """从数据库获取 API Key，失败返回 None（由调用方 fallback 到 settings）"""
        try:
            from app.models.api_provider import APIProvider, APIKey, KeyStatus
            from app.services.api_key_service import KeyEncryption
            from sqlmodel import Session as SyncSession
            from app.core.database import engine

            with SyncSession(engine) as sync_session:
                provider = sync_session.exec(
                    select(APIProvider).where(APIProvider.code == provider_code)
                ).first()
                if not provider:
                    return None
                key = sync_session.exec(
                    select(APIKey).where(
                        APIKey.provider_id == provider.id,
                        APIKey.status == KeyStatus.ACTIVE
                    ).order_by(APIKey.priority.desc())
                ).first()
                if not key:
                    return None
                return KeyEncryption.decrypt(key.encrypted_key)
        except Exception:
            return None

    async def save_to_library(
        self,
        user_id: int,
        storyboard_id: int,
        scene_indices: Optional[list[int]] = None,
    ) -> dict:
        """
        将故事板图片保存到资产库

        Args:
            user_id: 用户ID
            storyboard_id: 故事板任务ID
            scene_indices: 要保存的场景索引（None表示全部）

        Returns:
            保存结果
        """
        from app.models.library import ImageLibrary, OwnerType, ImageStatus, SyncStatus
        import uuid

        # 获取故事板任务
        storyboard_task = await self._get_storyboard_task(storyboard_id)
        if not storyboard_task or storyboard_task.user_id != user_id:
            return {
                "success": False,
                "message": "故事板不存在或无权访问",
                "saved_count": 0,
            }

        scenes_data = storyboard_task.result_data.get("scenes", [])
        total_scenes = len(scenes_data)

        # 确定要保存的场景
        if scene_indices:
            target_indices = [i for i in scene_indices if 0 <= i < total_scenes]
        else:
            target_indices = list(range(total_scenes))

        saved_count = 0
        saved_images = []

        for idx in target_indices:
            scene = scenes_data[idx]
            image_url = scene.get("image_url")

            if not image_url:
                continue

            # 生成 UUID
            image_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat()

            # 创建图片库记录
            image = ImageLibrary(
                id=image_id,
                owner_type=OwnerType.USER,
                owner_id=user_id,
                task_id=storyboard_id,
                prompt=scene.get("prompt", scene.get("description", "")),
                enhanced_prompt=None,
                negative_prompt=None,
                url=image_url,
                thumbnail_url=image_url,  # 使用相同URL作为缩略图
                width=1024,
                height=1024,
                file_size=None,
                file_format="jpg",
                status=ImageStatus.COMPLETED,
                is_favorite=False,
                is_public=False,
                tags=f'["storyboard", "scene_{idx}"]',
                category="storyboard",
                sync_status=SyncStatus.SYNCED,
                version=1,
                created_at=now,
                updated_at=now,
            )

            self.session.add(image)
            saved_images.append({
                "scene_index": idx,
                "image_id": image_id,
                "url": image_url,
            })
            saved_count += 1

        await self.session.commit()

        return {
            "success": True,
            "message": f"已保存 {saved_count} 张图片到资产库",
            "saved_count": saved_count,
            "saved_images": saved_images,
        }
    
    async def generate_script(
        self,
        user_id: int,
        story: str,
        style: StoryboardStyle = StoryboardStyle.CINEMATIC,
        aspect_ratio: AspectRatio = AspectRatio.RATIO_16_9,
        num_scenes: int = 6,
        include_dialogue: bool = True,
        include_camera: bool = True,
        language: str = "zh",
    ) -> dict:
        """生成分镜脚本（包含角色信息）"""
        # 构建生成提示词
        system_prompt = self._build_script_system_prompt(
            style, aspect_ratio, num_scenes, include_dialogue, include_camera, language
        )

        user_prompt = f"请为以下故事生成分镜脚本：\n\n{story}"

        # 调用GLM生成脚本
        result = await self.glm_provider.chat(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=4000,  # 增加token上限以容纳角色信息
        )

        # 解析生成的脚本和角色
        scenes, characters = self._parse_script_result(result, num_scenes)

        # 计算总时长
        total_duration = sum(s.duration or 0 for s in scenes)

        # 生成标题
        title = "未命名故事板"
        if scenes and scenes[0].description:
            title = scenes[0].description[:30]

        # 创建任务记录
        task = Task(
            user_id=user_id,
            task_type=TaskType.STORYBOARD_SCRIPT,
            status=TaskStatus.COMPLETED,
            prompt=story[:500],
            result_data={
                "title": title,
                "synopsis": story[:200],
                "style": style.value,
                "aspect_ratio": aspect_ratio.value,
                "characters": characters,  # 保存角色信息
                "scenes": [s.model_dump() for s in scenes],
                "total_duration": total_duration,
            },
            progress=100.0,
            message="分镜脚本生成完成",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
        )

        self.session.add(task)
        await self.session.flush()
        await self.session.refresh(task)

        return {
            "task_id": task.id,
            "status": "completed",
            "title": title,
            "synopsis": story[:200],
            "style": style,
            "aspect_ratio": aspect_ratio,
            "characters": characters,  # 返回角色信息
            "scenes": scenes,
            "total_duration": total_duration,
            "created_at": task.created_at.isoformat(),
        }
    
    async def generate_images(
        self,
        user_id: int,
        storyboard_id: int,
        scene_indices: Optional[list[int]] = None,
        image_size: str = "1024x1024",
        enhance_prompts: bool = True,
        parallel: bool = False,
        auto_save: bool = False,
    ) -> dict:
        """生成故事板图片"""
        from app.config import settings

        # 获取故事板任务
        storyboard_task = await self._get_storyboard_task(storyboard_id)
        if not storyboard_task or storyboard_task.user_id != user_id:
            return {
                "storyboard_id": storyboard_id,
                "total_scenes": 0,
                "completed": 0,
                "scenes": [],
            }

        scenes_data = storyboard_task.result_data.get("scenes", [])
        total_scenes = len(scenes_data)

        # 确定要生成的场景
        if scene_indices:
            target_indices = [i for i in scene_indices if 0 <= i < total_scenes]
        else:
            target_indices = list(range(total_scenes))

        scenes_status = []
        completed = 0

        # 检查是否为模拟模式（没有真实 API Key）
        # 优先从数据库获取，fallback 到 settings
        api_key_value = self._get_api_key("nanobanana") or settings.NANOBANANA_API_KEY
        is_mock_mode = not api_key_value or str(api_key_value).lower().strip() in ('mock', 'your-nanobanana-api-key-here', '')

        for idx in target_indices:
            scene = scenes_data[idx]
            prompt = scene.get("prompt", scene.get("description", ""))

            if is_mock_mode:
                # 模拟模式：直接返回占位图 URL
                import hashlib
                seed = abs(hash(f"{storyboard_id}_{idx}_{prompt}")) % 10000
                mock_url = f"https://picsum.photos/seed/{seed}/1024/1024"

                # 更新场景数据中的 image_url
                scene["image_url"] = mock_url

                scenes_status.append({
                    "scene_index": idx,
                    "status": "completed",
                    "task_id": None,
                    "image_url": mock_url,
                    "error": None,
                })
                completed += 1
            else:
                # 真实模式：创建图像生成任务
                task = await self.image_service.create_task(
                    user_id=user_id,
                    task_type=TaskType.STORYBOARD_IMAGE,
                    prompt=prompt,
                    config={
                        "size": image_size,
                        "storyboard_id": storyboard_id,
                        "scene_index": idx,
                    },
                    enhance_prompt=enhance_prompts,
                )

                task.storyboard_id = storyboard_id
                task.scene_index = idx
                await self.session.flush()

                scenes_status.append({
                    "scene_index": idx,
                    "status": "pending",
                    "task_id": task.id,
                    "image_url": None,
                    "error": None,
                })

        # 更新故事板任务的 result_data（保存场景图片 URL）
        storyboard_task.result_data["scenes"] = scenes_data
        storyboard_task.updated_at = datetime.utcnow()
        await self.session.flush()

        # 如果 auto_save 为 True，自动保存到资产库
        saved_to_library = False
        if auto_save and completed > 0:
            save_result = await self.save_to_library(
                user_id=user_id,
                storyboard_id=storyboard_id,
                scene_indices=target_indices,
            )
            saved_to_library = save_result.get("success", False)

        return {
            "storyboard_id": storyboard_id,
            "total_scenes": total_scenes,
            "completed": completed,
            "scenes": scenes_status,
            "saved_to_library": saved_to_library,
        }
    
    async def get_storyboard_task(self, task_id: int) -> Optional[Task]:
        """获取故事板任务"""
        result = await self.session.execute(
            select(Task).where(
                Task.id == task_id,
                Task.task_type == TaskType.STORYBOARD_SCRIPT,
            )
        )
        return result.scalar_one_or_none()
    
    async def list_user_storyboards(
        self,
        user_id: int,
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        """获取用户故事板列表"""
        offset = (page - 1) * page_size
        
        # 查询总数
        from sqlalchemy import func
        count_result = await self.session.execute(
            select(func.count(Task.id)).where(
                Task.user_id == user_id,
                Task.task_type == TaskType.STORYBOARD_SCRIPT,
            )
        )
        total = count_result.scalar() or 0
        
        # 分页查询
        result = await self.session.execute(
            select(Task)
            .where(
                Task.user_id == user_id,
                Task.task_type == TaskType.STORYBOARD_SCRIPT,
            )
            .order_by(Task.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        tasks = result.scalars().all()
        
        items = []
        for task in tasks:
            data = task.result_data or {}
            items.append({
                "id": task.id,
                "title": data.get("title", "未命名"),
                "synopsis": data.get("synopsis"),
                "style": data.get("style", "cinematic"),
                "aspect_ratio": data.get("aspect_ratio", "16:9"),
                "total_scenes": len(data.get("scenes", [])),
                "created_at": task.created_at.isoformat(),
            })
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    
    async def get_storyboard_detail(self, task_id: int, user_id: int) -> Optional[dict]:
        """获取故事板详情"""
        task = await self.get_storyboard_task(task_id)
        if not task or task.user_id != user_id:
            return None
        
        data = task.result_data or {}
        scenes = data.get("scenes", [])
        
        # 查询各场景的图像任务状态
        for scene in scenes:
            scene_idx = scene.get("index", 0)
            image_task_result = await self.session.execute(
                select(Task).where(
                    Task.storyboard_id == task_id,
                    Task.scene_index == scene_idx,
                    Task.task_type == TaskType.STORYBOARD_IMAGE,
                ).order_by(Task.created_at.desc())
            )
            image_task = image_task_result.scalar_one_or_none()
            
            if image_task:
                scene["image_status"] = image_task.status.value
                scene["image_url"] = image_task.result_url
            else:
                scene["image_status"] = "pending"
                scene["image_url"] = None
        
        return {
            "id": task.id,
            "title": data.get("title", "未命名"),
            "synopsis": data.get("synopsis"),
            "style": data.get("style", "cinematic"),
            "aspect_ratio": data.get("aspect_ratio", "16:9"),
            "scenes": scenes,
            "total_duration": data.get("total_duration"),
            "created_at": task.created_at.isoformat(),
            "updated_at": task.updated_at.isoformat(),
        }
    
    async def _get_storyboard_task(self, task_id: int) -> Optional[Task]:
        """获取故事板任务（内部方法）"""
        return await self.get_storyboard_task(task_id)
    
    def _build_script_system_prompt(
        self,
        style: StoryboardStyle,
        aspect_ratio: AspectRatio,
        num_scenes: int,
        include_dialogue: bool,
        include_camera: bool,
        language: str,
    ) -> str:
        """构建脚本生成系统提示"""
        style_descriptions = {
            StoryboardStyle.CINEMATIC: "电影感，注重光影和氛围",
            StoryboardStyle.ANIME: "日式动漫风格，色彩鲜艳",
            StoryboardStyle.COMIC: "漫画风格，强调动作和表情",
            StoryboardStyle.REALISTIC: "写实风格，注重细节",
            StoryboardStyle.WATERCOLOR: "水彩风格，柔和梦幻",
            StoryboardStyle.SKETCH: "素描风格，线条简洁",
        }

        dialogue_instruction = "为有对白的场景添加 dialogue 字段" if include_dialogue else "不需要对白"
        camera_instruction = "为每个场景添加 camera_movement 字段" if include_camera else "不需要镜头运动"

        prompt = f"""你是一个专业的分镜脚本创作专家。请为故事创建一个完整的分镜脚本。

风格要求：{style_descriptions.get(style, style_descriptions[StoryboardStyle.CINEMATIC])}
画面比例：{aspect_ratio.value}

【输出格式要求】
严格按以下 JSON 格式输出，不要包含 Markdown 标记或说明文字：
{{
  "title": "分镜标题",
  "synopsis": "故事梗概（50字以内）",
  "characters": [
    {{
      "id": "char_1",
      "name": "角色名",
      "role": "protagonist",
      "description": "角色简要描述",
      "appearance": {{
        "age": "年龄段",
        "gender": "性别",
        "build": "体型",
        "height": "身高",
        "hair_color": "发色",
        "hair_style": "发型",
        "eye_color": "瞳色",
        "skin_tone": "肤色",
        "distinctive_features": ["特征1"]
      }},
      "costume": {{
        "main_outfit": "主要服装",
        "accessories": ["配饰"],
        "colors": ["主色"]
      }},
      "personality": {{
        "traits": ["性格特点"],
        "mannerisms": ["习惯动作"]
      }}
    }}
  ],
  "scenes": [
    {{
      "index": 0,
      "shot_type": "镜头类型（远景/全景/中景/近景/特写）",
      "description": "场景详细描述",
      "dialogue": {{"character": "角色名", "text": "对白内容"}} or null,
      "action": "角色动作描述",
      "camera_movement": "镜头运动（推/拉/摇/移/跟/固定）",
      "duration": 5,
      "notes": "特殊注意",
      "prompt": "英文AI绘图提示词（包含风格、场景、角色、动作）"
    }}
  ]
}}

角色类型：protagonist（主角）、supporting（配角）、minor（群演）
{dialogue_instruction}
{camera_instruction}
场景数量：约 {num_scenes} 个"""

        return prompt
    
    def _parse_script_result(self, result: dict, expected_count: int) -> tuple[list[SceneInfo], list[dict]]:
        """解析脚本生成结果，返回 (scenes, characters)"""
        try:
            content = result.get("content", "")

            # 清理可能的 Markdown 代码块标记
            cleaned_content = content.strip()
            if cleaned_content.startswith("```"):
                lines = cleaned_content.split("\n")
                cleaned_content = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])

            # 尝试提取 JSON 对象
            import re
            json_match = re.search(r'\{[\s\S]*\}', cleaned_content)
            if not json_match:
                print(f"[parse_script] No JSON object found in response: {content[:200]}")
                return [], []

            data = json.loads(json_match.group())

            # 提取角色信息
            characters = []
            characters_data = data.get("characters", [])
            for char_data in characters_data:
                character = {
                    "id": char_data.get("id", f"char_{len(characters)+1}"),
                    "name": char_data.get("name", "未命名"),
                    "role": char_data.get("role", "minor"),
                    "description": char_data.get("description", ""),
                    "appearance": char_data.get("appearance", {}),
                    "costume": char_data.get("costume", {}),
                    "personality": char_data.get("personality", {}),
                }
                characters.append(character)

            # 提取场景信息
            scenes = []
            scenes_data = data.get("scenes", [])
            for i, scene_data in enumerate(scenes_data[:expected_count]):
                scene = SceneInfo(
                    index=scene_data.get("index", i),
                    shot_type=scene_data.get("shot_type", "中景"),
                    description=scene_data.get("description", ""),
                    dialogue=scene_data.get("dialogue"),
                    action=scene_data.get("action"),
                    camera_movement=scene_data.get("camera_movement"),
                    duration=scene_data.get("duration"),
                    notes=scene_data.get("notes"),
                    prompt=scene_data.get("prompt", scene_data.get("description", "")),
                    image_url=None,
                )
                scenes.append(scene)

            print(f"[parse_script] Parsed {len(scenes)} scenes and {len(characters)} characters")
            return scenes, characters

        except Exception as e:
            print(f"[parse_script] Parse error: {e}")
            import traceback
            traceback.print_exc()
            return [], []
    
    def _manual_parse(self, text: str) -> list[dict]:
        """手动解析文本"""
        # 简单的分段解析
        scenes = []
        lines = text.split("\n")
        current_scene = {}
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # 检测场景分隔
            if line.startswith("场景") or line.startswith("Scene"):
                if current_scene:
                    scenes.append(current_scene)
                current_scene = {"index": len(scenes)}
            elif ":" in line or "：" in line:
                key, value = line.replace("：", ":").split(":", 1)
                key = key.strip().lower()
                value = value.strip()
                
                key_mapping = {
                    "镜头": "shot_type",
                    "描述": "description",
                    "对白": "dialogue",
                    "动作": "action",
                    "镜头运动": "camera_movement",
                    "时长": "duration",
                    "备注": "notes",
                    "提示词": "prompt",
                }
                
                for k, v in key_mapping.items():
                    if k in key:
                        current_scene[v] = value
                        break
        
        if current_scene:
            scenes.append(current_scene)

        return scenes

    # ============ 角色设计相关方法 ============

    async def extract_characters(
        self,
        story: str,
        style: StoryboardStyle = StoryboardStyle.CINEMATIC,
        max_characters: int = 5,
    ) -> list[CharacterDesignInfo]:
        """
        从故事文本中提取角色设定

        Args:
            story: 故事文本
            style: 故事板风格
            max_characters: 最大角色数

        Returns:
            角色设计列表
        """
        prompt = f"""你是一个专业的角色设计师。请从以下故事中提取 {max_characters} 个主要角色。

故事内容：
{story}

风格要求：{style.value}

【输出要求】
- 严格按照下方 JSON Schema 输出
- 不要输出任何 Markdown 标记、代码块标记或说明文字
- 直接输出纯 JSON 数组

【JSON Schema】
[
  {{
    "id": "char_1",
    "name": "角色名",
    "role": "protagonist",
    "description": "角色简要描述",
    "appearance": {{
      "age": "年龄段",
      "gender": "性别",
      "build": "体型",
      "height": "身高",
      "hair_color": "发色",
      "hair_style": "发型",
      "eye_color": "瞳色",
      "skin_tone": "肤色",
      "distinctive_features": ["特征1", "特征2"]
    }},
    "costume": {{
      "main_outfit": "主要服装描述",
      "accessories": ["配饰1", "配饰2"],
      "colors": ["主色调", "辅色调"]
    }},
    "personality": {{
      "traits": ["性格特点1", "性格特点2"],
      "mannerisms": ["习惯动作1", "习惯动作2"]
    }}
  }}
]

角色类型说明：protagonist=主角, supporting=配角, minor=群演"""

        try:
            response = await self.glm_provider.chat(prompt)
            content = response.get("content", "")

            # 清理可能的 Markdown 代码块标记
            cleaned_content = content.strip()
            if cleaned_content.startswith("```"):
                # 移除 Markdown 代码块标记
                lines = cleaned_content.split("\n")
                cleaned_content = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])

            # 解析 JSON
            import re
            json_match = re.search(r'\[[\s\S]*\]', cleaned_content)
            if not json_match:
                print(f"[extract_characters] No JSON array found in response: {content[:200]}")
                return []

            characters_data = json.loads(json_match.group())
            characters = []

            for data in characters_data[:max_characters]:
                # 确保 appearance 数据完整
                appearance_data = data.get("appearance", {})
                if isinstance(appearance_data, dict):
                    appearance = CharacterAppearance(
                        age=appearance_data.get("age", "未知"),
                        gender=appearance_data.get("gender", "未知"),
                        build=appearance_data.get("build", "普通"),
                        height=appearance_data.get("height", "中等"),
                        hair_color=appearance_data.get("hair_color", "黑色"),
                        hair_style=appearance_data.get("hair_style", "普通"),
                        eye_color=appearance_data.get("eye_color", "黑色"),
                        skin_tone=appearance_data.get("skin_tone", "自然"),
                        distinctive_features=appearance_data.get("distinctive_features", []),
                    )
                else:
                    appearance = CharacterAppearance()

                # 确保 costume 数据完整
                costume_data = data.get("costume", {})
                if isinstance(costume_data, dict):
                    costume = CharacterCostume(
                        main_outfit=costume_data.get("main_outfit", "普通服装"),
                        accessories=costume_data.get("accessories", []),
                        colors=costume_data.get("colors", []),
                    )
                else:
                    costume = CharacterCostume()

                # 确保 personality 数据完整
                personality_data = data.get("personality", {})
                if isinstance(personality_data, dict):
                    personality = CharacterPersonality(
                        traits=personality_data.get("traits", []),
                        mannerisms=personality_data.get("mannerisms", []),
                    )
                else:
                    personality = CharacterPersonality()

                character = CharacterDesignInfo(
                    id=data.get("id", f"char_{len(characters)+1}"),
                    name=data.get("name", "未命名"),
                    role=data.get("role", "minor"),
                    description=data.get("description", ""),
                    appearance=appearance,
                    costume=costume,
                    personality=personality,
                )
                characters.append(character)

            print(f"[extract_characters] Extracted {len(characters)} characters")
            return characters

        except Exception as e:
            print(f"角色提取失败: {e}")
            import traceback
            traceback.print_exc()
            return []

    async def generate_character_designs(
        self,
        user_id: int,
        characters: list[CharacterDesignInfo],
        style: StoryboardStyle = StoryboardStyle.CINEMATIC,
    ) -> list[CharacterDesignInfo]:
        """
        为角色生成设计图

        Args:
            user_id: 用户ID
            characters: 角色列表
            style: 故事板风格

        Returns:
            包含设计图的角色列表
        """
        style_prompts = {
            StoryboardStyle.COMIC: "comic book character design sheet, black and white manga style, ink drawing, clear outlines, multiple views",
            StoryboardStyle.REALISTIC: "professional character design sheet, realistic film style, detailed rendering, production artwork",
            StoryboardStyle.ANIME: "anime character design sheet, Japanese animation style, clean lines, vibrant colors, character turnaround",
            StoryboardStyle.WATERCOLOR: "watercolor character design, soft brush strokes, artistic illustration, hand-painted style",
            StoryboardStyle.CINEMATIC: "cinematic character design sheet, professional film style, detailed rendering, production artwork",
            StoryboardStyle.SKETCH: "pencil sketch character design, rough sketch style, artistic drawing, hand-drawn",
        }

        style_prompt = style_prompts.get(style, style_prompts[StoryboardStyle.CINEMATIC])

        for character in characters:
            # 构建设计图提示词
            appearance = character.appearance
            costume = character.costume
            personality = character.personality

            design_prompt = f"""character design sheet, {character.name},
{appearance.age}, {appearance.gender}, {appearance.height}, {appearance.build},
{appearance.hair_color} {appearance.hair_style}, {appearance.eye_color} eyes, {appearance.skin_tone} skin,
{', '.join(appearance.distinctive_features) if appearance.distinctive_features else 'no distinctive features'},
wearing {costume.main_outfit}, {', '.join(costume.accessories) if costume.accessories else 'no accessories'},
color scheme: {', '.join(costume.colors) if costume.colors else 'default'},

layout: 3 full body standing poses (front view, side view, 3/4 angle) on the left,
4 face close-up expressions (smile, serious, surprised, sad) on the right in 2x2 grid,

personality hints: {', '.join(personality.traits) if personality.traits else 'neutral'},
{', '.join(personality.mannerisms) if personality.mannerisms else 'normal posture'},

{style_prompt},
white background, professional character design, clean lines, detailed, high quality,
reference sheet style, multiple views, character turnaround"""

            character.design_prompt = design_prompt

            try:
                # 调用图片生成服务
                image_result = await self.image_service.generate_image(
                    user_id=user_id,
                    prompt=design_prompt,
                    aspect_ratio="9:16",
                    style=style.value,
                )

                if image_result and image_result.get("image_url"):
                    character.image_url = image_result["image_url"]

            except Exception as e:
                print(f"角色 {character.name} 设计图生成失败: {e}")
                # 继续处理其他角色

        return characters
