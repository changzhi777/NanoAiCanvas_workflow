"""Agent 系统单元测试 — 纯 mock，无数据库依赖
运行: cd backend && python -m pytest tests/agent/ -v
"""
import json
import uuid
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

UTC = timezone.utc
from app.models.agent import (
    AgentMemory, AgentTask, AgentExecutionLog, AgentSession,
    SystemSkill, UserSkill, SkillPromotionRequest,
    PipelineType, SessionStatus, TaskStatus, SkillStatus,
    UserSkillStatus, PromotionStatus, MemoryLayer,
)


# ==================== AgentMemory 模型测试 ====================

class TestAgentMemoryModel:
    def test_stability_fresh_memory(self):
        m = AgentMemory()
        m.stability = 1.0
        m.last_accessed = datetime.now(UTC)
        m.half_life_days = 30.0
        assert m.calc_stability() > 0.9

    def test_stability_half_life_decay(self):
        m = AgentMemory()
        m.stability = 1.0
        m.last_accessed = datetime.now(UTC) - timedelta(days=30)
        m.half_life_days = 30.0
        assert abs(m.calc_stability() - 0.5) < 0.02

    def test_stability_with_cue(self):
        m = AgentMemory()
        m.stability = 0.8
        m.last_accessed = datetime.now(UTC)
        m.half_life_days = 30.0
        result = m.calc_stability(cue=0.5)
        assert abs(result - 0.4) < 0.02

    def test_is_expired_no_expiry(self):
        m = AgentMemory()
        assert m.is_expired is False

    def test_is_expired_future(self):
        m = AgentMemory()
        m.expires_at = datetime.now(UTC) + timedelta(days=1)
        assert m.is_expired is False

    def test_is_expired_past(self):
        m = AgentMemory()
        m.expires_at = datetime.now(UTC) - timedelta(days=1)
        assert m.is_expired is True

    def test_recency_factor_zero_half_life(self):
        m = AgentMemory()
        m.last_accessed = datetime.now(UTC)
        m.half_life_days = 0
        assert m.recency_factor() == 0.1

    def test_recency_factor_no_access(self):
        m = AgentMemory()
        m.last_accessed = None
        assert m.recency_factor() == 0.1

    def test_recency_factor_old_memory(self):
        m = AgentMemory()
        m.last_accessed = datetime.now(UTC) - timedelta(days=60)
        m.half_life_days = 30.0
        assert m.recency_factor() < 0.3


# ==================== Enum 测试 ====================

class TestEnums:
    def test_pipeline_types(self):
        assert PipelineType.ADAPTATION.value == "adaptation"
        assert PipelineType.TVC.value == "tvc"
        assert PipelineType.STORYBOARD.value == "storyboard"

    def test_task_statuses(self):
        assert TaskStatus.QUEUED.value == "queued"
        assert TaskStatus.RUNNING.value == "running"
        assert TaskStatus.COMPLETED.value == "completed"
        assert TaskStatus.FAILED.value == "failed"

    def test_memory_layers(self):
        assert MemoryLayer.IDENTITY.value == 0
        assert MemoryLayer.ESSENTIAL.value == 1
        assert MemoryLayer.ON_DEMAND.value == 2
        assert MemoryLayer.DEEP_SEARCH.value == 3

    def test_skill_statuses(self):
        assert SkillStatus.DRAFT.value == "draft"
        assert SkillStatus.ACTIVE.value == "active"
        assert SkillStatus.PINNED.value == "pinned"
        assert SkillStatus.ARCHIVED.value == "archived"

    def test_user_skill_statuses(self):
        assert UserSkillStatus.PERSONAL.value == "personal"
        assert UserSkillStatus.PROMOTED.value == "promoted"
        assert UserSkillStatus.MERGED.value == "merged"
        assert UserSkillStatus.DIVERGED.value == "diverged"

    def test_promotion_lifecycle(self):
        assert PromotionStatus.PENDING.value == "pending"
        assert PromotionStatus.TESTING.value == "testing"
        assert PromotionStatus.APPROVED.value == "approved"
        assert PromotionStatus.REJECTED.value == "rejected"
        assert PromotionStatus.MERGED.value == "merged"


