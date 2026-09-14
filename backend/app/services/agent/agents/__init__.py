# Nanoai Team8 Agent System — Agent Package
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>

from app.services.agent.agents.base import BaseAgent
from app.services.agent.agents.producer import ProducerAgent
from app.services.agent.agents.screenwriter import ScreenwriterAgent
from app.services.agent.agents.director import DirectorAgent
from app.services.agent.agents.art_director import ArtDirectorAgent
from app.services.agent.agents.character_designer import CharacterDesignerAgent
from app.services.agent.agents.scene_designer import SceneDesignerAgent
from app.services.agent.agents.voice_director import VoiceDirectorAgent
from app.services.agent.agents.editor import EditorAgent
from app.services.agent.agents.composer import ComposerAgent

AGENT_REGISTRY: dict[str, type[BaseAgent]] = {
    "producer": ProducerAgent,
    "screenwriter": ScreenwriterAgent,
    "director": DirectorAgent,
    "art_director": ArtDirectorAgent,
    "character_designer": CharacterDesignerAgent,
    "scene_designer": SceneDesignerAgent,
    "voice_director": VoiceDirectorAgent,
    "editor": EditorAgent,
    "composer": ComposerAgent,
}

__all__ = [
    "BaseAgent",
    "ProducerAgent",
    "ScreenwriterAgent",
    "DirectorAgent",
    "ArtDirectorAgent",
    "CharacterDesignerAgent",
    "SceneDesignerAgent",
    "VoiceDirectorAgent",
    "EditorAgent",
    "ComposerAgent",
    "AGENT_REGISTRY",
]
