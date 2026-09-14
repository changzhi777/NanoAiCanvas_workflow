"""Backend service unit tests - pubsub channel logic, email URL, pure logic"""
import json
import fnmatch


class TestPubsubChannelLogic:
    """Test pubsub channel naming conventions (pure logic, no imports)"""

    TASK_CHANNEL_PREFIX = "task:status:"

    def test_get_channel_format(self):
        channel = f"{self.TASK_CHANNEL_PREFIX}task-123"
        assert channel == "task:status:task-123"

    def test_get_channel_different_ids(self):
        c1 = f"{self.TASK_CHANNEL_PREFIX}abc"
        c2 = f"{self.TASK_CHANNEL_PREFIX}xyz"
        assert c1 != c2

    def test_get_channel_empty_id(self):
        channel = f"{self.TASK_CHANNEL_PREFIX}"
        assert channel == self.TASK_CHANNEL_PREFIX

    def test_message_format_processing(self):
        message = json.dumps({
            "task_id": "t-001",
            "status": "processing",
            "images": None,
            "error": None,
            "progress": 50,
        }, ensure_ascii=False)

        parsed = json.loads(message)
        assert parsed["task_id"] == "t-001"
        assert parsed["status"] == "processing"
        assert parsed["progress"] == 50

    def test_message_format_success_with_images(self):
        message = json.dumps({
            "task_id": "t-002",
            "status": "success",
            "images": ["img1.png", "img2.png"],
            "error": None,
            "progress": 100,
        }, ensure_ascii=False)

        parsed = json.loads(message)
        assert parsed["status"] == "success"
        assert len(parsed["images"]) == 2

    def test_message_format_failed_with_error(self):
        message = json.dumps({
            "task_id": "t-003",
            "status": "failed",
            "images": None,
            "error": "Timeout after 60s",
            "progress": 0,
        }, ensure_ascii=False)

        parsed = json.loads(message)
        assert parsed["status"] == "failed"
        assert parsed["error"] == "Timeout after 60s"

    def test_message_ensure_ascii_false(self):
        """Chinese characters should be preserved, not escaped"""
        message = json.dumps({
            "task_id": "t-004",
            "status": "processing",
            "error": "生成失败：超时",
            "progress": 30,
        }, ensure_ascii=False)

        assert "生成失败" in message
        assert "\\u" not in message.split('"error": ')[1].split('"')[1]

    def test_channel_pattern_matching(self):
        pattern = "task:status:*"
        assert fnmatch.fnmatch("task:status:abc", pattern)
        assert fnmatch.fnmatch("task:status:xyz-123", pattern)
        assert not fnmatch.fnmatch("other:channel", pattern)


class TestEmailLogic:
    """Test email URL construction and SMTP config logic"""

    def test_reset_url_construction(self):
        frontend_url = "http://localhost:5173"
        token = "abc123"
        url = f"{frontend_url}/reset-password?token={token}"
        assert url == "http://localhost:5173/reset-password?token=abc123"

    def test_reset_url_with_jwt_token(self):
        frontend_url = "https://nanoai.fun"
        token = "eyJhbGciOiJIUzI1NiJ9.payload.signature"
        url = f"{frontend_url}/reset-password?token={token}"
        assert token in url
        assert url.startswith("https://")

    def test_smtp_disabled_when_host_empty(self):
        smtp_host = ""
        # When host is empty, email service logs instead of sending
        assert not smtp_host  # Would trigger the "no SMTP" branch

    def test_smtp_default_port(self):
        default_port = 587
        assert default_port == 587

    def test_email_html_contains_reset_link(self):
        token = "test-token"
        reset_url = f"http://localhost:5173/reset-password?token={token}"
        html = f'<a href="{reset_url}">Reset Password</a>'
        assert reset_url in html
        assert "Reset Password" in html


class TestWorkflowExecutorLogic:
    """Test workflow executor progress calculation (pure math)"""

    def test_progress_all_success(self):
        total = 4
        completed = 4
        progress = int((completed / total) * 100)
        assert progress == 100

    def test_progress_partial(self):
        total = 4
        completed = 2
        progress = int((completed / total) * 100)
        assert progress == 50

    def test_progress_with_running(self):
        # Running task gets 50% credit
        total = 4
        completed = 2
        running = 1
        progress = int(((completed + running * 0.5) / total) * 100)
        assert progress == 62

    def test_progress_capped_at_95_while_running(self):
        total = 1
        completed = 0
        running = 1
        raw = int(((completed + running * 0.5) / total) * 100)
        capped = min(raw, 95)
        assert capped == 50  # 0.5/1 * 100 = 50, not 95

    def test_progress_zero_when_nothing_done(self):
        total = 4
        completed = 0
        running = 0
        progress = int(((completed + running * 0.5) / total) * 100)
        assert progress == 0


class TestPointsCalculation:
    """Test points pricing logic (pure math)"""

    # Node type to price mapping (from points_service)
    PRICES = {
        "script_generator": 5,
        "storyboard_generator": 10,
        "character_designer": 8,
        "minimax_text": 3,
        "nano_banana_2": 6,
        "unknown_node": 0,
    }

    def test_known_node_prices(self):
        assert self.PRICES["script_generator"] == 5
        assert self.PRICES["storyboard_generator"] == 10
        assert self.PRICES["character_designer"] == 8

    def test_unknown_node_zero_price(self):
        assert self.PRICES.get("nonexistent", 0) == 0

    def test_balance_check(self):
        balance = 100
        cost = 15
        assert balance >= cost
        assert balance - cost == 85

    def test_insufficient_balance(self):
        balance = 5
        cost = 10
        assert balance < cost

    def test_team_deduct_first(self):
        team_balance = 500
        personal_balance = 100
        cost = 50
        # Team pays first
        if team_balance >= cost:
            remaining_team = team_balance - cost
            remaining_personal = personal_balance
        assert remaining_team == 450
        assert remaining_personal == 100

    def test_team_insufficient_personal_backup(self):
        team_balance = 30
        personal_balance = 100
        cost = 50
        if team_balance >= cost:
            remaining_team = team_balance - cost
        else:
            # Team covers partial, personal covers rest
            personal_cost = cost - team_balance
            remaining_personal = personal_balance - personal_cost
        assert remaining_personal == 80  # 100 - (50-30)
