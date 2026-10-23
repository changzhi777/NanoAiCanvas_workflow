"""engines.audio_engine — L2 音频深度引擎（WavMark，16-bit payload）。

实测背书：TTS 16kHz 音轨 无损/AAC 96k/AAC 48k 全部 bit 100%；8k 降采样为边界。
选型说明：AudioSeal 0.2.0 在 torch≥2.4 存在 LSTM/permute 上游崩溃 bug，弃用。

容量：16-bit payload = 项目 hash 高 4b + ID 尾 12b；完整 8B ID 经 registry rec['wavmark'] 关联。
输入任意格式（ffmpeg 转 16k 单声道），输出恒为 16kHz wav。

用法：
    from engines.audio_engine import AudioEngine
    e = AudioEngine()
    e.embed("in.mp3", id8, "out.wav", project="p")
    hit, key2b, detail = e.extract("out.wav")
"""
from __future__ import annotations

import hashlib
import pathlib
import subprocess
import wave as _wave

import numpy as np
import soundfile as sf
import torch

from engines.base import Engine, _torch_ok

AUDIO_EXT = {".mp3", ".wav", ".aac", ".m4a", ".flac"}


def _pack16(id8: bytes, project: str) -> bytes:
    proj4 = int(hashlib.sha256(project.encode()).hexdigest(), 16) & 0xF
    seq12 = int.from_bytes(id8[6:8], "big") & 0xFFF
    return bytes([(proj4 << 4) | (seq12 >> 8), seq12 & 0xFF])


def _load_wav(path: str):
    w = _wave.open(path, "rb")
    sr = w.getframerate()
    ch = w.getnchannels()
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
    _model = None

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
        import wavmark
        if AudioEngine._model is None:
            AudioEngine._model = wavmark.load_model()
        return AudioEngine._model

    def _to16k(self, src: str, out_wav: str) -> str:
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src,
                        "-ar", "16000", "-ac", "1", out_wav], check=True)
        return out_wav

    def embed(self, src: str, wm_id: bytes, out: str, project: str = "default", **kw) -> str:
        import soundfile as sf
        import torch
        import wavmark

        model = self._load()
        tmp = str(pathlib.Path(out).parent / "_aud16.wav")
        self._to16k(src, tmp)
        sig, sr = sf.read(tmp, dtype="float32")
        if sig.ndim > 1:
            sig = sig[:, 0]

        key16 = _pack16(wm_id, project)
        payload = np.array([int(b) for b in format(int.from_bytes(key16, "big"), "016b")],
                           dtype=np.int32)
        with torch.no_grad():
            wm_sig, _ = wavmark.encode_watermark(model, sig, payload)
        sf.write(out, wm_sig, sr)
        pathlib.Path(tmp).unlink(missing_ok=True)
        return out

    def extract(self, path: str) -> tuple[bool, bytes | None, dict]:
        import soundfile as sf
        import torch
        import wavmark

        model = self._load()
        tmp = pathlib.Path(path).parent / "_audchk16.wav"
        if pathlib.Path(path).suffix.lower() != ".wav":
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", path,
                            "-ar", "16000", "-ac", "1", str(tmp)], check=True)
            src = str(tmp)
        else:
            src = path
        sig, sr = sf.read(src, dtype="float32")
        if sig.ndim > 1:
            sig = sig[:, 0]
        with torch.no_grad():
            dec, _ = wavmark.decode_watermark(model, sig)
        tmp_p = pathlib.Path(tmp)
        tmp_p.unlink(missing_ok=True)
        if dec is None:
            return False, None, {"note": "起始位未对齐（无水印或已损毁）"}
        key16 = int("".join(map(str, dec)), 2).to_bytes(2, "big")
        return True, key16, {"key16": key16.hex()}
