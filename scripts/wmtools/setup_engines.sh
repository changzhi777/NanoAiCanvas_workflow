#!/usr/bin/env bash
# setup_engines.sh — 幂等安装 L2 深度引擎（WAM / Video Seal）
# 本地缓存优先（/tmp/wam_test /tmp/videoseal_test），否则网络拉取。
# 依赖：torch(MPS/CPU) torchvision opencv numpy imagehash reedsolo + brew: ffmpeg exiftool c2patool
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
V="$HERE/vendor"
W="$V/weights"
mkdir -p "$W"

have() { python3 -c "import $1" 2>/dev/null; }

echo "== [1/4] WAM 仓库 =="
if [ -d "$V/watermark-anything" ]; then
  echo "  已存在，跳过"
elif [ -d /tmp/wam_test/repo ]; then
  cp -r /tmp/wam_test/repo "$V/watermark-anything"
  rm -rf "$V/watermark-anything/.git"
  echo "  从本地缓存复制"
else
  git clone --depth 1 https://github.com/facebookresearch/watermark-anything "$V/watermark-anything"
fi

echo "== [2/4] WAM 权重 (360MB) =="
if [ -f "$W/wam_mit.pth" ]; then
  echo "  已存在，跳过"
else
  curl -sL -o "$W/wam_mit.pth" "https://dl.fbaipublicfiles.com/watermark_anything/wam_mit.pth"
fi

echo "== [3/4] Video Seal 仓库 + 权重 (218MB) =="
if [ -d "$V/videoseal" ]; then
  echo "  仓库已存在，跳过"
elif [ -d /tmp/videoseal_test/repo ]; then
  cp -r /tmp/videoseal_test/repo "$V/videoseal"
  rm -rf "$V/videoseal/.git"
  echo "  从本地缓存复制"
else
  git clone --depth 1 https://github.com/facebookresearch/videoseal "$V/videoseal"
fi
if [ -f "$W/y_256b_img.pth" ]; then
  echo "  权重已存在，跳过"
else
  curl -sL -o "$W/y_256b_img.pth" "https://dl.fbaipublicfiles.com/videoseal/y_256b_img.pth"
fi

echo "== [4/4] Python 依赖 =="
for m in torch torchvision omegaconf einops timm lpips sklearn reedsolo av ffmpeg; do
  have "$m" || pip3 install --break-system-packages -q "$m" || echo "  ⚠ $m 安装失败，请手动处理"
done
have pycocotools || pip3 install --break-system-packages -q pycocotools || true

echo "== 完成。验证：python3 wm_cli.py selftest =="
