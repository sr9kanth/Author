"""One-off: reset a user's password directly in the DB.

Usage (locally against a DATABASE_URL, or via `railway run`):

    ADMIN_EMAIL="sr9kanth@gmail.com" NEW_PASSWORD="your-new-password" \
        python backend/reset_admin_password.py
"""
import asyncio
import os


async def main():
    email = os.environ["ADMIN_EMAIL"]
    new_password = os.environ["NEW_PASSWORD"]

    from app.core.database import AsyncSessionLocal
    from app.core.security import hash_password
    from app.modules.auth.models import User
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            print(f"No user found with email {email}")
            return

        user.hashed_password = hash_password(new_password)
        await db.commit()
        print(f"Password reset for {email}")


asyncio.run(main())
