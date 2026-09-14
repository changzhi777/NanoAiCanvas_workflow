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

from enum import Enum
from typing import Optional, Any

from pydantic import BaseModel, Field


class StoryboardStyle(str, Enum):
    """故事板风格"""
    
    CINEMATIC = "cinematic"      # 电影风格
    ANIME = "anime"              # 动漫风格
    COMIC = "comic"              # 漫画风格
    REALISTIC = "realistic"      # 写实风格
    WATERCOLOR = "watercolor"    # 水彩风格
    SKETCH = "sketch"            # 素描风格


class AspectRatio(str, Enum):
    """画面比例"""
    
    RATIO_16_9 = "16:9"          # 宽屏
    RATIO_4_3 = "4:3"            # 标准
    RATIO_1_1 = "1:1"            # 正方形
    RATIO_9_16 = "9:16"          # 竖屏
    RATIO_21_9 = "21:9"          # 超宽


class SceneInfo(BaseModel):
    """场景信息"""
    
    index: int = Field(..., ge=0, description="场景索引")
    shot_type: str = Field(..., description="镜头类型")
    description: str = Field(..., description="场景描述")
    dialogue: Optional[str] = Field(None, description="对白")
    action: Optional[str] = Field(None, description="动作描述")
    camera_movement: Optional[str] = Field(None, description="镜头运动")
    duration: Optional[float] = Field(None, ge=0, description="时长（秒）")
    notes: Optional[str] = Field(None, description="备注")
    prompt: str = Field(..., description="图像生成提示词")
    image_url: Optional[str] = Field(None, description="生成的图像URL")
    
    class Config:
        json_schema_extra = {
            "example": {
                "index": 0,
                "shot_type": "中景",
                "description": "一个年轻人站在城市天台上，望着远方的夕阳",
                "dialogue": "我们终究会到达那里",
                "action": "缓缓转身",
                "camera_movement": "缓慢推进",
                "duration": 5.0,
                "notes": "注意光线要柔和",
                "prompt": "一个年轻人站在城市天台上，望着远方的夕阳，电影感，金色光芒",
                "image_url": None
            }
        }


class StoryboardScriptRequest(BaseModel):
    """故事板脚本生成请求"""
    
    story: str = Field(..., min_length=10, max_length=5000, description="故事文本")
    style: StoryboardStyle = Field(default=StoryboardStyle.CINEMATIC, description="故事板风格")
    aspect_ratio: AspectRatio = Field(default=AspectRatio.RATIO_16_9, description="画面比例")
    num_scenes: int = Field(default=6, ge=3, le=20, description="场景数量")
    include_dialogue: bool = Field(default=True, description="是否包含对白")
    include_camera: bool = Field(default=True, description="是否包含镜头信息")
    language: str = Field(default="zh", description="输出语言")
    
    class Config:
        json_schema_extra = {
            "example": {
                "story": "一个年轻的冒险家踏上了寻找传说中失落城市的旅程。在穿越丛林、沙漠和高山后，他终于找到了那座被遗忘的城市，发现了比黄金更珍贵的东西——真正的友谊。",
                "style": "cinematic",
                "aspect_ratio": "16:9",
                "num_scenes": 6,
                "include_dialogue": True,
                "include_camera": True,
                "language": "zh"
            }
        }


class StoryboardScriptResponse(BaseModel):
    """故事板脚本生成响应"""

    task_id: int = Field(..., description="任务ID")
    status: str = Field(..., description="任务状态")
    title: Optional[str] = Field(None, description="故事标题")
    synopsis: Optional[str] = Field(None, description="故事摘要")
    style: StoryboardStyle = Field(..., description="故事板风格")
    aspect_ratio: AspectRatio = Field(..., description="画面比例")
    characters: list[dict] = Field(default_factory=list, description="角色列表")
    scenes: list[SceneInfo] = Field(default_factory=list, description="场景列表")
    total_duration: Optional[float] = Field(None, description="总时长（秒）")
    created_at: str = Field(..., description="创建时间")
    
    class Config:
        json_schema_extra = {
            "example": {
                "task_id": 1,
                "status": "completed",
                "title": "寻找失落的城市",
                "synopsis": "一个关于冒险与友谊的故事",
                "style": "cinematic",
                "aspect_ratio": "16:9",
                "scenes": [
                    {
                        "index": 0,
                        "shot_type": "远景",
                        "description": "日出时分，一座繁华的城市全景",
                        "prompt": "日出时分的城市全景，金色阳光洒落，电影感",
                        "image_url": None
                    }
                ],
                "total_duration": 30.0,
                "created_at": "2026-01-01T00:00:00"
            }
        }


class StoryboardImagesRequest(BaseModel):
    """故事板图片生成请求"""

    storyboard_id: int = Field(..., description="故事板ID")
    scene_indices: Optional[list[int]] = Field(None, description="指定场景索引（不填则生成全部）")
    image_size: str = Field(default="1024x1024", description="图像尺寸")
    enhance_prompts: bool = Field(default=True, description="是否增强提示词")
    parallel: bool = Field(default=False, description="是否并行生成")
    auto_save: bool = Field(default=False, description="是否自动保存到资产库")

    class Config:
        json_schema_extra = {
            "example": {
                "storyboard_id": 1,
                "scene_indices": [0, 1, 2],
                "image_size": "1024x1024",
                "enhance_prompts": True,
                "parallel": False,
                "auto_save": False
            }
        }


