"""Henry VIII 英文版对齐 —— ASR 词级 → 段落轴 + 中英双语 SRT。

三段音轴（全片统一）：
  open  [0, T_open)                     ← lipsync_henry_open.mp4 音轨
  mid   [T_open, T_open+T_mid)          ← tts_en_mid.mp3
  close [T_open+T_mid, total)           ← lipsync_henry_close.mp4 音轨

用法：python3 asr_align_en.py
输入：/tmp/henry8_script.json + /tmp/henry_asr_words_en.json (mid) + _oc.json (open/close)
产出：out/en_timeline.json（段落轴，含图卡序号）+ out/en_bilingual.srt
"""
import json
import pathlib
import re
import subprocess

HERE = pathlib.Path(__file__).parent
OUT = HERE / "out"

EN_PUNCT = re.compile(r"[,.!?;:—\-\"'()]+")


def probe_dur(p) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", str(p)], capture_output=True, text=True)
    return float(r.stdout.strip())


def norm_words(text: str) -> list[str]:
    return [w.lower() for w in EN_PUNCT.sub(" ", text).split() if w]


def load_asr():
    mid = json.loads(pathlib.Path("/tmp/henry_asr_words_en.json").read_text())
    oc = json.loads(pathlib.Path("/tmp/henry_asr_words_en_oc.json").read_text())
    t_open = probe_dur(HERE / "out" / "lipsync_henry_open.mp4")
    t_mid = probe_dur(HERE / "out" / "tts_en" / "tts_en_mid.mp3")
    return {"open": oc["open"], "mid": mid, "close": oc["close"]}, t_open, t_mid


def seg_lookup(words: list[dict], offset: float):
    """词流 → (小写词表, [(start,end), ...])，含全片偏移。"""
    texts = [norm_words(w["text"])[0] if norm_words(w["text"]) else "" for w in words]
    times = [(w["start"] + offset, w["end"] + offset) for w in words]
    return texts, times


def _find(probe, texts, start=0):
    n = len(probe)
    for i in range(start, len(texts) - n + 1):
        if texts[i:i + n] == probe:
            return i
    return -1


def anchor_seg(seg_text: str, texts: list[str], times, min_idx: int):
    """段首/段尾双词组锚点 → 全片 (start, end)。返回 (s_t, e_t, next_min)。

    ASR 词数 ≠ 脚本词数（Henry's→2 词、the Eighth→VIII），游标推进必漂移，
    故不数词：首锚定段起、尾锚定段止，且强制顺序（min_idx 单调递增）。
    容错链：5 词 → 首词（顺序约束已防误配）→ 全局。
    """
    words = norm_words(seg_text)
    head, tail = words[:5], words[-5:]
    i0 = _find(head, texts, min_idx)
    if i0 < 0:
        i0 = _find([head[0]], texts, min_idx)
    if i0 < 0:
        i0 = _find(head, texts, 0)
    if i0 < 0:
        raise RuntimeError(f"首锚未命中: {' '.join(head)}（min_idx={min_idx}）")
    i1 = _find(tail, texts, i0)
    if i1 < 0:
        i1 = _find(tail[-3:], texts, i0)
    if i1 < 0:
        raise RuntimeError(f"尾锚未命中: {' '.join(tail)}（i0={i0}）")
    tail_n = len(tail) if _find(tail, texts, i0) == i1 else 3
    return times[i0][0], times[i1 + tail_n - 1][1], i1 + tail_n


# ---- 中英句级对照（脚本即译稿，保证双语字幕一一对应）----
ZH = {
 0: ["1509年，英格兰王位传给了一位黄金王子。",
     "亨利八世——高大、健硕、才华横溢，为整个欧洲所倾慕。",
     "无人能想象，这位年轻国王即将掀起怎样的风暴。"],
 1: ["亨利是完美的文艺复兴王子。",
     "他说四门语言，谱写的乐曲至今仍在宫廷演奏，",
     "马上比武直到人群高呼他的名字。",
     "大学者伊拉斯谟称他为黄金之王。",
     "英格兰从未见过这样的君王。"],
 2: ["但一个执念缠绕着亨利的王朝：男性继承人。",
     "他的西班牙王后阿拉贡的凯瑟琳，",
     "二十年婚姻只留下一个活下来的女儿。",
     "当教皇拒绝废除这桩婚姻，",
     "亨利做出了粉碎英格兰千年历史的决定。",
     "他与罗马决裂，自立为国教会最高首脑，",
     "解散八百余座修道院，夺其黄金与土地。"],
 3: ["亨利六次成婚。",
     "学童至今传诵的口诀：离婚、斩首、死；离婚、斩首、活。",
     "安妮·博林命丧断头台——但在那之前，",
     "她给了英格兰最伟大的君主：伊丽莎白一世。"],
 4: ["亨利意志的代价，以鲜血计量。",
     "伟大的人文主义学者托马斯·莫尔爵士，为良知走上断头台。",
     "辅佐他十年的政治天才托马斯·克伦威尔，",
     "随后也命丧刑场。",
     "连国王最老的朋友白金汉公爵也未能幸免。",
     "在都铎英格兰，权力是剃刀之锋——而亨利握着刀刃。"],
 5: ["然而这位冷酷的国王建立的制度延续至今。",
     "他创建了皇家海军——那支击败西班牙无敌舰队、称霸海洋三个世纪的舰队。",
     "其子爱德华延续了宗教改革。",
     "他的女儿玛丽与伊丽莎白各自执政——一段无人预料的女王王朝。"],
 6: ["晚年，黄金王子已成暴君——臃肿、多疑，",
     "裹在皮裘里，令每个靠近他的人胆寒。",
     "1547年亨利驾崩，宫廷的眼泪中宽慰与悲恸各半。",
     "据说他的遗言是呼唤修士——那些修道院被他摧毁的人。"],
 7: ["亨利八世至今仍是英格兰史上最易辨认的国王。",
     "荷尔拜因画下世上最著名的肖像之一，",
     "莎士比亚的时代将他搬上舞台，",
     "上百部影视不断重塑——他庞大的身影横跨五个世纪的记忆。"],
 8: ["他的故事揭示一个永恒真理：一人之意志，足以令一国屈膝。",
     "但裁决每位君王的，是时间，而非权力。"],
 9: ["如果你喜欢这段都铎英格兰之旅，",
     "请关注我，更多历史故事持续奉上。",
     "点赞订阅下一集，",
     "评论区告诉我——下一位君主，讲谁？"],
}


