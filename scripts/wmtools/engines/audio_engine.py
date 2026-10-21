"""engines.audio_engine — L2 音频深度引擎（WavMark，16-bit payload，恒 CPU）。

实测背书（维度二十）：TTS 音轨（16kHz）无损/AAC 96k/AAC 48k 全部 bit 100%；
8k 降采样为边界。AudioSeal py3.14 硬不兼容（Moshi SEANet LSTM 崩），弃用。

容量适配：WavMark 真实容量 16-bit payload（16 固定 pattern + 16 payload）。
  16-bit = 项目 hash 高 4b + 序号 12b；完整 8B ID 经 registry rec['wavmark'] 关联。

依赖：wavmark（pip，py3.14 直通）、soundfile、ffmpeg（重采样）。
坑：torchaudio 2.11 IO 迁 TorchCodec → 标准 wave 模块绕行。

用法（模块级单例）：
    from engines.audio_engine import AudioEngine
    e = AudioEngine()
    e.embed("in.mp3", id8, "out.wav", project="p")   # 输出恒 wav 16k
    hit, key2b, detail = e.extract("out.wav")
"""
from __future__ import annotations

import hashlib
import pathlib
import subprocess
import wave as _wave

from engines.base import Engine, _torch_ok

_model_cache: dict = {}
AUDIO_EXT = {".mp3", ".wav", ".aac", ".m4a", ".flac"}


def _pack16(id8: bytes, project: str) -> bytes:
    """16-bit 精简键：项目 hash 高 4b + ID 尾 12b（seq 低 12 位）。"""
    proj4 = int(hashlib.sha256(project.encode()).hexdigest(), 16) & 0xF
    seq12 = int.from_bytes(id8[6:8], "big") & 0xFFF
    return bytes([(proj4 << 4) | (seq12 >> 8), seq12 & 0xFF])


def _load_wav(path: str) -> tuple["object", int]:  # -> (torch C×N, sr)
    w = _wave.open(path, "rb")
    sr = w.getframerate()
    ch = w.getnchannels()
    import numpy as np
    data = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    w.close()
    import torch
    return torch.tensor(data.reshape(-1, ch)).T.contiguous(), sr


def _save_wav(path: str, tensor, sr: int) -> None:
    import numpy as np
    arr = (tensor.T.contiguous().numpy() * 32767).astype(np.int16)
    w = _wave.open(path, "wb")
    w.setnchannels(arr.shape[1])
    w.setsampwidth(2)
    w.setframerate(sr)
    w.writeframes(arr.tobytes())
    w.close()


class AudioEngine(Engine):
    name = "wavmark"
    tier = "deep"
    domain = "audio"

    def available(self) -> bool:
        try:
            import wavmark  # noqa: F401
            import soundfile  # noqa: F401
            return _torch_ok()
        except ImportError:
            return False

    def unavailable_reason(self) -> str:
        return "WavMark 引擎缺失——pip3 install --break-system-packages wavmark soundfile"

    def _load(self):
        if _model_cache.get("wm") is None:
            import wavmark
            _model_cache["wm"] = wavmark.load_model()
        return _model_cache["wm"]

    def embed(self, src: str, wm_id: bytes, out: str, project: str = "default", **kw) -> str:
        """音频深嵌。任意输入格式 → ffmpeg 转 16k wav → WavMark → 输出 wav 16k。"""
        import numpy as np
        import soundfile as sf
        import torch
        import wavmark

        model = self._load()
        tmp16 = pathlib.Path(out).parent / "_aud16.wav"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src,
                        "-ar", "16000", "-ac", "1", str(tmp16)], check=True)
        sig, sr = sf.read(str(tmp16), dtype="float32")
        if sig.ndim > 1:
            sig = sig[:, 0]

        key16 = _pack16(wm_id, project)
        payload = np.array([int(b) for b in format(int.from_bytes(key16, "big"), "016b")],
                           dtype=np.int32)
        with torch.no_grad():
            wm_sig, _ = wavmark.encode_watermark(model, sig, payload)
        sf.write(out, wm_sig, sr)
        tmp16.unlink(missing_ok=True)
        return out

    def extract(self, path: str) -> tuple[bool, bytes | None, dict]:
        """提取 16-bit 键。命中=解出 payload（bit 级存在性）；全 ID 需 registry 关联。"""
        import numpy as np
        import soundfile as sf
        import torch
        import wavmark

        model = self._load()
        tmp16 = pathlib.Path(path).parent / "_audchk16.wav"
        if pathlib.Path(path).suffix.lower() != ".wav":
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", path,
                            "-ar", "16000", "-ac", "1", str(tmp16)], check=True)
            src = str(tmp16)
        else:
            src = path
        sig, _ = sf.read(src, dtype="float32")
        if sig.ndim > 1:
            sig = sig[:, 0]
        with torch.no_grad():
            dec, info = wavmark.decode_watermark(model, sig)
        tmp16.unlink(missing_ok=True)
        if dec is None:
            return False, None, {"note": "start-bit 未对齐（无水印或已损毁）"}
        key16 = int("".join(map(str, dec)), 2).to_bytes(2, "big")
        return True, key16, {"key16": key16.hex()}

    # 便捷：拿 2B 键反查全 ID
    def link_full_id(self, key2b: bytes):
        import wm_fingerprint
        rec = wm_fingerprint.find_by_key("wavmark", key2b.hex())
        return (bytes.fromhex(rec["wm"]), rec) if rec else (None, None)
