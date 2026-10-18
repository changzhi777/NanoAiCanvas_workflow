"""notebooks_shim — WAM repo notebooks 工具的导入桥（路径注入 + re-export）。"""
import pathlib
import sys

WAM = pathlib.Path(__file__).parent.parent / "vendor" / "watermark-anything"
for _p in (str(WAM), str(WAM / "notebooks")):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from notebooks.inference_utils import (  # noqa: E402,F401
    default_transform,
    load_model_from_checkpoint,
    msg2str,
    unnormalize_img,
)
