"""wm_c2pa — C2PA 签名/验证 + 元数据清洗。

实测依据：c2patool 0.27.22（brew）对 H3 输出 mp4 实签 validation_state: Valid。
链序铁律：embed → clean → sign（签名绑定哈希，必须最后；clean 会剥掉已有 C2PA）。

用法：
    from wm_c2pa import clean_video, sign, verify
    clean_video("in.mp4", "clean.mp4")                 # 剥 H3 workflow Prompt（防泄露）
    sign("clean.mp4", {"project": "henry8"}, "out.mp4")
    state, data = verify("out.mp4")                    # 'OURS' | 'THIRD_PARTY' | None
"""
import json
import pathlib
import subprocess
import tempfile

C2PA = "c2patool"
FF = "ffmpeg"
META_LABEL = "com.nanocanvas.meta"   # 本管线签名标识（判定 OURS vs 第三方）


def clean_video(src, out) -> str:
    """重封装剥除全部全局元数据（含 ComfyUI workflow Prompt）。流不变，秒级。"""
    subprocess.run([FF, "-y", "-v", "error", "-i", str(src),
                    "-map", "0", "-map_metadata", "-1", "-c", "copy", str(out)],
                   check=True, timeout=600)
    return str(out)


def sign(src, meta: dict, out, title: str = "") -> str:
    """写 C2PA manifest（含本管线标识 assertion）并签名。图/视频通用。"""
    manifest = {
        "tag": "nanocanvas",
        "claim_generator": "NanoAiCanvas_workflow/wmtools",
        "actions": [{"action": "c2pa.created",
                     "softwareAgent": meta.get("generator", "NanoAiCanvas")}],
        "assertions": [
            {"label": META_LABEL,
             "data": {k: str(v) for k, v in meta.items()}},
        ],
    }
    if title:
        manifest["title"] = title
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(manifest, f, ensure_ascii=False)
        mpath = f.name
    try:
        subprocess.run([C2PA, "-f", str(src), "-m", mpath, "-o", str(out)],
                       check=True, timeout=600, capture_output=True)
    finally:
        pathlib.Path(mpath).unlink(missing_ok=True)
    return str(out)


def verify(path) -> tuple[str | None, dict]:
    """读 C2PA 凭证。返回 (判定, 原始数据)。判定：'OURS'/'THIRD_PARTY'/None。"""
    r = subprocess.run([C2PA, str(path)], capture_output=True, text=True, timeout=300)
    if r.returncode != 0 or not r.stdout.strip():
        return None, {}
    try:
        data = json.loads(r.stdout)
    except json.JSONDecodeError:
        return None, {}
    blob = json.dumps(data, ensure_ascii=False)
    if META_LABEL in blob:
        return "OURS", data
    if data.get("active_manifest"):
        return "THIRD_PARTY", data
    return None, {}
