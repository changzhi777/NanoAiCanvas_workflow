"""RAG 输入 — URL / PDF / 文本文件 → 参考素材。

用法：
    from ingest import build_context
    ctx = build_context(["https://...", "paper.pdf", "notes.md"])

产出：拼接的参考资料文本（去噪、限量），作为脚本生成的背景上下文。
"""
import pathlib
import re
import urllib.request

from bs4 import BeautifulSoup


def _from_url(url: str) -> str:
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
    html = urllib.request.urlopen(req, timeout=60).read()
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "header", "footer", "aside", "form"]):
        tag.decompose()
    text = soup.get_text("\n")
    text = re.sub(r"\n{2,}", "\n", text)
    return re.sub(r"[ \t]{2,}", " ", text).strip()


def _from_pdf(path: pathlib.Path) -> str:
    from pypdf import PdfReader
    reader = PdfReader(str(path))
    return "\n".join((p.extract_text() or "") for p in reader.pages).strip()


def _from_text(path: pathlib.Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def fetch_source(src: str) -> str:
    """单源 → 文本。不支持的源抛 ValueError。

    - URL：静态页可抓；JS 渲染站点（百度百科/知乎等）正文提取不足，会抛错提示换源
    - text: 前缀：直接内联文本（规避一切抓取问题）
    """
    if src.startswith("text:"):
        return src[5:].strip()
    if src.startswith(("http://", "https://")):
        text = _from_url(src)
        if len(text) < 200:
            raise ValueError(
                f"正文提取不足（{len(text)} 字）——该站可能是 JS 渲染或反爬；"
                f"建议改用 PDF/MD 或 text: 内联文本")
        return text
    p = pathlib.Path(src)
    if not p.exists():
        raise ValueError(f"来源不存在: {src}")
    if p.suffix.lower() == ".pdf":
        return _from_pdf(p)
    if p.suffix.lower() in (".txt", ".md", ".markdown"):
        return _from_text(p)
    raise ValueError(f"不支持的格式: {p.suffix}（支持 URL / .pdf / .txt / .md）")


def build_context(sources: list[str], max_chars: int = 6000) -> str:
    """多源 → 拼接上下文（每源截断 + 总量封顶）。单源失败不阻断，计入提示。"""
    parts, errs = [], []
    budget = max_chars // max(len(sources), 1)
    for src in sources:
        try:
            text = fetch_source(src)
            if len(text) > budget:
                text = text[:budget] + "…"
            parts.append(f"【来源 {src}】\n{text}")
            print(f"  ✓ 取材 {src}（{len(text)} 字）")
        except Exception as e:
            errs.append(f"{src}: {e}")
            print(f"  ⚠ 取材失败 {src}: {str(e)[:80]}")
    if not parts:
        raise RuntimeError(f"全部取材失败: {errs}")
    return "\n\n".join(parts)


if __name__ == "__main__":
    import sys
    print(build_context(sys.argv[1:])[:1500])
