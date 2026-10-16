"""COS 上传器 —— ssh 生产容器取密钥 → put_object（密钥永不离机落库）。

用法：
    python3 cos_upload.py <本地文件> <cos-key>
    # 例：python3 cos_upload.py out/tts_en/tts_en_close.mp3 tvc/digital-human/tts_en_close.mp3
    python3 cos_upload.py --ls tvc/digital-human/          # 列前缀
"""
import os
import re
import subprocess
import sys

from qcloud_cos import CosConfig, CosS3Client


def _env():
    r = subprocess.run(
        ["ssh", "-o", "ConnectTimeout=20", "zhiming",
         "cd /opt/nanoai && docker compose exec -T backend bash -c "
         "'echo REGION=$COS_REGION;echo BUCKET=$COS_BUCKET;"
         "echo SID=$COS_SECRET_ID;echo SKEY=$COS_SECRET_KEY'"],
        capture_output=True, text=True, timeout=40)
    env = dict(re.findall(r"(REGION|BUCKET|SID|SKEY)=(\S+)", r.stdout))
    assert len(env) == 4, f"env parse failed: {r.stdout!r} {r.stderr[-200:]!r}"
    return env


def client():
    e = _env()
    return CosS3Client(CosConfig(Region=e["REGION"], SecretId=e["SID"],
                                 SecretKey=e["SKEY"], Scheme="https")), e


def upload(src: str, key: str) -> str:
    c, e = client()
    ctype = ("video/mp4" if src.endswith(".mp4") else
             "audio/mpeg" if src.endswith((".mp3",)) else
             "image/png" if src.endswith(".png") else "application/octet-stream")
    with open(src, "rb") as f:
        c.put_object(Bucket=e["BUCKET"], Body=f.read(), Key=key, ContentType=ctype)
    url = f"https://{e['BUCKET']}.cos.{e['REGION']}.myqcloud.com/{key}"
    print(f"✓ uploaded {os.path.getsize(src) // 1024}KB → {url}")
    return url


def ls(prefix: str, n=30):
    c, e = client()
    r = c.list_objects(Bucket=e["BUCKET"], Prefix=prefix, MaxKeys=n)
    for o in r.get("Contents", []):
        print(f"{o['Size']:>10}  {o['Key']}")


if __name__ == "__main__":
    if sys.argv[1] == "--ls":
        ls(sys.argv[2])
    else:
        upload(sys.argv[1], sys.argv[2])
