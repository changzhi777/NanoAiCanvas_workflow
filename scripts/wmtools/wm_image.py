"""wm_image — 图像隐形水印嵌入/解码（dwtDctSvd + RS(20,8) 纠错块）。

实测依据（见 .zcf/plan/current/隐形水印研究.md + 本机实测记录）：
  - dwtDct 有 argmax 漂移缺陷（大图误码 ~58%），**必须用 dwtDctSvd**
  - RS(20,8)：720p + LINEAR 双缩放 + JPG 压力档下位误码 3/160，完整恢复
  - 检测端：多基准尺寸尝试（原生 → 项目出图尺寸 → 常见标准），RS 解码成功即命中

用法：
    from wm_image import embed, decode
    embed("in.png", wm8_bytes, "out.png")           # 嵌入（PSNR ~40dB）
    hit, payload, tries = decode("out.jpg")         # hit=True 时 payload 为 8B ID
"""
import pathlib

import cv2
import numpy as np

from wm_id import decode_block, encode_block, parse_id

# 检测端回采样候选：项目出图尺寸全集 + 常见标准（嵌入尺寸永远最先尝试）
BASELINES = [
    (2752, 1536),   # NB21 2K 16:9
    (1792, 2400),   # NB21 3:4 竖版
    (1376, 768),    # H3 768P
    (1920, 1080),
    (1280, 720),
]

BLOCK_LEN = 20   # RS 传输块字节（位流 160 bits）
ID_LEN = 8       # ID 字节


def embed(img_path, wm: bytes, out_path) -> str:
    """dwtDctSvd 嵌入 RS 传输块。要求图 ≥256×256。返回输出路径。"""
    bgr = cv2.imread(str(img_path))
    if bgr is None:
        raise FileNotFoundError(img_path)
    h, w = bgr.shape[:2]
    if h * w < 256 * 256:
        raise ValueError(f"图像过小 {w}x{h}，需 ≥256×256")

    from imwatermark import WatermarkEncoder
    enc = WatermarkEncoder()
    enc.set_watermark("bytes", encode_block(wm))   # 20B 位流（含 RS ECC）
    encd = enc.encode(bgr, "dwtDctSvd")
    cv2.imwrite(str(out_path), encd)
    return str(out_path)


class _BlockDecoder:
    """WatermarkDecoder 包装：解码 160-bit 位流 → RS 纠错 → (ok, 8B ID)。"""

    def __init__(self):
        from imwatermark import WatermarkDecoder
        self._dec = WatermarkDecoder("bits", BLOCK_LEN * 8)

    def decode(self, bgr, method="dwtDctSvd"):
        raw = self._dec.decode(bgr, method)          # bool bits → 20B
        return decode_block(np.packbits(raw).tobytes())


def decode(img_path, rescale: bool = True) -> tuple[bool, bytes | None, list[str]]:
    """多基准解码。返回 (hit, id_8b, 尝试记录)。

    命中判定：RS 解码成功 + magic 校验（双重保障，误判率趋近于零）。
    """
    bgr = cv2.imread(str(img_path))
    if bgr is None:
        raise FileNotFoundError(img_path)
    h, w = bgr.shape[:2]
    tries: list[str] = []

    candidates = [(w, h)]
    if rescale:
        candidates += [s for s in BASELINES if (s[0], s[1]) != (w, h)]

    dec = _BlockDecoder()
    for bw, bh in candidates:
        cur = bgr
        if (bw, bh) != (w, h):
            cur = cv2.resize(bgr, (bw, bh), interpolation=cv2.INTER_CUBIC)
        tag = f"{bw}x{bh}"
        try:
            hit, payload = dec.decode(cur)
        except Exception as e:
            tries.append(f"{tag}: 异常 {str(e)[:40]}")
            continue
        tries.append(f"{tag}: {'RS✅' if hit else 'RS❌'}")
        if hit:
            return True, payload, tries
    return False, None, tries