# ==================== ModelRouter 测试 ====================

class TestModelRouter:
    def _make_router(self):
        from app.services.agent.model_router import ModelRouter
        return ModelRouter()

    def test_resolve_model_default(self):
        router = self._make_router()
        base_url, api_key, model_id = router._resolve_model("producer")
        assert model_id == "glm-4-flash"

    def test_resolve_model_all_agents(self):
        router = self._make_router()
        agents = ["producer", "screenwriter", "director", "art_director",
                   "character_designer", "scene_designer", "voice_director",
                   "editor", "composer"]
        for name in agents:
            _, _, model_id = router._resolve_model(name)
            assert model_id is not None

    def test_resolve_model_override(self):
        router = self._make_router()
        _, _, model_id = router._resolve_model("producer", override_model="glm-5")
        assert model_id == "glm-5"

    def test_resolve_model_unknown_fallback(self):
        router = self._make_router()
        _, _, model_id = router._resolve_model("unknown_agent")
        assert model_id == "glm-4-flash"

    @pytest.mark.asyncio
    async def test_chat_completion_single(self):
        router = self._make_router()

        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "choices": [{"message": {"content": "test response"}}]
        }
        mock_resp.raise_for_status = MagicMock()

        with patch("httpx.AsyncClient") as mock_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = mock_client

            result = await router.chat_completion(
                messages=[{"role": "user", "content": "hi"}],
                agent_name="producer",
                stream=False,
            )
            assert result["choices"][0]["message"]["content"] == "test response"

    def test_extract_usage(self):
        from app.services.agent.model_router import ModelRouter
        resp = {"usage": {"prompt_tokens": 100, "completion_tokens": 50}}
        inp, out = ModelRouter.extract_usage(resp)
        assert inp == 100
        assert out == 50

    def test_extract_usage_empty(self):
        from app.services.agent.model_router import ModelRouter
        inp, out = ModelRouter.extract_usage({})
        assert inp == 0
        assert out == 0


# ==================== BaseAgent 测试 ====================

class TestBaseAgent:
    def test_extract_content_normal(self):
        from app.services.agent.agents.base import BaseAgent
        resp = {"choices": [{"message": {"content": "hello world"}}]}
        result = BaseAgent._extract_content(None, resp)
        assert result == "hello world"

    def test_extract_content_empty_choices(self):
        from app.services.agent.agents.base import BaseAgent
        resp = {"choices": []}
        result = BaseAgent._extract_content(None, resp)
        assert result == str(resp)

    def test_extract_content_no_choices_key(self):
        from app.services.agent.agents.base import BaseAgent
        resp = {"error": "bad"}
        result = BaseAgent._extract_content(None, resp)
        assert result == str(resp)


# ==================== AgentRegistry 测试 ====================

class TestAgentRegistry:
    def test_all_9_agents_registered(self):
        from app.services.agent.agents import AGENT_REGISTRY
        expected = {
            "producer", "screenwriter", "director",
            "art_director", "character_designer", "scene_designer",
            "voice_director", "editor", "composer",
        }
        assert set(AGENT_REGISTRY.keys()) == expected

    def test_each_agent_has_name(self):
        from app.services.agent.agents import AGENT_REGISTRY
        for name, cls in AGENT_REGISTRY.items():
            instance = cls.__new__(cls)
            assert instance.name == name

    def test_each_agent_has_description(self):
        from app.services.agent.agents import AGENT_REGISTRY
        for name, cls in AGENT_REGISTRY.items():
            assert cls.description, f"{name} missing description"


# ==================== MemoryStack 测试 ====================

