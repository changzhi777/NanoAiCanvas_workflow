# Nanoai Team8 Agent System
# Copyright © 2026 AiHXC.Team
# Author: 外星动物（常智）/ IoTchange <14455975@qq.com>
from pathlib import Path


def get_version() -> str:
    version_file = Path(__file__).parent / "VERSION"
    return version_file.read_text().strip()


__version__ = get_version()
