# Skills Service Init
from app.services.skills.schemas import (
    SkillChatRequest,
    SkillChatResponse,
    TemplatesListResponse,
    GenerateRequest,
    GenerateResponse,
    TaskStatus,
)
from app.services.skills.skill_loader import get_skills_loader, SkillsLoader