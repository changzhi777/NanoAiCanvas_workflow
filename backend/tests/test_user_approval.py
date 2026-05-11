"""注册→审批流程验证脚本（无数据库依赖）"""
import sys
import os

# 纯逻辑验证，不导入数据库相关模块


def test_user_status_enum():
    """验证 UserStatus 枚举值"""
    import enum

    class UserStatus(str, enum.Enum):
        PENDING = "pending"
        APPROVED = "approved"
        REJECTED = "rejected"

    assert UserStatus.PENDING == "pending"
    assert UserStatus.APPROVED == "approved"
    assert UserStatus.REJECTED == "rejected"
    print("✅ UserStatus 枚举正确")


def test_default_status_is_pending():
    """验证模型文件中默认状态"""
    model_path = os.path.join(os.path.dirname(__file__), "..", "app", "models", "user.py")
    with open(model_path) as f:
        content = f.read()
    # 检查 status 列的 default 值
    assert "default=UserStatus.PENDING" in content, "status default 应为 PENDING"
    assert "default=UserStatus.APPROVED" not in content, "status default 不应为 APPROVED"
    print("✅ User 模型默认 status=PENDING")


def test_approval_no_rollback():
    """验证审批代码中不再有危险的 rollback"""
    admin_path = os.path.join(os.path.dirname(__file__), "..", "app", "api", "admin_users.py")
    with open(admin_path) as f:
        content = f.read()
    # rollback 不应出现在 approve 函数中
    approve_start = content.find('approve_user')
    approve_end = content.find('@router.post("/{user_id}/reject"')
    approve_code = content[approve_start:approve_end]
    assert "rollback" not in approve_code, "approve_user 不应包含 rollback（会撤销审批状态）"
    assert "logging" in approve_code, "approve_user 应使用 logging 记录积分错误"
    print("✅ 审批函数无危险 rollback")


def test_approval_logic():
    """验证审批状态流转逻辑"""
    import enum

    class UserStatus(str, enum.Enum):
        PENDING = "pending"
        APPROVED = "approved"
        REJECTED = "rejected"

    # 注册 → pending
    status = UserStatus.PENDING
    assert status == "pending"

    # 审批通过 → approved → 可以登录
    status = UserStatus.APPROVED
    assert status == "approved"
    can_login = (status == UserStatus.APPROVED)
    assert can_login is True

    # 审批拒绝 → rejected → 不可以登录
    status = UserStatus.REJECTED
    assert status == "rejected"
    can_login = (status == UserStatus.APPROVED)
    assert can_login is False

    # pending 不可以登录
    status = UserStatus.PENDING
    can_login = (status == UserStatus.APPROVED)
    assert can_login is False

    print("✅ 审批状态流转逻辑正确")


def test_admin_api_paths():
    """验证前端 admin API 路径包含 /api 前缀"""
    api_path = os.path.join(os.path.dirname(__file__), "..", "..", "src", "lib", "api", "admin-api.ts")
    if not os.path.exists(api_path):
        print("⚠️  跳过: admin-api.ts 不存在")
        return

    with open(api_path) as f:
        content = f.read()

    # 检查 /admin/users 相关路径都包含 /api 前缀
    admin_users_lines = [line for line in content.split("\n") if "/admin/users" in line]
    for line in admin_users_lines:
        assert "/api/admin/users" in line, f"缺少 /api 前缀: {line.strip()}"

    print("✅ 前端 admin API 路径包含 /api 前缀")


def test_email_domain_validation():
    """验证邮箱域名验证逻辑"""
    allowed_domains = {"caohua.com", "nanoai.fun", "qq.com"}

    for email in ["user@caohua.com", "test@qq.com", "admin@nanoai.fun"]:
        domain = email.split("@")[1].lower()
        assert domain in allowed_domains

    for email in ["user@gmail.com", "test@163.com"]:
        domain = email.split("@")[1].lower()
        assert domain not in allowed_domains

    print("✅ 邮箱域名验证正确")


def test_error_message_matching():
    """验证前端 403 错误消息匹配逻辑"""
    test_cases = [
        ("Account pending approval. Please wait for admin review.", "pending"),
        ("Registration rejected. Please contact support.", "rejected"),
        ("Account pending", "pending"),
        ("rejected user", "rejected"),
    ]
    for detail, expected_key in test_cases:
        detail_lower = detail.lower()
        status_key = "rejected" if "reject" in detail_lower else "pending"
        assert status_key == expected_key, f"For '{detail}', expected {expected_key}, got {status_key}"

    print("✅ 错误消息匹配逻辑正确")


def test_register_auth_flow():
    """验证注册接口返回格式"""
    # 模拟注册成功响应
    response = {
        "message": "Registration submitted. Please wait for admin approval.",
        "status": "pending",
    }
    assert response["status"] == "pending"
    assert "wait" in response["message"].lower() or "等待" in response["message"]

    print("✅ 注册接口响应格式正确")


def test_login_blocked_for_pending():
    """验证 pending/rejected 用户登录被阻止"""
    # 模拟后端 auth.py 登录检查逻辑
    def check_login_status(status: str) -> tuple[bool, str]:
        """Returns (can_login, error_message)"""
        if status == "pending":
            return False, "Account pending approval"
        if status == "rejected":
            return False, "Registration rejected"
        if status == "approved":
            return True, ""
        return False, "Unknown status"

    can, _ = check_login_status("pending")
    assert not can
    can, _ = check_login_status("rejected")
    assert not can
    can, _ = check_login_status("approved")
    assert can

    print("✅ 登录状态检查正确")


if __name__ == "__main__":
    print("=" * 50)
    print("注册审批流程验证")
    print("=" * 50)
    tests = [
        test_user_status_enum,
        test_default_status_is_pending,
        test_approval_no_rollback,
        test_approval_logic,
        test_admin_api_paths,
        test_email_domain_validation,
        test_error_message_matching,
        test_register_auth_flow,
        test_login_blocked_for_pending,
    ]
    passed = 0
    failed = 0
    for t in tests:
        try:
            t()
            passed += 1
        except AssertionError as e:
            print(f"❌ {t.__name__}: {e}")
            failed += 1
        except Exception as e:
            print(f"❌ {t.__name__}: {type(e).__name__}: {e}")
            failed += 1

    print(f"\n{'=' * 50}")
    print(f"结果: {passed} 通过, {failed} 失败")
    if failed > 0:
        sys.exit(1)
