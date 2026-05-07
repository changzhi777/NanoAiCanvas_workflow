# Skills Service - Pydantic Schemas

from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from enum import Enum


class ChatMessage(BaseModel):
    """Single chat message in conversation"""
    role: str = Field(..., description="'user' or 'assistant'")
    content: str


class SkillChatRequest(BaseModel):
    """Request for AI skill chat - analyze user intent and recommend template"""
    message: str = Field(..., description="User's description of what they want to create")
    chat_history: Optional[List[ChatMessage]] = Field(default_factory=list, description="Previous chat messages")
    skill_id: str = Field(default="gpt_image_2", description="Skill identifier")


class TemplateField(BaseModel):
    """Single field in a template form"""
    name: str = Field(..., description="Field identifier")
    type: str = Field(..., description="Field type: text, select, textarea, number")
    label: str = Field(..., description="Display label")
    required: bool = Field(default=False)
    description: Optional[str] = Field(None, description="Helper text")
    options: Optional[List[Dict[str, str]]] = Field(None, description="Options for select type")
    default: Optional[str] = Field(None, description="Default value")


class SkillTemplate(BaseModel):
    """Template definition"""
    id: str = Field(..., description="Template identifier")
    name: str = Field(..., description="Template display name")
    category: str = Field(..., description="Template category")
    category_name: str = Field(..., description="Category display name")
    description: str = Field(..., description="Template description")
    fields: List[TemplateField] = Field(..., description="Form fields")
    prompt_template: str = Field(..., description="Prompt template string with {field_name} placeholders")


class TemplateCategory(BaseModel):
    """Template category with its templates"""
    id: str = Field(..., description="Category identifier")
    name: str = Field(..., description="Category display name")
    description: str = Field(..., description="Category description")
    templates: List[SkillTemplate] = Field(..., description="Templates in this category")


class TemplatesListResponse(BaseModel):
    """Response containing all templates grouped by category"""
    categories: List[TemplateCategory]
    total_templates: int


class SkillChatResponse(BaseModel):
    """Response from AI skill chat - template recommendation"""
    recommended_templates: List[Dict[str, Any]] = Field(..., description="List of recommended templates with confidence scores")
    suggested_category: Optional[str] = Field(None, description="Suggested category ID")
    reasoning: str = Field(..., description="Why these templates were recommended")
    needs_more_info: bool = Field(default=False, description="Whether more information is needed from user")
    follow_up_question: Optional[str] = Field(None, description="Question to ask user for more details")


class GenerateRequest(BaseModel):
    """Request to generate image via skill"""
    template_id: str = Field(..., description="Template identifier")
    form_data: Dict[str, Any] = Field(..., description="Form field values")
    skill_id: str = Field(default="gpt_image_2")
    size: str = Field(default="1024x1024", description="Image size")
    quality: str = Field(default="standard", description="Image quality")


class GenerateResponse(BaseModel):
    """Response for generation request"""
    task_id: str = Field(..., description="Async task ID for tracking")
    status: str = Field(..., description="'pending' or 'error'")
    message: str = Field(..., description="Status message")


class TaskStatus(BaseModel):
    """Task status response"""
    task_id: str
    status: str  # pending, processing, completed, failed
    progress: int = Field(0, description="Progress percentage 0-100")
    result: Optional[Dict[str, Any]] = Field(None, description="Result data when completed")
    error: Optional[str] = Field(None, description="Error message if failed")