class SceneImageStatus(BaseModel):
    """场景图片状态"""
    
    scene_index: int = Field(..., description="场景索引")
    status: str = Field(..., description="状态")
    task_id: Optional[int] = Field(None, description="任务ID")
    image_url: Optional[str] = Field(None, description="图像URL")
    error: Optional[str] = Field(None, description="错误信息")
    
    class Config:
        json_schema_extra = {
            "example": {
                "scene_index": 0,
                "status": "completed",
                "task_id": 1,
                "image_url": "https://example.com/images/scene_0.png",
                "error": None
            }
        }


class StoryboardImagesResponse(BaseModel):
    """故事板图片生成响应"""

    storyboard_id: int = Field(..., description="故事板ID")
    total_scenes: int = Field(..., description="总场景数")
    completed: int = Field(..., description="已完成数")
    scenes: list[SceneImageStatus] = Field(..., description="场景状态列表")
    saved_to_library: bool = Field(default=False, description="是否已保存到资产库")

    class Config:
        json_schema_extra = {
            "example": {
                "storyboard_id": 1,
                "total_scenes": 6,
                "completed": 6,
                "scenes": [
                    {
                        "scene_index": 0,
                        "status": "completed",
                        "task_id": None,
                        "image_url": "https://picsum.photos/seed/1234/1024/1024",
                        "error": None
                    }
                ],
                "saved_to_library": False
            }
        }


class StoryboardDetail(BaseModel):
    """故事板详情"""

    id: int = Field(..., description="故事板ID")
    title: str = Field(..., description="标题")
    synopsis: Optional[str] = Field(None, description="摘要")
    style: StoryboardStyle = Field(..., description="风格")
    aspect_ratio: AspectRatio = Field(..., description="画面比例")
    scenes: list[SceneInfo] = Field(..., description="场景列表")
    characters: list["CharacterDesignInfo"] = Field(default_factory=list, description="角色设计列表")
    total_duration: Optional[float] = Field(None, description="总时长")
    created_at: str = Field(..., description="创建时间")
    updated_at: str = Field(..., description="更新时间")

    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "title": "寻找失落的城市",
                "synopsis": "一个关于冒险与友谊的故事",
                "style": "cinematic",
                "aspect_ratio": "16:9",
                "scenes": [],
                "characters": [],
                "total_duration": 30.0,
                "created_at": "2026-01-01T00:00:00",
                "updated_at": "2026-01-01T00:00:00"
            }
        }


# ============ 角色设计相关 Schema ============

class CharacterAppearance(BaseModel):
    """角色外貌"""

    age: str = Field(..., description="年龄段")
    gender: str = Field(..., description="性别")
    build: str = Field(..., description="体型")
    height: str = Field(..., description="身高")
    hair_color: str = Field(..., description="发色")
    hair_style: str = Field(..., description="发型")
    eye_color: str = Field(..., description="瞳色")
    skin_tone: str = Field(..., description="肤色")
    distinctive_features: list[str] = Field(default_factory=list, description="特征")


class CharacterCostume(BaseModel):
    """角色服装"""

    main_outfit: str = Field(..., description="主要服装")
    accessories: list[str] = Field(default_factory=list, description="配饰")
    colors: list[str] = Field(default_factory=list, description="颜色")


class CharacterPersonality(BaseModel):
    """角色性格"""

    traits: list[str] = Field(default_factory=list, description="性格特点")
    mannerisms: list[str] = Field(default_factory=list, description="习惯动作")


class CharacterDesignInfo(BaseModel):
    """角色设计信息"""

    id: str = Field(..., description="角色ID")
    name: str = Field(..., description="角色名")
    role: str = Field(..., description="角色类型：protagonist/supporting/minor")
    description: str = Field(..., description="角色描述")
    appearance: CharacterAppearance = Field(..., description="外貌")
    costume: CharacterCostume = Field(..., description="服装")
    personality: CharacterPersonality = Field(default_factory=CharacterPersonality, description="性格")
    design_prompt: Optional[str] = Field(None, description="设计图提示词")
    image_url: Optional[str] = Field(None, description="设计图URL")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "char_1",
                "name": "小明",
                "role": "protagonist",
                "description": "一个充满冒险精神的年轻人",
                "appearance": {
                    "age": "20岁左右",
                    "gender": "男",
                    "build": "身材匀称",
                    "height": "175cm",
                    "hair_color": "黑色",
                    "hair_style": "短发",
                    "eye_color": "棕色",
                    "skin_tone": "健康小麦色",
                    "distinctive_features": ["左眼角有颗小痣"]
                },
                "costume": {
                    "main_outfit": "蓝色探险夹克，卡其色工装裤",
                    "accessories": ["背包", "指南针"],
                    "colors": ["蓝色", "卡其色"]
                },
                "personality": {
                    "traits": ["勇敢", "乐观", "善良"],
                    "mannerisms": ["思考时喜欢摸下巴"]
                },
                "design_prompt": None,
                "image_url": None
            }
        }


class CharacterExtractRequest(BaseModel):
    """角色提取请求"""

    story: str = Field(..., min_length=10, max_length=10000, description="故事文本")
    style: StoryboardStyle = Field(default=StoryboardStyle.CINEMATIC, description="故事板风格")
    max_characters: int = Field(default=5, ge=1, le=10, description="最大角色数")


class CharacterExtractResponse(BaseModel):
    """角色提取响应"""

    characters: list[CharacterDesignInfo] = Field(..., description="角色列表")


class CharacterDesignRequest(BaseModel):
    """角色设计图生成请求"""

    characters: list[CharacterDesignInfo] = Field(..., description="角色列表")
    style: StoryboardStyle = Field(default=StoryboardStyle.CINEMATIC, description="故事板风格")


class CharacterDesignResponse(BaseModel):
    """角色设计图生成响应"""

    characters: list[CharacterDesignInfo] = Field(..., description="角色设计结果")
    completed: int = Field(..., description="已完成数")
    total: int = Field(..., description="总数")
