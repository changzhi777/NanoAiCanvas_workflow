"""h3_prompt 编译器单元测试 — Schema 完整性/台词逐字/音色预设/运镜映射/sheet-KV 模板"""
import pytest

from app.services.h3_prompt import (
    compile_h3_prompt,
    build_character_sheet_prompt,
    build_product_kv_prompt,
    resolve_voice,
    VOICE_PRESETS,
    CAMERA_H3_MAP,
)


BASE = dict(
    character_desc="Q版3D主厨吃货哥，白色厨师帽红色围裙，圆脸大眼",
    product_name="法风烧饼",
    product_sell="54层松脆酥皮，培根厚蛋拉丝",
    product_price="12.5元",
    scene_desc="清晨肯德基餐厅暖金色阳光",
    camera_movement="push-in",
    light_style="golden_hour",
    narration="54层松脆酥皮，咔嚓一口唤醒清晨",
    bgm_prompt="轻快钢琴旋律，节奏明亮",
    style_word="3D CG",
    duration=15,
)


class TestCompileSchema:
    def test_three_fields_present(self):
        out = compile_h3_prompt(**BASE, voice_gender="female")
        p = out["prompt"]
        assert "integrated_multimodal_description:" in p
        assert "overall_soundscape:" in p
        assert "non_diegetic_music:" in p

    def test_dialogue_verbatim_in_d_tag(self):
        """台词逐字保留在 <d>[Chinese]...</d> 内"""
        out = compile_h3_prompt(**{**BASE, "voice_gender": "female"},
                                dialogue="咔嚓一口唤醒清晨！")
        p = out["prompt"]
        assert "<d>[Chinese] 咔嚓一口唤醒清晨！ </d>" in p
        assert "(S1)" in p

    def test_narration_offscreen_lips_closed(self):
        """旁白模式：off-screen voiceover + 唇闭声明"""
        out = compile_h3_prompt(**BASE, voice_gender="male")
        p = out["prompt"]
        assert "says in an off-screen voiceover:" in p
        assert "lips remain completely closed" in p
        assert "male" in out["voice"]["id"]

    def test_no_voice_no_d_tag_text_becomes_on_screen(self):
        """voice_gender=none：无 <d>，narration 转 on-screen text"""
        out = compile_h3_prompt(**{**BASE, "voice_gender": "none"})
        p = out["prompt"]
        assert "<d>" not in p
        assert "54层松脆酥皮" in p  # narration 转花字
        assert out["voice"] is None

    def test_voice_preset_resolution(self):
        sweet = resolve_voice("female", "female-sweet")
        assert sweet and "sweet" in sweet["desc"]
        assert resolve_voice("none") is None
        # 未知预设回退第一个
        assert resolve_voice("male", "nonexistent")["id"] == "male-elite"

    def test_camera_mapping(self):
        out = compile_h3_prompt(**{**BASE, "camera_movement": "orbit"})
        assert "arc shot" in out["prompt"]
        out2 = compile_h3_prompt(**{**BASE, "camera_movement": "unknown-x"})
        assert "pushes in" in out2["prompt"]  # 默认 push-in

    def test_light_mapping(self):
        out = compile_h3_prompt(**{**BASE, "light_style": "studio"})
        assert "softbox" in out["prompt"]

    def test_kv_shot_with_price_on_screen(self):
        out = compile_h3_prompt(**BASE, voice_gender="female")
        p = out["prompt"]
        assert "[Shot 2] At 00:12.000" in p  # 15-3 切点
        assert '"法风烧饼 12.5元"' in p  # on-screen text 引号逐字
        assert out["on_screen_texts"][-1] == "法风烧饼 12.5元"

    def test_bgm_passthrough_music_field(self):
        out = compile_h3_prompt(**BASE, voice_gender="none")
        assert "non_diegetic_music: 轻快钢琴旋律，节奏明亮" in out["prompt"]

    def test_bgm_none_is_na(self):
        base = {k: v for k, v in BASE.items() if k != "bgm_prompt"}
        out = compile_h3_prompt(**base, voice_gender="none")
        assert "non_diegetic_music: N/A" in out["prompt"]

    def test_quote_sanitized_in_speech(self):
        """台词含英文引号被清洗为「」（引号保留给 on-screen text）"""
        out = compile_h3_prompt(**{**BASE, "voice_gender": "female",
                                   "dialogue": '来一份"终极"汉堡'})
        assert '"终极"' not in out["prompt"]
        assert "「终极」" in out["prompt"]


class TestVoicePresets:
    def test_male_female_each_3(self):
        assert len(VOICE_PRESETS["male"]) == 3
        assert len(VOICE_PRESETS["female"]) == 3

    def test_all_have_desc(self):
        for g, presets in VOICE_PRESETS.items():
            for p in presets:
                assert p["desc"] and p["id"] and p["label"]


class TestCameraMap:
    def test_all_8_panel_values_mapped(self):
        for v in ("push-in", "pull-out", "lateral", "tracking", "orbit", "aerial", "handheld", "fixed"):
            assert v in CAMERA_H3_MAP, f"{v} 未映射"


class TestImageTemplates:
    def test_character_sheet_skeleton(self):
        p = build_character_sheet_prompt("Q版3D吃货哥，白色厨师帽")
        assert "character sheet" in p
        assert "front view, side view, back view" in p
        assert "Q版3D吃货哥" in p
        assert "#E4002B" in p
        assert "flat white background" in p

    def test_product_kv_skeleton(self):
        p = build_product_kv_prompt("法风烧饼", "54层酥皮", "12.5元", light_style="studio")
        assert "法风烧饼" in p
        assert "54层酥皮" in p
        assert "softbox" in p
        assert "clean space for headline" in p

    def test_kv_defaults(self):
        p = build_product_kv_prompt("")
        assert "产品" in p  # 兜底名
        assert "质感层次分明" in p  # 兜底卖点
