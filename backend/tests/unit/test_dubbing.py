"""配音大师 dubbing.py 单元测试——契约转发/错误映射/音频落盘/音色库聚合"""
import os

# app.models 链上会实例化 Settings —— 单元测试用占位环境变量
for k, v in {
    "POSTGRES_HOST": "localhost",
    "POSTGRES_DB": "test",
    "POSTGRES_USER": "test",
    "POSTGRES_PASSWORD": "test",
    "REDIS_HOST": "localhost",
    "REDIS_PASSWORD": "",
    "SECRET_KEY": "test",
    "MINIMAX_API_KEY": "test-key",
}.items():
    os.environ.setdefault(k, v)

import pytest
from fastapi import HTTPException
from unittest.mock import AsyncMock, patch

from app.api.v2 import dubbing


@pytest.fixture(autouse=True)
def _audio_dir(tmp_path, monkeypatch):
    """音频落盘重定向到临时目录"""
    monkeypatch.setattr(dubbing, "_dubbing_dir", lambda: str(tmp_path))
    yield


# —— 音色设计 ——

@pytest.mark.asyncio
async def test_voice_design_forwards_and_saves_trial(monkeypatch, tmp_path):
    captured = {}

    async def fake_post(path, payload):
        captured["path"], captured["payload"] = path, payload
        return {"voice_id": "moss_audio_v1", "trial_audio": "aabbcc"}

    monkeypatch.setattr(dubbing, "_post_upstream", fake_post)
    out = await dubbing.voice_design(dubbing.VoiceDesignRequest(prompt="低沉男声", preview_text="你好世界"))
    assert captured["path"] == "/voice_design"
    assert captured["payload"] == {"prompt": "低沉男声", "preview_text": "你好世界"}
    assert out["voice_id"] == "moss_audio_v1"
    assert out["trial_audio_url"] and out["trial_audio_url"].endswith(".mp3")
    fname = out["trial_audio_url"].rsplit("/", 1)[-1]
    assert os.path.getsize(os.path.join(str(tmp_path), fname)) == 3


@pytest.mark.asyncio
async def test_voice_design_invalid_hex_gives_null_url(monkeypatch):
    async def fake_post(path, payload):
        return {"voice_id": "v1", "trial_audio": "not-hex!"}

    monkeypatch.setattr(dubbing, "_post_upstream", fake_post)
    out = await dubbing.voice_design(dubbing.VoiceDesignRequest(prompt="p", preview_text="t"))
    assert out["trial_audio_url"] is None


# —— 同步合成 ——

@pytest.mark.asyncio
async def test_tts_assembles_voice_setting(monkeypatch):
    captured = {}

    async def fake_post(path, payload):
        captured["path"], captured["payload"] = path, payload
        return {
            "data": {"audio": "deadbeef", "subtitle_file": "http://srt"},
            "extra_info": {"audio_length": 1500, "usage_characters": 8},
        }

    monkeypatch.setattr(dubbing, "_post_upstream", fake_post)
    out = await dubbing.text_to_speech(dubbing.TtsRequest(
        text="测试文本", voice_id="moss_audio_v1", emotion="sad", speed=1.5, pitch=-3,
    ))
    assert captured["path"] == "/t2a_v2"
    vs = captured["payload"]["voice_setting"]
    assert vs == {"voice_id": "moss_audio_v1", "speed": 1.5, "vol": 1.0, "pitch": -3, "emotion": "sad"}
    assert captured["payload"]["model"] == "speech-2.8-hd"
    assert captured["payload"]["output_format"] == "hex"
    assert out["audio_url"].endswith(".mp3")
    assert out["usage_characters"] == 8


@pytest.mark.asyncio
async def test_tts_rejects_bad_model_and_emotion():
    with pytest.raises(HTTPException) as e1:
        await dubbing.text_to_speech(dubbing.TtsRequest(text="t", voice_id="v", model="gpt-4o"))
    assert e1.value.status_code == 400
    with pytest.raises(HTTPException) as e2:
        await dubbing.text_to_speech(dubbing.TtsRequest(text="t", voice_id="v", emotion="ecstatic"))
    assert e2.value.status_code == 400


@pytest.mark.asyncio
async def test_tts_missing_key_returns_503(monkeypatch):
    monkeypatch.setattr(dubbing, "_auth_headers", lambda: (_ for _ in ()).throw(HTTPException(503, "未配置")))
    with pytest.raises(HTTPException) as e:
        await dubbing.text_to_speech(dubbing.TtsRequest(text="t", voice_id="v"))
    assert e.value.status_code == 503


# —— 异步长文本 ——

@pytest.mark.asyncio
async def test_tts_async_returns_task_id(monkeypatch):
    async def fake_post(path, payload):
        return {"task_id": "t-1", "file_id": 42}

    monkeypatch.setattr(dubbing, "_post_upstream", fake_post)
    out = await dubbing.text_to_speech_async(dubbing.TtsAsyncRequest(text="长文", voice_id="v"))
    assert out == {"task_id": "t-1", "file_id": 42}


@pytest.mark.asyncio
async def test_async_query_success_downloads(monkeypatch):
    async def fake_download(file_id, user, hint="长文配音"):
        assert file_id == 42
        return "/asset-uploads/dubbing/x.mp3"

    monkeypatch.setattr(dubbing, "_download_file", fake_download)

    class FakeResp:
        status_code = 200
        def json(self):
            return {"task_id": "t-1", "status": "success", "file_id": 42, "base_resp": {"status_code": 0}}

    class FakeClient:
        async def __aenter__(self):
            return self
        async def __aexit__(self, *a):
            pass
        async def get(self, *a, **kw):
            return FakeResp()

    with patch("httpx.AsyncClient", return_value=FakeClient()):
        out = await dubbing.query_tts_async("t-1", download=True, current_user=None)
    assert out["status"] == "success"
    assert out["audio_url"] == "/asset-uploads/dubbing/x.mp3"


# —— 音色库 ——

@pytest.mark.asyncio
async def test_list_voices_aggregates(monkeypatch):
    dubbing._local = {}  # 无缓存直连

    async def fake_get(key):
        return None

    async def fake_set(key, value):
        pass

    async def fake_post(path, payload):
        assert payload == {"voice_type": "all"}
        return {
            "system_voice": [{"voice_id": "male-qn-qingse", "voice_name": "青涩青年", "description": ["男声"]}],
            "voice_generation": [{"voice_id": "moss_v1", "description": ["低沉男声"], "created_time": "2026-10-27"}],
        }

    monkeypatch.setattr(dubbing._VoiceCache, "get", staticmethod(fake_get))
    monkeypatch.setattr(dubbing._VoiceCache, "set", staticmethod(fake_set))
    monkeypatch.setattr(dubbing, "_post_upstream", fake_post)
    out = await dubbing.list_voices("all")
    assert out["system"][0]["voice_id"] == "male-qn-qingse"
    assert out["designed"][0]["description"] == ["低沉男声"]


@pytest.mark.asyncio
async def test_delete_voice_uses_generation_type(monkeypatch):
    captured = {}

    async def fake_post(path, payload):
        captured["path"], captured["payload"] = path, payload
        return {"voice_id": "moss_v1"}

    cleared = []

    async def fake_clear():
        cleared.append(1)

    monkeypatch.setattr(dubbing, "_post_upstream", fake_post)
    monkeypatch.setattr(dubbing._VoiceCache, "clear", staticmethod(fake_clear))
    out = await dubbing.delete_voice("moss_v1")
    assert captured["payload"] == {"voice_type": "voice_generation", "voice_id": "moss_v1"}
    assert out["deleted"] is True and cleared
