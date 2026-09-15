"""one_shot_prompt + _optimize_prompts 一镜到底分支单测"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.one_shot_prompt import generate as one_shot_generate


# ==================== 一镜到底分支（_optimize_prompts） ====================

class FakeReq:
    def __init__(self, shot_count=1):
        self.shot_count = shot_count
        self.style_reference = ""
        self.style = "cinematic"
        self.mode = "cinematic"


class TestOptimizePromptsOneShot:
    """shot_count=1 走 one_shot_prompt.generate 分支；shot_count>1 走老 GLM HTTP 路径"""

    async def test_one_shot_path_routes_to_generate(self):
        from app.api.v2.tvc_engine import _optimize_prompts

        # 1. mock DB session
        mock_db = AsyncMock()
        cm = AsyncMock()
        cm.__aenter__ = AsyncMock(return_value=mock_db)
        cm.__aexit__ = AsyncMock(return_value=False)

        # 2. mock one_shot_generate 返回固定结果
        fixed = {
            "prompt": "static hold for 0.5s. A model beside a bottle, cinematic. End with static hold for 0.5s.",
            "template_id": "tpl-uuid",
            "template_name": "测试模板",
            "narrative": "display",
            "composition": "character_object",
            "motion_chain": "human_motion",
            "duration": 12,
            "bpm_hint": 90,
            "composition_seed": "seed-abc",
            "narrative_seed": "seed-nar",
        }
        with patch("app.services.one_shot_prompt.generate", return_value=fixed), \
             patch("app.services.one_shot_prompt.log_action"), \
             patch("app.database.async_session_maker", return_value=cm):
            req = FakeReq(shot_count=1)
            result = await _optimize_prompts(
                {"raw_content": "矿泉水广告"},
                req, MagicMock(), None,
                task_id="tvc_test_1", user_id="00000000-0000-0000-0000-000000000001",
            )

        # shot_count=1 应走 one_shot 分支
        assert "_one_shot" in result
        assert result["_one_shot"]["prompt"] == fixed["prompt"]
        assert result["_one_shot"]["duration"] == 12
        assert len(result["shots"]) == 1  # 一段
        assert result["shots"][0]["duration"] == 12
        assert result["shots"][0]["visual_prompt"] == fixed["prompt"]
        # character/scene prompt 来自 one_shot（取前 200 字符占位）
        assert len(result["character_ref_prompt"]) > 0
        assert len(result["scene_ref_prompt"]) > 0

    async def test_multi_shot_path_skips_one_shot(self):
        """shot_count=3 应走老 GLM HTTP 路径，不调 one_shot_prompt.generate"""
        from app.api.v2.tvc_engine import _optimize_prompts

        # mock 老路径的 _glm_chat
        mock_data = {
            "choices": [{
                "message": {"content": '{"character_ref_prompt":"X","scene_ref_prompt":"Y","shots":[{"visual_prompt":"V"}]}'}
            }]
        }
        with patch("app.api.v2.glm_proxy._glm_chat", new=AsyncMock(return_value=mock_data)), \
             patch("app.services.one_shot_prompt.generate") as mock_one_shot:
            req = FakeReq(shot_count=3)
            result = await _optimize_prompts(
                {"raw_content": "test"},
                req, MagicMock(), None,
                task_id="tvc_test_2", user_id="00000000-0000-0000-0000-000000000002",
            )
            mock_one_shot.assert_not_called()
        assert "_one_shot" not in result
        assert result["shots"][0]["visual_prompt"] == "V"

    async def test_one_shot_uses_prev_seed_for_reproducibility(self):
        """从 state.result.composition_seed 反序列化保持同组合"""
        from app.api.v2.tvc_engine import _optimize_prompts

        # mock state
        mock_state = {"result": {"composition_seed": "fixed_seed_123"}}
        captured = {}
        def _fake_gen(**kw):
            captured.update(kw)
            return {
                "prompt": "p", "template_id": None, "template_name": None,
                "narrative": "display", "composition": "character_object",
                "motion_chain": "human_motion", "duration": 12, "bpm_hint": 90,
                "composition_seed": "fixed_seed_123", "narrative_seed": "seed-nar",
            }
        mock_db = AsyncMock()
        cm = AsyncMock(); cm.__aenter__ = AsyncMock(return_value=mock_db); cm.__aexit__ = AsyncMock(return_value=False)
        with patch("app.services.one_shot_prompt.generate", side_effect=_fake_gen), \
             patch("app.services.one_shot_prompt.log_action"), \
             patch("app.database.async_session_maker", return_value=cm), \
             patch("app.services.workflow_executor.load_task", new=AsyncMock(return_value=mock_state)):
            req = FakeReq(shot_count=1)
            await _optimize_prompts(
                {"raw_content": "x"}, req, MagicMock(), None,
                task_id="tvc_t", user_id="00000000-0000-0000-0000-000000000099",
            )
        assert captured["prev_seed"] == "fixed_seed_123"


# ==================== MixAudioRequest 模型 ====================

class TestMixAudioRequest:
    def test_defaults(self):
        from app.api.v2.workflow_tasks import MixAudioRequest
        req = MixAudioRequest(bgm_url="https://example.com/bgm.mp3")
        assert req.ambient_urls == []
        assert req.bgm_url == "https://example.com/bgm.mp3"
        assert req.ambient_volume == 0.3

    def test_explicit(self):
        from app.api.v2.workflow_tasks import MixAudioRequest
        req = MixAudioRequest(
            ambient_urls=["https://example.com/a.mp3", "https://example.com/b.mp3"],
            bgm_url="https://example.com/bgm.mp3",
            ambient_volume=0.5,
        )
        assert len(req.ambient_urls) == 2
        assert req.ambient_volume == 0.5
