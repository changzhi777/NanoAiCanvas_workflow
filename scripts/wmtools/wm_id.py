"""wm_id — 水印 ID 编码器（64-bit + RS(20,8) 纠错块）。

ID 位分配（64-bit = 8 字节）：
  magic 8b(0x5A) | 项目 hash 16b | epoch 天数 16b | 随机序号 24b

传输块（20 字节）= ID 8B + RS ECC 12B，纠 ≤6 字节错。
  实测（720p + LINEAR 双缩放 + JPG q85 压力档）：位误码 3/160，RS 完整恢复。

用法：
    from wm_id import make_id, parse_id, encode_block, decode_block
    wm, info = make_id("henry8")      # wm: 8B ID
    block = encode_block(wm)          # 20B → 嵌入
    ok, wm2 = decode_block(raw20)     # RS 解码 + magic 校验
"""
import hashlib
import secrets
import struct
import time

from reedsolo import RSCodec

_MAGIC = 0x5A
_RS = RSCodec(12)            # RS(20, 8)：8B 消息 + 12B ECC，纠 6 字节错
_LEN = 8                     # ID 字节数


def make_id(project: str) -> tuple[bytes, dict]:
    """生成 64-bit 水印 ID。返回 (id_bytes, info)。"""
    proj = int(hashlib.sha256(project.encode()).hexdigest(), 16) & 0xFFFF   # 16b
    day = int(time.time() // 86400) & 0xFFFF                                 # 16b
    seq = secrets.randbits(24)                                               # 24b
    payload = bytes([_MAGIC]) + struct.pack(">HH", proj, day) + seq.to_bytes(3, "big")
    return payload, parse_id(payload)[1]


def parse_id(payload: bytes) -> tuple[bool, dict]:
    """解析 ID（magic 校验）。"""
    if len(payload) != _LEN:
        return False, {"error": f"长度 {len(payload)} != {_LEN}"}
    if payload[0] != _MAGIC:
        return False, {"error": "magic 不符（非本套件水印）"}
    proj, day = struct.unpack(">HH", payload[1:5])
    seq = int.from_bytes(payload[5:8], "big")
    date = time.strftime("%Y-%m-%d", time.gmtime(day * 86400)) if day else "?"
    return True, {"project_hash": f"{proj:04x}", "day": date, "seq": f"{seq:06x}"}


def encode_block(wm: bytes) -> bytes:
    """ID 8B → RS(20,8) 传输块 20B（嵌入用）。"""
    if len(wm) != _LEN:
        raise ValueError(f"ID 需 {_LEN} 字节")
    return bytes(_RS.encode(wm))


def decode_block(raw: bytes) -> tuple[bool, bytes | None]:
    """传输块 → RS 纠错解码 → ID。失败（超纠错能力/非本套件）返回 (False, None)。"""
    if len(raw) != _LEN + 12:
        return False, None
    try:
        msg, _, _ = _RS.decode(raw)
    except Exception:
        return False, None
    ok, info = parse_id(bytes(msg))
    return ok, (bytes(msg) if ok else None)
