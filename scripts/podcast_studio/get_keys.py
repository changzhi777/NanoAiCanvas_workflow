"""密钥获取 — 从生产容器读取，本地缓存 24h。

用法：
    from get_keys import get_keys
    keys = get_keys()   # {"MINIMAX_KEY":..., "MINIMAX_BASE":..., "WUYIN_KEY":..., "WUYIN_BASE":...}

密钥永不离机落库：走 ssh → 生产容器 → app.config.get_settings（upload3.py 已验证模式）。
缓存文件 .keys.json 加入 .gitignore。
"""
import json
import re
import subprocess
import time
from pathlib import Path

CACHE = Path(__file__).parent / ".keys.json"
TTL = 24 * 3600

_FIELDS = "MINIMAX_KEY|MINIMAX_BASE|WUYIN_KEY|WUYIN_BASE"

_REMOTE_CMD = (
    "cd /opt/nanoai && docker compose exec -T backend python3 -c "
    "'from app.config import get_settings; s=get_settings(); "
    "print(\"MINIMAX_KEY=\"+s.MINIMAX_API_KEY); "
    "print(\"MINIMAX_BASE=\"+s.MINIMAX_API_BASE_URL); "
    "print(\"WUYIN_KEY=\"+s.WUYINKEJI_API_KEY); "
    "print(\"WUYIN_BASE=\"+s.WUYINKEJI_API_BASE_URL)'"
)


def _fetch_remote() -> dict:
    r = subprocess.run(
        ["ssh", "-o", "ConnectTimeout=20", "zhiming", _REMOTE_CMD],
        capture_output=True, text=True, timeout=60,
    )
    kv = dict(re.findall(rf"({_FIELDS})=(\S+)", r.stdout))
    missing = [f for f in _FIELDS.split("|") if f not in kv]
    if missing:
        raise RuntimeError(f"密钥获取失败，缺 {missing}；stderr={r.stderr[-200:]}")
    return kv


def get_keys(force_refresh: bool = False) -> dict:
    """返回四元组密钥；缓存 24h。force_refresh=True 强制重拉。"""
    if not force_refresh and CACHE.exists():
        try:
            data = json.loads(CACHE.read_text())
            if time.time() - data.get("ts", 0) < TTL:
                return data["keys"]
        except Exception:
            pass  # 缓存损坏则重拉
    keys = _fetch_remote()
    CACHE.write_text(json.dumps({"ts": time.time(), "keys": keys}))
    return keys


if __name__ == "__main__":
    k = get_keys()
    print("✓ 密钥就绪：", {k2: v[:10] + "..." for k2, v in k.items()})