class TestMemoryStack:
    def test_load_l0_identity(self):
        from app.services.agent.memory_stack import MemoryStack
        db = AsyncMock()
        stack = MemoryStack(db, "user-1")
        result = stack._load_l0()
        assert "version" in result
        assert "agents" in result

    @pytest.mark.asyncio
    async def test_wake_up(self):
        from app.services.agent.memory_stack import MemoryStack
        db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        db.execute = AsyncMock(return_value=mock_result)
        db.commit = AsyncMock()

        stack = MemoryStack(db, str(uuid.uuid4()))
        ctx = await stack.wake_up()
        assert "identity" in ctx
        assert "essential" in ctx
        assert isinstance(ctx["essential"], list)

    @pytest.mark.asyncio
    async def test_store_memory(self):
        from app.services.agent.memory_stack import MemoryStack
        db = AsyncMock()
        db.add = MagicMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()

        stack = MemoryStack(db, str(uuid.uuid4()))
        await stack.store(MemoryLayer.ON_DEMAND, "test_cat", "test content", stability=0.9)
        db.add.assert_called_once()
        stored = db.add.call_args[0][0]
        assert stored.content == "test content"
        assert stored.layer == MemoryLayer.ON_DEMAND

    @pytest.mark.asyncio
    async def test_store_memory_default_half_life_l2(self):
        from app.services.agent.memory_stack import MemoryStack, L2_DEFAULT_HALF_LIFE
        db = AsyncMock()
        db.add = MagicMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()

        stack = MemoryStack(db, str(uuid.uuid4()))
        await stack.store(MemoryLayer.ON_DEMAND, "cat", "content")
        stored = db.add.call_args[0][0]
        assert stored.half_life_days == L2_DEFAULT_HALF_LIFE

    @pytest.mark.asyncio
    async def test_store_memory_default_half_life_l3(self):
        from app.services.agent.memory_stack import MemoryStack, L3_DEFAULT_HALF_LIFE
        db = AsyncMock()
        db.add = MagicMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()

        stack = MemoryStack(db, str(uuid.uuid4()))
        await stack.store(MemoryLayer.DEEP_SEARCH, "cat", "content")
        stored = db.add.call_args[0][0]
        assert stored.half_life_days == L3_DEFAULT_HALF_LIFE

    @pytest.mark.asyncio
    async def test_prune_removes_low_stability(self):
        from app.services.agent.memory_stack import MemoryStack

        old = AgentMemory()
        old.stability = 0.1
        old.last_accessed = datetime.now(UTC) - timedelta(days=60)
        old.half_life_days = 30.0

        fresh = AgentMemory()
        fresh.stability = 0.9
        fresh.last_accessed = datetime.now(UTC)
        fresh.half_life_days = 30.0

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [old, fresh]

        db = AsyncMock()
        db.execute = AsyncMock(return_value=mock_result)
        db.delete = AsyncMock()
        db.commit = AsyncMock()

        stack = MemoryStack(db, str(uuid.uuid4()))
        pruned = await stack.prune()
        assert pruned >= 1

    @pytest.mark.asyncio
    async def test_deep_search_delegates_to_query(self):
        from app.services.agent.memory_stack import MemoryStack
        db = AsyncMock()
        stack = MemoryStack(db, str(uuid.uuid4()))

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        db.execute = AsyncMock(return_value=mock_result)
        db.commit = AsyncMock()

        results = await stack.deep_search("keyword")
        assert isinstance(results, list)


# ==================== Pipeline 测试 ====================

