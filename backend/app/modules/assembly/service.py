import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.assembly.models import AssessmentPackage
from app.modules.assembly.schemas import (
    AssessmentPackageCreate,
    AssessmentPackageList,
    AssessmentPackageRead,
    AssessmentPackageUpdate,
)


class AssemblyService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_package(self, data: AssessmentPackageCreate, created_by: str) -> AssessmentPackageRead:
        package = AssessmentPackage(
            **data.model_dump(),
            created_by=uuid.UUID(created_by),
        )
        self.db.add(package)
        await self.db.flush()
        await self.db.refresh(package)
        return AssessmentPackageRead.model_validate(package)

    async def list_packages(self, skip: int = 0, limit: int = 20) -> AssessmentPackageList:
        count_result = await self.db.execute(select(func.count(AssessmentPackage.id)))
        total = count_result.scalar_one()
        result = await self.db.execute(select(AssessmentPackage).offset(skip).limit(limit))
        packages = result.scalars().all()
        return AssessmentPackageList(
            items=[AssessmentPackageRead.model_validate(p) for p in packages],
            total=total,
        )

    async def get_package(self, package_id: str) -> AssessmentPackageRead:
        result = await self.db.execute(select(AssessmentPackage).where(AssessmentPackage.id == uuid.UUID(package_id)))
        package = result.scalar_one_or_none()
        if not package:
            raise ValueError("Package not found")
        return AssessmentPackageRead.model_validate(package)

    async def update_package(self, package_id: str, data: AssessmentPackageUpdate) -> AssessmentPackageRead:
        result = await self.db.execute(select(AssessmentPackage).where(AssessmentPackage.id == uuid.UUID(package_id)))
        package = result.scalar_one_or_none()
        if not package:
            raise ValueError("Package not found")
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(package, field, value)
        await self.db.flush()
        await self.db.refresh(package)
        return AssessmentPackageRead.model_validate(package)