def split_sentences(text: str) -> list[str]:
    """英文切句：. ! ? 收口；超 14 词按 , 二级切。"""
    parts = [p.strip() for p in re.split(r"(?<=[.!?])\s+", text) if p.strip()]
    fine = []
    for p in parts:
        if len(norm_words(p)) <= 14:
            fine.append(p)
        else:
            buf = ""
            for c in [x for x in re.split(r"(?<=[,;])\s+", p) if x.strip()]:
                if len(norm_words(buf + c)) <= 14:
                    buf += (" " if buf else "") + c
                else:
                    if buf:
                        fine.append(buf)
                    buf = c
            if buf:
                fine.append(buf)
    return fine


def main():
    asr, t_open, t_mid = load_asr()
    script = json.loads(pathlib.Path("/tmp/henry8_script.json").read_text())
    band = {0: "open", 9: "close"}  # 其余 → mid

    # 三段词流（全片轴）
    streams = {
        "open": seg_lookup(asr["open"], 0.0),
        "mid": seg_lookup(asr["mid"], t_open),
        "close": seg_lookup(asr["close"], t_open + t_mid),
    }
    total = t_open + t_mid + probe_dur(HERE / "out" / "lipsync_henry_close.mp4")

    lines, srt = [], []
    cursors = {k: 0 for k in streams}
    for ln in script["lines"]:
        sid = ln["id"]
        band_name = band.get(sid, "mid")
        texts, times = streams[band_name]
        s_t, e_t, cursors[band_name] = anchor_seg(ln["text"], texts, times, cursors[band_name])
        lines.append({**ln, "start": round(s_t, 3), "end": round(e_t, 3)})

        # 句级双语字幕
        sents = split_sentences(ln["text"])
        zh = ZH[sid]
        assert len(sents) == len(zh), f"段{sid} 句数不匹配 EN={len(sents)} ZH={len(zh)}"
        n_total = len(norm_words(ln["text"]))
        # 句时间：按句词数占比在段区间内切（ASR 词级已锚定段首尾）
        acc = 0.0
        for j, sent in enumerate(sents):
            w_n = len(norm_words(sent))
            j_s = s_t + (e_t - s_t) * (acc / n_total)
            acc += w_n
            j_e = e_t if j == len(sents) - 1 else s_t + (e_t - s_t) * (acc / n_total)
            srt.append({"en": sent, "zh": zh[j],
                        "start": round(j_s, 3), "end": round(j_e, 3)})

    # 段轴落盘（视频切分用）
    timeline = {"mode": "en_tts", "total": round(total, 3),
                "t_open": round(t_open, 3), "t_mid": round(t_mid, 3),
                "lines": lines}
    (OUT / "en_timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=1),
                                          encoding="utf-8")

    # 双语 SRT
    def ts(sec):
        ms = int(round(sec * 1000))
        h, ms = divmod(ms, 3600000)
        m, ms = divmod(ms, 60000)
        s, ms = divmod(ms, 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    blocks = []
    for i, s in enumerate(srt, 1):
        words, lines_, cur = s["en"].split(), [], ""
        for w in words:                      # 按词边界换行（~40 字符），不切单词
            if len(cur) + len(w) + 1 > 40 and cur:
                lines_.append(cur)
                cur = w
            else:
                cur = f"{cur} {w}".strip()
        if cur:
            lines_.append(cur)
        en_text = "\n".join(lines_)
        blocks.append(f"{i}\n{ts(s['start'])} --> {ts(s['end'])}\n"
                      f"{en_text}\n{s['zh']}\n")
    (OUT / "en_bilingual.srt").write_text("\n".join(blocks), encoding="utf-8")

    print(f"✓ 段轴 {len(lines)} 条 / 双语字幕 {len(srt)} 条 / 全片 {total:.1f}s "
          f"(open {t_open:.2f} + mid {t_mid:.2f} + close {total - t_open - t_mid:.2f})")
    for ln in lines:
        print(f"  段{ln['id']}: {ln['start']:.1f} → {ln['end']:.1f}")


if __name__ == "__main__":
    main()
