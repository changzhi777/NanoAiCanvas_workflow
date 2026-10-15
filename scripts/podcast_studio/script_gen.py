"""脚本生成 — MiniMax-M2.x 产出结构化播客脚本。

输出 JSON：
    monologue: {"title": "...", "lines": [{"text": "...", "visual_hint": "..."}]}
    dialogue:  {"title": "...", "lines": [{"speaker": "host|guest", "text": "...", "visual_hint": "..."}]}

用法：
    from script_gen import generate_script
    script = generate_script(topic="量子计算", cfg=cfg)   # cfg = config.yaml dict
"""
import json
import re
import urllib.request

from get_keys import get_keys

_THINK_BLOCK = re.compile(r"<(think|thinking|reasoning)>.*?</\1>", re.DOTALL | re.IGNORECASE)

_SYSTEM = """你是一名"文化+科技"纪录片短视频文案作者。基于给定主题写播客脚本。

## 硬性要求（违反即废稿）
1. 总字数 {word_budget} 字（±10%），恰好 {n_min}~{n_max} 句，**每句不超过 {per_line} 字**
2. 三幕结构：第 1 句钩子（制造悬念）→ 中段展开（具体、有画面）→ 末句收束（回扣主题）
3. 每句必须带 visual_hint：为该句配的 9:16 插画视觉描述，英文 ≤40 词，
   风格基调（必须遵循）：{style_visual}
4. 口语化科普，禁止空话套话；每句独立成意，能单独配图
{dialogue_rule}
## 输出
只输出 JSON，不要任何其他文字（包括解释、思维链、markdown 代码块标记）：
{{"title": "节目标题", "lines": [{{"speaker": "host", "text": "……", "visual_hint": "..."}}, …]}}
"""

_DIALOGUE_RULE = """5. 双人对谈：speaker 交替取 "host"/"guest"；host 提问引导，guest 干货输出；
   末句必须回到 host 收束。总轮次 {n_min}~{n_max} 句（含两人）。
"""
_MONOLOGUE_RULE = "5. 单口播：全文一个人称叙述，不要出现对话体。\n"


def _strip_think(text: str) -> str:
    """推理模型可能把思维链混进 content，剥离之（同 tvc_engine 根因）。"""
    return _THINK_BLOCK.sub("", text or "").strip()


def _extract_json(text: str) -> dict | None:
    """从模型输出提取 JSON：代码块 → output 标签 → 平衡括号兜底。"""
    m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    m = re.search(r"<output>([\s\S]*?)</output>", text)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    start = text.find("{")
    if start < 0:
        return None
    depth, in_str, esc = 0, False, False
    for i in range(start, len(text)):
        c = text[i]
        if esc:
            esc = False
        elif c == "\\" and in_str:
            esc = True
        elif c == '"':
            in_str = not in_str
        elif not in_str:
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start:i + 1])
                    except json.JSONDecodeError:
                        return None
    return None


def _call_llm(system: str, topic: str, cfg: dict, context: str | None = None) -> str:
    keys = get_keys()
    req = urllib.request.Request(
        f"{keys['MINIMAX_BASE'].rstrip('/')}/text/chatcompletion_v2",
        data=json.dumps({
            "model": cfg["models"]["script"],
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": _user_msg(topic, context)},
            ],
            "temperature": 0.9,
            "max_tokens": 4096,
        }).encode(),
        headers={"Authorization": f"Bearer {keys['MINIMAX_KEY']}",
                 "Content-Type": "application/json"},
        method="POST",
    )
    resp = json.loads(urllib.request.urlopen(req, timeout=180).read())
    return _strip_think(resp["choices"][0]["message"]["content"])


def _user_msg(topic: str, context: str | None) -> str:
    """主题 + 可选参考资料（RAG 素材，脚本须基于其事实创作）。"""
    msg = f"主题：{topic}"
    if context:
        msg += ("\n\n参考资料（脚本须基于以下素材的事实创作，不得杜撰关键信息）：\n"
                + context)
    return msg


def generate_script(topic: str, cfg: dict, mode: str | None = None,
                    context: str | None = None) -> dict:
    """生成播客脚本并做结构校验；字数偏差时带反馈重试一次。失败抛 RuntimeError。"""
    mode = mode or cfg["defaults"]["mode"]
    d = cfg["defaults"]
    if mode == "monologue":
        n_min, n_max = d["sentence_count"]
        word_budget = int(d["target_duration"] * d["words_per_second"])
    else:  # dialogue：时长由句数驱动（每句约 12-20 字）
        n_min, n_max = 24, 60
        word_budget = 900
    per_line = max(18, int(word_budget / n_min) + 4)

    system = _SYSTEM.format(
        word_budget=word_budget, n_min=n_min, n_max=n_max, per_line=per_line,
        style_visual=cfg["styles"][cfg["defaults"]["style"]]["visual"].strip(),
        dialogue_rule=_DIALOGUE_RULE.format(n_min=n_min, n_max=n_max)
        if mode == "dialogue" else _MONOLOGUE_RULE,
    )

    script, feedback = None, ""
    for attempt in range(3):
        content = _call_llm(system + feedback, topic, cfg, context)
        script = _extract_json(content)
        if not script or not isinstance(script.get("lines"), list) or len(script["lines"]) < 3:
            feedback = f"\n\n## 上次输出不合法（缺 lines 或结构错），重新严格输出 JSON。"
            continue
        total = sum(len(l.get("text", "")) for l in script["lines"])
        if mode == "monologue":
            lo, hi = int(word_budget * 0.8), int(word_budget * 1.2)
            if not (lo <= total <= hi):
                over = total > hi
                feedback = (
                    f"\n\n## 上稿字数 {total}，要求 {lo}~{hi}。"
                    f"{'删减内容' if over else '扩充内容'}后重新输出完整 JSON，"
                    f"每句严守 ≤{per_line} 字。"
                )
                script = None
                continue
        break

    # ---- 结构校验 ----
    if not script or not isinstance(script.get("lines"), list) or len(script["lines"]) < 3:
        raise RuntimeError(f"脚本结构不合法: {str(script)[:200]}")
    for i, l in enumerate(script["lines"]):
        if not l.get("text"):
            raise RuntimeError(f"第 {i} 句 text 为空")
        l.setdefault("visual_hint", "")
        if mode == "dialogue":
            l.setdefault("speaker", "host" if i % 2 == 0 else "guest")
    script["mode"] = mode
    script["topic"] = topic
    return script


if __name__ == "__main__":
    import pathlib
    import sys
    import yaml

    here = str(pathlib.Path(__file__).parent)
    topic = sys.argv[1] if len(sys.argv) > 1 else "量子隧穿：为什么太阳会发光"
    cfg = yaml.safe_load(open(here + "/config.yaml", encoding="utf-8"))
    s = generate_script(topic, cfg)
    out = here + "/out/script.json"
    pathlib.Path(out).parent.mkdir(exist_ok=True)
    pathlib.Path(out).write_text(json.dumps(s, ensure_ascii=False, indent=1), encoding="utf-8")
    chars = sum(len(l["text"]) for l in s["lines"])
    print(f"✓ 《{s['title']}》 {len(s['lines'])} 句 / {chars} 字 → {out}")
    for l in s["lines"][:3]:
        print(f"  [{l.get('speaker', 'mono')}] {l['text'][:30]}…  🖼 {l['visual_hint'][:50]}…")