class TestPipeline:
    def test_pipeline_stages_count(self):
        from app.services.agent.pipeline import PIPELINE_STAGES
        assert len(PIPELINE_STAGES) == 8

    def test_pipeline_stage_names(self):
        from app.services.agent.pipeline import PIPELINE_STAGES
        names = [s["name"] for s in PIPELINE_STAGES]
        assert names == [
            "prepare", "statistics", "outline", "plan",
            "script", "quality_control", "merge", "archive",
        ]

    def test_pipeline_stage_agents(self):
        from app.services.agent.pipeline import PIPELINE_STAGES
        for stage in PIPELINE_STAGES:
            assert "agent" in stage
            assert "stage" in stage
            assert 0 <= stage["progress"] <= 100

    def test_pipeline_key_format(self):
        from app.services.agent.pipeline import _pipeline_key
        assert _pipeline_key("abc") == "agent_pipeline:abc"

    def test_pipeline_channel_format(self):
        from app.services.agent.pipeline import _pipeline_channel
        assert _pipeline_channel("abc") == "agent_pipeline_ch:abc"

    @pytest.mark.asyncio
    async def test_extract_insights(self):
        from app.services.agent.pipeline import AdaptationPipeline
        db = AsyncMock()
        pipeline = AdaptationPipeline(db)
        ctx = {
            "prepare": {"result": "short"},
            "script": {"result": "A" * 100},
        }
        insights = pipeline._extract_insights(ctx)
        assert len(insights) == 1
        assert "script" in insights[0]

    @pytest.mark.asyncio
    async def test_extract_insights_max_5(self):
        from app.services.agent.pipeline import AdaptationPipeline
        db = AsyncMock()
        pipeline = AdaptationPipeline(db)
        ctx = {f"stage_{i}": {"result": "A" * 100} for i in range(10)}
        insights = pipeline._extract_insights(ctx)
        assert len(insights) <= 5


# ==================== SkillsRegistry 测试 ====================

class TestSkillsRegistry:
    @pytest.mark.asyncio
    async def test_create_system_skill(self):
        from app.services.agent.skills_registry import SkillsRegistry
        db = AsyncMock()
        db.add = MagicMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()

        registry = SkillsRegistry(db)
        skill = await registry.create_system_skill("test_skill", "# Test Skill")
        db.add.assert_called_once()

    @pytest.mark.asyncio
    async def test_activate_skill(self):
        from app.services.agent.skills_registry import SkillsRegistry
        db = AsyncMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()

        mock_skill = MagicMock()
        mock_skill.status = SkillStatus.DRAFT

        registry = SkillsRegistry(db)
        with patch.object(registry, '_get_system_skill', return_value=mock_skill):
            result = await registry.activate_skill("skill-id")
            assert result.status == SkillStatus.ACTIVE


# ==================== Sleep Scheduler 测试 ====================

class TestSleepScheduler:
    def test_phases_defined(self):
        from app.services.agent.sleep.scheduler import PHASES
        assert PHASES == [
            "review_memories", "prune", "skill_review",
            "efficiency_optimization", "validation", "report",
        ]

    @pytest.mark.asyncio
    async def test_phase_validation_skipped(self):
        from app.services.agent.sleep.scheduler import SleepScheduler
        scheduler = SleepScheduler()
        result = await scheduler._run_phase("validation")
        assert result["status"] == "skipped"
        assert "validation" in result["reason"]

    @pytest.mark.asyncio
    async def test_phase_unknown(self):
        from app.services.agent.sleep.scheduler import SleepScheduler
        scheduler = SleepScheduler()
        result = await scheduler._run_phase("nonexistent_phase")
        assert result["status"] == "unknown_phase"


# ==================== Gateway 测试 ====================

class TestGateway:
    def test_gateway_singleton(self):
        from app.services.agent.gateway import gateway
        assert gateway is not None
        assert len(gateway._agents_info) == 9

    def test_gateway_agents_have_names(self):
        from app.services.agent.gateway import gateway
        names = [a["name"] for a in gateway._agents_info]
        assert "producer" in names
        assert "composer" in names

    @pytest.mark.asyncio
    async def test_submit_pipeline(self):
        from app.services.agent.gateway import AgentGateway
        gw = AgentGateway()

        with patch("app.services.agent.gateway.redis_client") as mock_redis:
            mock_redis.lpush = AsyncMock()
            task_id = await gw.submit_pipeline("user-1", {"text": "test"})
            assert isinstance(task_id, str)
            assert len(task_id) == 36  # UUID format
            mock_redis.lpush.assert_called_once()

    @pytest.mark.asyncio
    async def test_submit_chat(self):
        from app.services.agent.gateway import AgentGateway
        gw = AgentGateway()

        with patch("app.services.agent.gateway.redis_client") as mock_redis:
            mock_redis.lpush = AsyncMock()
            await gw.submit_chat("user-1", [{"role": "user", "content": "hi"}])
            call_args = mock_redis.lpush.call_args
            task_data = json.loads(call_args[0][1])
            assert task_data["type"] == "chat"
            assert task_data["messages"] == [{"role": "user", "content": "hi"}]


