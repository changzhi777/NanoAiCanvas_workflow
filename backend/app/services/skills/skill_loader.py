"""
Skills Dynamic Loader

Scans services/skills/ directory and dynamically loads skill configurations.
Each skill is a directory with:
  - manifest.json: Skill metadata
  - templates/: Template JSON files
  - prompt_builder.py: Prompt construction logic
  - generate.py: Image generation logic
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Type
from pydantic import BaseModel

from app.services.skills.schemas import SkillTemplate, TemplateCategory, TemplatesListResponse


class SkillConfig(BaseModel):
    """Skill manifest configuration"""
    name: str
    version: str
    category: str
    description: str


class Skill:
    """Base Skill class"""

    def __init__(self, skill_id: str, config: SkillConfig, templates: List[SkillTemplate]):
        self.id = skill_id
        self.config = config
        self.templates = templates
        self.templates_by_id = {t.id: t for t in templates}
        self.templates_by_category: Dict[str, List[SkillTemplate]] = {}
        for t in templates:
            if t.category not in self.templates_by_category:
                self.templates_by_category[t.category] = []
            self.templates_by_category[t.category].append(t)

    def get_template(self, template_id: str) -> Optional[SkillTemplate]:
        return self.templates_by_id.get(template_id)

    def get_templates_by_category(self, category: str) -> List[SkillTemplate]:
        return self.templates_by_category.get(category, [])


class SkillsLoader:
    """Dynamic skills loader"""

    _instance: Optional['SkillsLoader'] = None
    _skills: Dict[str, Skill] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._load_skills()
        return cls._instance

    def _load_skills(self):
        """Load all skills from the skills directory"""
        skills_dir = Path(__file__).parent
        self._skills = {}

        for item in skills_dir.iterdir():
            if item.is_dir() and item.name != "__pycache__":
                skill = self._load_skill(item)
                if skill:
                    self._skills[skill.id] = skill

    def _load_skill(self, skill_path: Path) -> Optional[Skill]:
        """Load a single skill from directory"""
        manifest_path = skill_path / "manifest.json"
        if not manifest_path.exists():
            return None

        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)

            config = SkillConfig(**manifest)

            # Load templates
            templates_dir = skill_path / "templates"
            templates = []
            if templates_dir.exists():
                for template_file in templates_dir.glob("*.json"):
                    with open(template_file, "r", encoding="utf-8") as f:
                        template_data = json.load(f)
                        templates.append(SkillTemplate(**template_data))

            return Skill(
                skill_id=skill_path.name,
                config=config,
                templates=templates
            )
        except Exception as e:
            print(f"Error loading skill from {skill_path}: {e}")
            return None

    def get_skill(self, skill_id: str) -> Optional[Skill]:
        """Get a skill by ID"""
        return self._skills.get(skill_id)

    def list_skills(self) -> List[str]:
        """List all available skill IDs"""
        return list(self._skills.keys())

    def get_templates(self, skill_id: str) -> Optional[TemplatesListResponse]:
        """Get all templates for a skill grouped by category"""
        skill = self.get_skill(skill_id)
        if not skill:
            return None

        categories = []
        for cat_id, cat_templates in skill.templates_by_category.items():
            # Get category name from first template
            cat_name = cat_templates[0].category_name if cat_templates else cat_id

            # Get category description from templates
            cat_desc = cat_templates[0].description if cat_templates else ""

            categories.append(TemplateCategory(
                id=cat_id,
                name=cat_name,
                description=cat_desc,
                templates=cat_templates
            ))

        return TemplatesListResponse(
            categories=categories,
            total_templates=len(skill.templates)
        )

    def get_all_templates_flat(self, skill_id: str) -> List[SkillTemplate]:
        """Get all templates as flat list"""
        skill = self.get_skill(skill_id)
        if not skill:
            return []
        return skill.templates


# Global instance
_loader = None

def get_skills_loader() -> SkillsLoader:
    global _loader
    if _loader is None:
        _loader = SkillsLoader()
    return _loader