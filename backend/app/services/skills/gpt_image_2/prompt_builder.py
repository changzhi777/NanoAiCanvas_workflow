"""
Prompt Builder for GPT Image 2 Skill

Builds structured prompts from template form data.
"""

from typing import Dict, Any, Optional
from app.services.skills.schemas import SkillTemplate, TemplateField


class PromptBuilder:
    """Builds image generation prompts from template data"""

    def __init__(self, skill_id: str = "gpt_image_2"):
        self.skill_id = skill_id

    def build_prompt(self, template: SkillTemplate, form_data: Dict[str, Any]) -> str:
        """
        Build final prompt from template and form data.

        Args:
            template: The template definition
            form_data: User-provided form field values

        Returns:
            Final prompt string ready for image generation
        """
        # Start with the prompt template
        prompt = template.prompt_template

        # Replace all {field_name} placeholders with actual values
        for field in template.fields:
            placeholder = f"{{{field.name}}}"
            value = form_data.get(field.name, field.default or "")

            # Handle select fields - get label instead of value
            if field.type == "select" and value:
                # Find the option label
                if field.options:
                    for opt in field.options:
                        if opt.get("value") == value:
                            value = opt.get("label", value)
                            break

            # Replace placeholder (if not found, leave as-is or use empty)
            if value:
                prompt = prompt.replace(placeholder, str(value))
            else:
                # Remove unfilled placeholders or replace with empty
                prompt = prompt.replace(placeholder, "")

        # Clean up any remaining unfilled placeholders
        import re
        prompt = re.sub(r'\{[^}]+\}', '', prompt)

        # Clean up multiple spaces and newlines
        prompt = re.sub(r'\s+', ' ', prompt).strip()

        return prompt

    def validate_form_data(self, template: SkillTemplate, form_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """
        Validate that all required fields are provided.

        Returns:
            (is_valid, error_message)
        """
        for field in template.fields:
            if field.required:
                value = form_data.get(field.name)
                if not value or (isinstance(value, str) and not value.strip()):
                    return False, f"必填字段 '{field.label}' 未填写"

        return True, None

    def get_default_form_data(self, template: SkillTemplate) -> Dict[str, Any]:
        """Get default values for all fields"""
        defaults = {}
        for field in template.fields:
            if field.default:
                defaults[field.name] = field.default
        return defaults