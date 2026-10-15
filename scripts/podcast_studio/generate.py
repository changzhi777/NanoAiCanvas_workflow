"""播客管线主入口 — 一条命令出片。

用法：
    python generate.py --topic "量子隧穿" --style tech
    python generate.py --topic "王阳明心学" --style culture --mode dialogue
    python generate.py --topic "..." --dry-run          # 只出脚本
    python generate.py --resume                          # 跳过已完成步骤（断点续跑）

产物：out/script.json → out/timeline.json → out/cards/*.png → out/final.mp4
"""
import argparse
import json
import pathlib
import time

import yaml

from assemble import assemble
from cards import build_cards
from script_gen import generate_script
from tts import build_timeline

HERE = pathlib.Path(__file__).parent
OUT = HERE / "out"


def main():
    ap = argparse.ArgumentParser(description="播客管线：文案 → TTS → 图文卡 → 成片")
    ap.add_argument("--topic", required=True, help="主题（一句话）")
    ap.add_argument("--style", choices=["tech", "culture"], help="风格（默认取 config）")
    ap.add_argument("--mode", choices=["monologue", "dialogue"], help="形态（默认取 config）")
    ap.add_argument("--dry-run", action="store_true", help="只生成脚本不合成")
    ap.add_argument("--no-cards", action="store_true", help="跳过图文卡（复用已有 out/cards）")
    ap.add_argument("--no-hero", action="store_true", help="跳过首尾爆点视频（纯图文出片）")
    ap.add_argument("--doc", action="append", default=[], metavar="SRC",
                    help="参考来源（URL/PDF/MD/TXT，可多次；RAG 素材喂脚本）")
    ap.add_argument("--external-audio", metavar="MP3",
                    help="外部解说音轨（跳过 TTS，ASR 词级对齐图文/字幕）")
    ap.add_argument("--no-bgm", action="store_true", help="不加 BGM")
    ap.add_argument("--resume", action="store_true", help="断点续跑：已有产物全部复用")
    args = ap.parse_args()

    cfg = yaml.safe_load(open(HERE / "config.yaml", encoding="utf-8"))
    if args.style:
        cfg["defaults"]["style"] = args.style
    if args.mode:
        cfg["defaults"]["mode"] = args.mode
    OUT.mkdir(exist_ok=True)

    t0 = time.time()

    # ---- 1. 脚本 ----
    sf = OUT / "script.json"
    if args.resume and sf.exists():
        script = json.loads(sf.read_text(encoding="utf-8"))
        print(f"[1/4] 复用脚本《{script['title']}》")
    else:
        print("[1/4] 生成脚本…")
        context = None
        if args.doc:
            from ingest import build_context
            print("      取材中…")
            context = build_context(args.doc)
        script = generate_script(args.topic, cfg, context=context)
        sf.write_text(json.dumps(script, ensure_ascii=False, indent=1), encoding="utf-8")
        chars = sum(len(l["text"]) for l in script["lines"])
        print(f"      《{script['title']}》{len(script['lines'])} 句 / {chars} 字")
    if args.dry_run:
        print("dry-run 完成 →", sf)
        return

    # ---- 2. 时间轴：外部解说 ASR 对齐 或 TTS 合成 ----
    ext_srt = None
    if args.external_audio:
        tl_file, srt_file = OUT / "timeline.json", OUT / "external.srt"
        if args.resume and tl_file.exists() and srt_file.exists():
            timeline = json.loads(tl_file.read_text(encoding="utf-8"))
            print("[2/4] 复用外部解说对齐")
        else:
            print("[2/4] 外部解说 ASR 对齐…")
            from asr_align import align, asr_word_level, write_outputs
            segs = asr_word_level(args.external_audio)
            timeline, sentences = align(script["lines"], segs)
            write_outputs(timeline, sentences, OUT)
            print(f"      段落 {len(timeline['lines'])} / 字幕 {len(sentences)} / {timeline['total']}s")
        ext_srt = str(OUT / "external.srt")
    else:
        print("[2/4] TTS 合成…")
        timeline = build_timeline(script, cfg)
        print(f"      口播 {timeline['total']}s / {len(timeline['lines'])} 句")

    # ---- 3. 图文卡 ----
    if args.no_cards:
        cards = sorted(str(p) for p in (OUT / "cards").glob("card_*.png"))
        assert len(cards) >= len(timeline["lines"]), "已有卡数量不足，去掉 --no-cards 重跑"
        print(f"[3/4] 复用图文卡 {len(cards)} 张")
    else:
        print("[3/4] 生成图文卡…")
        cards = build_cards(timeline, cfg)
        print(f"      {len(cards)} 张就绪")

    # ---- 3.5 爆点视频（首尾各 6s；失败不阻断，降级为纯图文）----
    hero_front = hero_back = None
    hero_cfg = cfg.get("hero", {})
    if hero_cfg.get("enabled") and not args.no_hero:
        from hero_shot import gen_hero
        print("[3.5/4] 爆点视频…")
        for tag, img, prompt_key in (("front", cards[0], "front_prompt"),
                                     ("back", cards[-1], "back_prompt")):
            path = OUT / f"hero_{tag}.mp4"
            try:
                if not (args.resume and path.exists()):
                    gen_hero(img, hero_cfg[prompt_key].strip(), cfg, path)
                print(f"      {tag} 爆点就绪")
                if tag == "front":
                    hero_front = str(path)
                else:
                    hero_back = str(path)
            except Exception as e:
                print(f"      ⚠ {tag} 爆点失败（跳过）: {str(e)[:120]}")

    # ---- 4. 合成 ----
    print("[4/4] 合成…")
    if args.no_bgm:
        cfg["_no_bgm"] = True
    final = assemble(timeline, cards, cfg, hero_front=hero_front, hero_back=hero_back,
                     external_audio=args.external_audio, external_srt=ext_srt)

    print(f"\n✅ 出片 {final}  总耗时 {(time.time() - t0) / 60:.1f} 分钟")


if __name__ == "__main__":
    main()
