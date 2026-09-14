"""视频缩略图服务单元测试 — mock subprocess
运行: cd backend && python -m pytest tests/unit/test_video_thumbnail.py -v
"""
import pytest
import os
from unittest.mock import patch, MagicMock

from app.services.video_thumbnail import (
    extract_keyframe,
    get_video_duration,
)


class TestExtractKeyframe:
    def test_success(self):
        """Should return True when ffmpeg succeeds"""
        mock_proc = MagicMock()
        mock_proc.returncode = 0
        with patch("app.services.video_thumbnail.subprocess.run", return_value=mock_proc), \
             patch("os.path.exists", return_value=True):
            result = extract_keyframe("/fake/video.mp4", "/fake/out.jpg")
            assert result is True

    def test_ffmpeg_failure(self):
        """Should return False when ffmpeg fails"""
        mock_proc = MagicMock()
        mock_proc.returncode = 1
        with patch("app.services.video_thumbnail.subprocess.run", return_value=mock_proc), \
             patch("os.path.exists", return_value=False):
            result = extract_keyframe("/fake/video.mp4", "/fake/out.jpg")
            assert result is False

    def test_timeout(self):
        """Should return False on timeout"""
        with patch("app.services.video_thumbnail.subprocess.run", side_effect=TimeoutError()):
            result = extract_keyframe("/fake/video.mp4", "/fake/out.jpg")
            assert result is False

    def test_uses_correct_timestamp(self):
        """Should pass timestamp to ffmpeg"""
        mock_proc = MagicMock()
        mock_proc.returncode = 0
        with patch("app.services.video_thumbnail.subprocess.run", return_value=mock_proc) as mock_run, \
             patch("os.path.exists", return_value=True):
            extract_keyframe("/fake/video.mp4", "/fake/out.jpg", timestamp=5.5)
            cmd = mock_run.call_args[0][0]
            assert "-ss" in cmd
            idx = cmd.index("-ss")
            assert cmd[idx + 1] == "5.5"


class TestGetVideoDuration:
    def test_parses_duration(self):
        """Should parse ffprobe output"""
        mock_proc = MagicMock()
        mock_proc.stdout = b"30.5\n"
        with patch("app.services.video_thumbnail.subprocess.run", return_value=mock_proc):
            assert get_video_duration("/fake/video.mp4") == 30.5

    def test_returns_zero_on_error(self):
        """Should return 0.0 on error"""
        with patch("app.services.video_thumbnail.subprocess.run", side_effect=Exception("no ffprobe")):
            assert get_video_duration("/fake/video.mp4") == 0.0

    def test_returns_zero_on_empty_output(self):
        """Should return 0.0 on empty output"""
        mock_proc = MagicMock()
        mock_proc.stdout = b""
        with patch("app.services.video_thumbnail.subprocess.run", return_value=mock_proc):
            assert get_video_duration("/fake/video.mp4") == 0.0


class TestDownloadAndExtract:
    @pytest.mark.asyncio
    async def test_download_failure(self):
        """Should return False when download fails"""
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = MagicMock()
            mock_response = MagicMock()
            mock_response.raise_for_status.side_effect = Exception("Network error")
            mock_client.get = pytest.mock.AsyncMock(return_value=mock_response) if hasattr(pytest, 'mock') else MagicMock(return_value=mock_response)

            # Simpler approach: just mock the whole download
            from app.services.video_thumbnail import download_and_extract

            with patch("httpx.AsyncClient") as mc:
                instance = MagicMock()
                instance.__aenter__ = MagicMock(return_value=instance)
                instance.__aexit__ = MagicMock(return_value=None)
                instance.get.side_effect = Exception("Network error")
                mc.return_value = instance

                result = await download_and_extract("http://invalid/video.mp4", "/fake/out.jpg")
                assert result is False
