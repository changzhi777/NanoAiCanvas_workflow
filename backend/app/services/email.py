"""Email service for password reset and notifications"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import get_settings

settings = get_settings()


async def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """Send password reset email with token"""
    # Construct reset URL - frontend handles the reset page
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

    subject = "NanoAI Canvas - Password Reset"
    html_body = f"""
    <div style="max-width: 600px; margin: 0 auto; font-family: sans-serif;">
        <h2 style="color: #168;">Password Reset</h2>
        <p>You requested a password reset for your NanoAI Canvas account.</p>
        <p>Click the link below to reset your password (valid for 1 hour):</p>
        <a href="{reset_url}"
           style="display: inline-block; padding: 12px 24px; background: #168; color: white;
                  text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Reset Password
        </a>
        <p style="color: #999; font-size: 13px;">
            If you didn't request this, you can safely ignore this email.
        </p>
    </div>
    """

    return await _send_email(to_email, subject, html_body)


async def _send_email(to: str, subject: str, html_body: str) -> bool:
    """Send email via SMTP"""
    smtp_config = {
        "host": getattr(settings, "SMTP_HOST", ""),
        "port": getattr(settings, "SMTP_PORT", 587),
        "user": getattr(settings, "SMTP_USER", ""),
        "password": getattr(settings, "SMTP_PASSWORD", ""),
        "from_addr": getattr(settings, "SMTP_FROM", "noreply@nanoai.fun"),
    }

    if not smtp_config["host"]:
        # No SMTP configured - log instead
        print(f"[Email] SMTP not configured. Would send to {to}: {subject}")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = smtp_config["from_addr"]
        msg["To"] = to
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(smtp_config["host"], smtp_config["port"]) as server:
            server.starttls()
            if smtp_config["user"]:
                server.login(smtp_config["user"], smtp_config["password"])
            server.sendmail(smtp_config["from_addr"], [to], msg.as_string())

        return True
    except Exception as e:
        print(f"[Email] Failed to send: {e}")
        return False