# ==================== Copyright & Version 测试 ====================

class TestCopyright:
    def test_copyright_constants(self):
        from app.services.agent.copyright import COPYRIGHT, AUTHOR, AUTHOR_EMAIL
        assert "AiHXC" in COPYRIGHT
        assert "外星动物" in AUTHOR
        assert AUTHOR_EMAIL == "14455975@qq.com"

    def test_version_file(self):
        from app.services.agent import __version__
        assert __version__.startswith("V0.")

    def test_agent_name(self):
        from app.services.agent.copyright import AGENT_NAME
        assert "Team8" in AGENT_NAME


# ==================== _measure_execution 集成测试 ====================

class TestMeasureExecution:
    @pytest.mark.asyncio
    async def test_measure_records_success(self):
        from app.services.agent.agents.base import BaseAgent

        mock_router = MagicMock()
        mock_router.AGENT_MODEL_MAP = {"producer": ("glm-4-flash", "cloud")}

        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()

        agent_cls = None
        for cls in BaseAgent.__subclasses__():
            if cls.name == "producer":
                agent_cls = cls
                break

        assert agent_cls is not None, "ProducerAgent not found"

        agent = agent_cls(mock_router, mock_db)

        async def mock_run(task, context):
            return {"stage": "prepare", "result": "ok"}

        result = await agent._measure_execution(
            user_id=str(uuid.uuid4()),
            task_id=str(uuid.uuid4()),
            stage="prepare",
            fn=mock_run,
            task={"stage": "prepare"},
            context={},
        )
        assert result["result"] == "ok"
        mock_db.add.assert_called_once()

        log = mock_db.add.call_args[0][0]
        assert log.success is True
        assert log.agent_name == "producer"

    @pytest.mark.asyncio
    async def test_measure_records_failure(self):
        from app.services.agent.agents.base import BaseAgent

        mock_router = MagicMock()
        mock_router.AGENT_MODEL_MAP = {"producer": ("glm-4-flash", "cloud")}

        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()

        agent_cls = None
        for cls in BaseAgent.__subclasses__():
            if cls.name == "producer":
                agent_cls = cls
                break

        assert agent_cls is not None, "ProducerAgent not found"

        agent = agent_cls(mock_router, mock_db)

        async def mock_run(task, context):
            raise ValueError("test error")

        with pytest.raises(ValueError, match="test error"):
            await agent._measure_execution(
                user_id=str(uuid.uuid4()),
                task_id=str(uuid.uuid4()),
                stage="prepare",
                fn=mock_run,
                task={"stage": "prepare"},
                context={},
            )

        log = mock_db.add.call_args[0][0]
        assert log.success is False
        assert "test error" in log.error_message

    @pytest.mark.asyncio
    async def test_measure_records_duration(self):
        from app.services.agent.agents.base import BaseAgent

        mock_router = MagicMock()
        mock_router.AGENT_MODEL_MAP = {"producer": ("glm-4-flash", "cloud")}

        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()

        agent_cls = None
        for cls in BaseAgent.__subclasses__():
            if cls.name == "producer":
                agent_cls = cls
                break

        agent = agent_cls(mock_router, mock_db)

        async def mock_run(task, context):
            return {"result": "ok"}

        await agent._measure_execution(
            user_id=str(uuid.uuid4()),
            task_id=str(uuid.uuid4()),
            stage="test",
            fn=mock_run,
            task={},
            context={},
        )

        log = mock_db.add.call_args[0][0]
        assert log.duration_ms >= 0
