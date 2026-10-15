"""音色克隆 — 上传参考音频 → 注册自定义音色（官方两步 SOP）。

用法：
    from voice_clone import clone_voice
    clone_voice("sample.wav", "podcast_host_zj", cfg)   # 一次性注册
    # 之后 config.yaml voices.monologue 改用 "podcast_host_zj"

官方要求：参考音频清晰人声，10s–5min（建议 15s），wav/mp3/m4a。
"""
import json

import requests

from get_keys import get_keys


def clone_voice(sample_path: str, voice_id: str, cfg: dict,
                model: str = "speech-02-turbo") -> dict:
    """两步克隆：files/upload(purpose=voice_clone) → voice_clone 注册。"""
    keys = get_keys()
    base = keys["MINIMAX_BASE"].rstrip("/")
    hdr = {"Authorization": f"Bearer {keys['MINIMAX_KEY']}"}

    # Step 1: 上传
    with open(sample_path, "rb") as f:
        r = requests.post(f"{base}/files/upload", headers=hdr,
                          files={"file": (sample_path.rsplit("/", 1)[-1], f, "audio/wav")},
                          data={"purpose": "voice_clone"}, timeout=120)
    up = r.json()
    if up.get("base_resp", {}).get("status_code") != 0:
        raise RuntimeError(f"上传失败: {json.dumps(up, ensure_ascii=False)[:200]}")
    file_id = up["file"]["file_id"]
    print(f"  ✓ 上传 file_id={file_id}")

    # Step 2: 克隆注册
    r = requests.post(f"{base}/voice_clone", headers={**hdr, "Content-Type": "application/json"},
                      json={"file_id": file_id, "voice_id": voice_id, "model": model},
                      timeout=120)
    cl = r.json()
    if cl.get("base_resp", {}).get("status_code") != 0:
        raise RuntimeError(f"克隆失败: {json.dumps(cl, ensure_ascii=False)[:200]}")
    print(f"  ✓ 音色注册成功: {voice_id}")
    return cl


if __name__ == "__main__":
    import pathlib
    import subprocess
    import sys
    import yaml

    HERE = pathlib.Path(__file__).parent
    cfg = yaml.safe_load(open(HERE / "config.yaml", encoding="utf-8"))

    # 无参数时：用 zaji-tts 的 chengshu 样音拼 15s 建档（全链路实测）
    sample = sys.argv[1] if len(sys.argv) > 1 else "/tmp/voice_sample_15s.wav"
    if len(sys.argv) <= 1:
        srcs = [f"/Users/mac/Downloads/zaji-tts/female-chengshu_{i}.wav" for i in (1, 2, 3)]
        lst = "/tmp/_wav_list.txt"
        open(lst, "w").write("\n".join(f"file '{s}'" for s in srcs))
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0",
                        "-i", lst, "-ar", "24000", "-ac", "1", sample], check=True)
        print(f"✓ 样本拼接完成: {sample}")

    vid = sys.argv[2] if len(sys.argv) > 2 else "podcast_host_zj"
    clone_voice(sample, vid, cfg)
    # 立刻用新音色合成一句验证
    sys.path.insert(0, str(HERE))
    from tts import synth_line, _audio_duration
    audio = synth_line("这是克隆音色的验证试听。", vid, cfg)
    p = pathlib.Path("/tmp/clone_verify.mp3")
    p.write_bytes(audio)
    print(f"✓ 新音色合成验证: {len(audio)//1024}KB / {_audio_duration(p):.2f}s → {p}")
