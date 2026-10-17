#!/usr/bin/env python3
"""wm_cli — 水印/凭证工具套件统一入口。

子命令：
  id          生成 128-bit 水印 ID
  embed       图像/视频嵌入水印（按扩展名自动分流）
  clean       视频元数据清洗（剥 workflow Prompt）
  sign        C2PA 签名（元数据隐式标识，合规强制项）
  fingerprint 五元组指纹入库
  detect      三层检测管线 → 证据分级报告
  pipeline    一条龙：detect(幂等) → embed → clean → sign → fingerprint

示例：
  python3 wm_cli.py pipeline out.png --project henry8
  python3 wm_cli.py pipeline out.mp4 --project henry8
  python3 wm_cli.py detect out.png
"""
import argparse
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))

import wm_c2pa        # noqa: E402
import wm_detect      # noqa: E402
import wm_fingerprint # noqa: E402
import wm_video       # noqa: E402
from wm_id import make_id, parse_id  # noqa: E402
from wm_image import decode as img_decode  # noqa: E402
from wm_image import embed as img_embed  # noqa: E402

VIDEO_EXT = {".mp4", ".mov", ".webm"}


def cmd_id(a):
    wm, info = make_id(a.project)
    print(f"ID(hex): {wm.hex()}\ninfo: {json.dumps(info, ensure_ascii=False)}")
    return wm


def cmd_embed(a):
    wm = bytes.fromhex(a.wm) if a.wm else make_id(a.project)[0]
    out = a.out or str(pathlib.Path(a.input).with_stem(pathlib.Path(a.input).stem + "_wm"))
    if pathlib.Path(a.input).suffix.lower() in VIDEO_EXT:
        wm_video.embed(a.input, wm, out)
    else:
        img_embed(a.input, wm, out)
    ok, info = parse_id(wm)
    print(f"✓ 嵌入 {out}\n  ID: {wm.hex()}  {json.dumps(info, ensure_ascii=False)}")


def cmd_clean(a):
    out = a.out or str(pathlib.Path(a.input).with_stem(pathlib.Path(a.input).stem + "_clean"))
    wm_c2pa.clean_video(a.input, out)
    print(f"✓ 清洗 {out}")


def cmd_sign(a):
    out = a.out or str(pathlib.Path(a.input).with_stem(pathlib.Path(a.input).stem + "_signed"))
    meta = json.loads(a.meta) if a.meta else {"project": a.project or "unknown"}
    wm_c2pa.sign(a.input, meta, out, title=a.title or "")
    state, _ = wm_c2pa.verify(out)
    print(f"✓ 签名 {out}  [verify: {state}]")


def cmd_fingerprint(a):
    rec = wm_fingerprint.fingerprint(a.input)
    n = wm_fingerprint.register(rec)
    print(f"✓ 指纹入库 #{n}  pHash={rec['phash']}  sha={rec['sha']}")


def cmd_detect(a):
    report = wm_detect.detect(a.input)
    print(wm_detect.summarize(report))
    if a.out:
        pathlib.Path(a.out).write_text(json.dumps(report, ensure_ascii=False, indent=1),
                                       encoding="utf-8")
        print(f"✓ 报告 {a.out}")


def cmd_pipeline(a):
    src = pathlib.Path(a.input)
    stem, ext = src.stem, src.suffix.lower()
    d = pathlib.Path(a.out_dir or src.parent)
    d.mkdir(parents=True, exist_ok=True)
    meta = {"project": a.project, "generator": a.generator, "source": src.name}

    # 幂等：已处理则跳过
    pre = wm_detect.detect(src)
    if pre["evidence"] in ("ID_MATCH", "OURS_SIGNED"):
        print(f"↷ 已处理（{pre['evidence']}），跳过")
        return

    wm, info = make_id(a.project)
    work = d / f"{stem}.work{ext}"
    print(f"[1/4] 嵌入水印 {wm.hex()}")
    if ext in VIDEO_EXT:
        wm_video.embed(src, wm, work)
    else:
        img_embed(src, wm, work)

    print("[2/4] 元数据清洗")
    if ext in VIDEO_EXT:
        cleaned = d / f"{stem}.clean{ext}"
        wm_c2pa.clean_video(work, cleaned)
        work.unlink(missing_ok=True)
        work = cleaned

    print("[3/4] C2PA 签名")
    final = d / f"{stem}_final{ext}"
    wm_c2pa.sign(work, meta, final, title=src.stem)
    if work != final:
        work.unlink(missing_ok=True)

    print("[4/4] 指纹入库")
    state, data = wm_c2pa.verify(final)
    c2pa_id = (data.get("active_manifest") or "") if data else ""
    rec = wm_fingerprint.fingerprint(final, wm_id=wm, c2pa=c2pa_id)
    n = wm_fingerprint.register(rec)

    print(f"✓ 交付 {final}\n  证据: OURS_SIGNED+ID_MATCH  ID: {wm.hex()}  指纹 #{n}")
    print(f"  {json.dumps(info, ensure_ascii=False)}")


