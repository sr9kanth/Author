"""Create the initial admin user if one doesn't exist."""
import asyncio
import os

async def main():
    email = os.environ.get("ADMIN_EMAIL", "sr9kanth@gmail.com")
    password = os.environ.get("ADMIN_PASSWORD", "changeme123")
    full_name = os.environ.get("ADMIN_NAME", "Admin")

    from app.core.database import AsyncSessionLocal
    from app.modules.auth.models import User
    from app.modules.auth.service import AuthService
    from app.modules.auth.schemas import UserCreate
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            print(f"Admin user {email} already exists.")
            return

        service = AuthService(db)
        data = UserCreate(
            email=email,
            password=password,
            full_name=full_name,
            role="administrator",
        )
        user = await service.create_user(data)
        print(f"Created admin user: {user.email}")

asyncio.run(main())
