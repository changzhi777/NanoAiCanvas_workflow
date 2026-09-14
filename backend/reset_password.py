"""One-time password reset script. Usage: cd backend && python reset_password.py"""
import asyncio
from app.core.security import get_password_hash
from app.database import engine
from sqlalchemy import text

EMAIL = "cz@nanoai.fun"
NEW_PASSWORD = "cz777777+"


async def main():
    new_hash = get_password_hash(NEW_PASSWORD)
    async with engine.connect() as conn:
        result = await conn.execute(
            text("UPDATE users SET password_hash = :hash WHERE email = :email RETURNING email, username, status, role"),
            {"hash": new_hash, "email": EMAIL},
        )
        row = result.fetchone()
        if row:
            await conn.commit()
            print(f"✅ Password reset for {row[0]} (username={row[1]}, status={row[2]}, role={row[3]})")
        else:
            print(f"❌ User not found: {EMAIL}")


if __name__ == "__main__":
    asyncio.run(main())