def cmd_selftest(a):
    """内置冒烟：ID 往返/篡改 → 合成图嵌入/解码 → 攻击链。全绿即套件健康。"""
    import numpy as np
    import cv2
    from wm_id import parse_id

    print("[1] ID 往返 + magic/RS 防线")
    wm, info = make_id("selftest")
    ok, i2 = parse_id(wm)
    assert ok and i2["project_hash"] == info["project_hash"], "ID 往返失败"
    bad_magic = bytes([wm[0] ^ 0xFF]) + wm[1:]
    assert not parse_id(bad_magic)[0], "非法 magic 未被拒"
    from wm_id import decode_block, encode_block
    block = encode_block(wm)
    ok_r, rec = decode_block(block)
    assert ok_r and rec == wm, "RS 编解码失败"
    bad_block = bytearray(block)
    for i in (1, 3, 7, 11, 15, 18):            # 翻 6 字节 = RS 纠错极限
        bad_block[i] ^= 0xFF
    ok_e, rec_e = decode_block(bytes(bad_block))
    assert ok_e and rec_e == wm, "RS 纠 6 字节失败"
    bad_block[0] ^= 0xFF                        # 第 7 字节错 → 超限拒绝
    ok_x, rec_x = decode_block(bytes(bad_block))
    assert rec_x is None, "超限错误未被拒"
    print("    ✅")

    print("[2] 图像嵌入/解码（1280×720 平滑合成图，模拟真实图像低频特性）")
    yy, xx = np.mgrid[0:720, 0:1280]
    smooth = (128 + 60 * np.sin(xx / 97.0) * np.cos(yy / 83.0)
              + 0.05 * xx + 0.03 * yy)
    img = np.stack([smooth, smooth * 0.96 + 10, 255 - smooth], axis=-1)
    img = np.clip(img, 0, 255).astype("uint8")
    cv2.imwrite("/tmp/_wm_selftest.png", img)
    img_embed("/tmp/_wm_selftest.png", wm, "/tmp/_wm_selftest_wm.png")
    hit, payload, _ = img_decode("/tmp/_wm_selftest_wm.png")
    assert hit and payload == wm, "嵌入/解码失败"
    print("    ✅")

    print("[3] 攻击链（JPG q85 + 缩放 50% 回采）")
    atk = cv2.imread("/tmp/_wm_selftest_wm.png")
    h, w = atk.shape[:2]
    atk = cv2.resize(cv2.resize(atk, (w // 2, h // 2)), (w, h))
    cv2.imwrite("/tmp/_wm_selftest_atk.jpg", atk, [cv2.IMWRITE_JPEG_QUALITY, 85])
    hit, payload, _ = img_decode("/tmp/_wm_selftest_atk.jpg")
    assert hit and payload == wm, "攻击链解码失败"
    print("    ✅")
    print("selftest 全绿")


def main():
    p = argparse.ArgumentParser(description="wmtools — 隐形水印/凭证工具套件")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("id", help="生成水印 ID")
    s.add_argument("--project", required=True)
    s.set_defaults(fn=cmd_id)

    s = sub.add_parser("embed", help="嵌入水印")
    s.add_argument("input")
    s.add_argument("--project", default="default")
    s.add_argument("--wm", help="已有 ID(hex)，缺省生成新 ID")
    s.add_argument("--out")
    s.set_defaults(fn=cmd_embed)

    s = sub.add_parser("clean", help="视频元数据清洗")
    s.add_argument("input")
    s.add_argument("--out")
    s.set_defaults(fn=cmd_clean)

    s = sub.add_parser("sign", help="C2PA 签名")
    s.add_argument("input")
    s.add_argument("--project", default="default")
    s.add_argument("--meta", help="JSON 字符串元数据")
    s.add_argument("--title")
    s.add_argument("--out")
    s.set_defaults(fn=cmd_sign)

    s = sub.add_parser("fingerprint", help="指纹入库")
    s.add_argument("input")
    s.set_defaults(fn=cmd_fingerprint)

    s = sub.add_parser("detect", help="三层检测")
    s.add_argument("input")
    s.add_argument("--out", help="JSON 报告输出路径")
    s.set_defaults(fn=cmd_detect)

    s = sub.add_parser("pipeline", help="一条龙：幂等检测→嵌入→清洗→签名→指纹")
    s.add_argument("input")
    s.add_argument("--project", required=True)
    s.add_argument("--generator", default="NanoAiCanvas")
    s.add_argument("--out-dir")
    s.set_defaults(fn=cmd_pipeline)

    s = sub.add_parser("selftest", help="内置冒烟自测")
    s.set_defaults(fn=cmd_selftest)

    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
