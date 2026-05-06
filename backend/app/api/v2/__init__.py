"""V2 API 路由组"""
from fastapi import APIRouter

router = APIRouter()

from . import image, skills
