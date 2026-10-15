"""人声分离 —— 带人声的曲子 → 纯伴奏轨（demucs htdemucs）。

用法：
    /opt/miniconda3/bin/python3 tools/vocal_remove.py <音频> [输出名]

说明：
  - demucs 环境在 miniconda（/opt/miniconda3），torch 已就位；CPU 约 1/5 实时
  - 输出 伴奏 + 人声 双轨 wav → 伴奏转 256k mp3 存 assets/bgm/
  - 生成后务必 ASR 验证（文本为空 = 无人声残留）
"""
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).parent.parent


def main():
    src = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else pathlib.Path(src).stem + "_INSTRUMENTAL"
    out_root = pathlib.Path("/tmp/demucs_out")
    subprocess.run(["/opt/miniconda3/bin/python3", "-m", "demucs",
                    "--two-stems=vocals", "-o", str(out_root), src], check=True)
    track = pathlib.Path(src).stem
    no_vocals = out_root / "htdemucs" / track / "no_vocals.wav"
    dst = HERE / "assets" / "bgm" / f"{name}.mp3"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(no_vocals),
                    "-c:a", "libmp3lame", "-b:a", "256k", str(dst)], check=True)
    print(f"✓ 伴奏 → {dst}\n  （入库前用 ASR 验证无人声残留）")


if __name__ == "__main__":
    main()
