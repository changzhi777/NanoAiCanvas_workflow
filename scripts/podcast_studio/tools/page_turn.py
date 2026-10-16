"""有声书 3D 翻页渲染器 —— 页面绕左缘翻转（透视压缩 + 页背纸感 + 动态阴影）。

几何：θ = p·π（p: 0→1 翻页进度）
  前半 p<0.5  正面可见：旧页绕左缘旋转，屏幕宽 = W·cosθ，随角变暗
  后半 p≥0.5  页背翻过中缝盖向左侧：宽 = W·|cosθ|，白纸质感 + 左缘阴影
  新页（B）始终作底层完整显示，翻起页覆盖其上；新页右侧有旧页投影柔影。

用法（build_final_en.py 调用）：
    write_turn_clip(ff, A_png, B_png, out_mp4, dur=0.4, fps=30, W=1280, H=720)
"""
import math
import subprocess

import numpy as np
from PIL import Image

W, H = 1280, 720
PAPER = np.array([246, 241, 231], dtype=np.float32)   # 页背纸色


def _load(p):
    """输入 PNG 或 mp4（ffmpeg 抽首帧），返回 HxWx3 float32。"""
    if str(p).endswith(".mp4"):
        raw = subprocess.run(
            ["ffmpeg", "-v", "error", "-i", str(p),
             "-vf", "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720",
             "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
            capture_output=True, timeout=60)
        return np.frombuffer(raw.stdout, np.uint8).reshape(H, W, 3).astype(np.float32)
    im = Image.open(p).convert("RGB").resize((W, H), Image.LANCZOS)
    return np.asarray(im, dtype=np.float32)


def turn_frame(A, B, p):
    """翻页第 p 帧（0→1），返回 uint8 HxWx3。

    统一几何：翻起页（正面→页背）覆盖左侧 [0, page_w]，page_w=W·|cosθ|·spread；
    折痕在 page_w 处，其右侧 90px 是旧页投下的柔影带（中段最强）。
    """
    out = B.copy()
    xs = np.arange(W, dtype=np.float32)[None, :].repeat(H, 0)   # HxW
    ys = np.arange(H, dtype=np.float32)[:, None].repeat(W, 1)

    p = p * p * (3 - 2 * p)          # smoothstep 缓动：起手蓄力→中段翻过→收尾缓落

    theta = p * math.pi
    c = math.cos(theta)
    spread = 1.0 + 0.10 * math.sin(p * math.pi)                  # 中段微展开（呼吸感）

    # ---- 翻起页内容（前半=正面旧页变暗；后半=页背向左滑出屏幕）----
    if p < 0.5:
        page_w = abs(c) * W * spread                             # 翻起页当前屏幕宽
        sx_top, sx_bot = 0.90, 1.06                              # 行级梯形透视（向左倒）
        row_k = sx_top + (sx_bot - sx_top) * (ys / H)
        pw_row = np.maximum(page_w * row_k, 1e-3)
        u = xs / pw_row * W                                      # 反采样旧页坐标
        valid = (u >= 0) & (u < W - 1)
        u0 = np.clip(u, 0, W - 2).astype(np.int32)
        rows = np.arange(H)[:, None]                 # 行级索引（A[y, u0[y]]），防 4 维爆炸
        frac = (u - u0)[..., None]
        col = A[rows, u0] * (1 - frac) + A[rows, u0 + 1] * frac
        col *= 1.0 - 0.45 * math.sin(p * math.pi)    # 翻起时变暗
        edge = page_w                                            # 折痕/阴影锚点
    else:
        q = (p - 0.5) * 2                                        # 0→1
        back_w = abs(c) * W                                      # 页背展开宽 0→W
        shift = -q * W * 1.05                                    # 同时向左滑出屏幕
        u = (xs - shift) / max(back_w, 1e-3) * W
        col = np.ones((H, W, 3), np.float32) * PAPER
        col *= (0.86 + 0.14 * np.clip(1 - u / max(back_w, 1e-3), 0, 1))[..., None]
        valid = (xs >= shift) & (xs < shift + back_w) & (u >= 0) & (u < W)
        edge = shift + back_w                                    # 屏内右缘（p→1 滑出）

    # ---- 合成：B 底图 + 翻起页 + 折痕 + 右侧柔影 ----
    alpha = valid[..., None]
    out = B * (1 - alpha) + col * alpha

    crease = np.clip(1 - np.abs(xs - edge) / 6.0, 0, 1) * 0.35
    shadow_w = 90.0
    d = (xs - edge) / shadow_w
    shadow = np.clip(1 - d, 0, 1) ** 1.5 * 0.35 * math.sin(p * math.pi)
    out -= (crease + shadow)[..., None] * 255
    return np.clip(out, 0, 255).astype(np.uint8)


def write_turn_clip(FF, A_png, B_png, out_mp4, dur=0.4, fps=30):
    """渲染一段翻页过渡视频。"""
    A, B = _load(A_png), _load(B_png)
    n = max(int(round(dur * fps)), 6)
    proc = subprocess.Popen(
        [FF, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
         "-pix_fmt", "yuv420p", str(out_mp4)],
        stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for i in range(n):
        proc.stdin.write(turn_frame(A, B, (i + 0.5) / n).tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        raise RuntimeError(f"turn clip 编码失败: {out_mp4}")


if __name__ == "__main__":
    import sys
    write_turn_clip(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
