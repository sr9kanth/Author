"""Service layer for prompt template governance."""

import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.prompts.models import PromptTemplate
from app.modules.prompts.schemas import PromptTemplateCreate, PromptTemplateList, PromptTemplateRead


class PromptTemplateService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_templates(self, template_type: str | None = None, skip: int = 0, limit: int = 100) -> PromptTemplateList:
        query = select(PromptTemplate)
        count_query = select(func.count(PromptTemplate.id))
        if template_type:
            query = query.where(PromptTemplate.template_type == template_type)
            count_query = count_query.where(PromptTemplate.template_type == template_type)
        query = query.order_by(PromptTemplate.created_at.desc()).offset(skip).limit(limit)
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()
        result = await self.db.execute(query)
        items = result.scalars().all()
        return PromptTemplateList(items=[PromptTemplateRead.model_validate(t) for t in items], total=total)

    async def get_template(self, template_id: str) -> PromptTemplateRead:
        result = await self.db.execute(
            select(PromptTemplate).where(PromptTemplate.id == uuid.UUID(template_id))
        )
        template = result.scalar_one_or_none()
        if not template:
            raise ValueError("Prompt template not found")
        return PromptTemplateRead.model_validate(template)

    async def create_template(self, data: PromptTemplateCreate, created_by: str) -> PromptTemplateRead:
        template = PromptTemplate(
            name=data.name,
            version=data.version,
            template_type=data.template_type,
            system_prompt=data.system_prompt,
            user_template=data.user_template,
            is_active=data.is_active,
            notes=data.notes,
            created_by=uuid.UUID(created_by),
        )
        # If this new template is active, deactivate others of the same type
        if data.is_active:
            await self.db.execute(
                update(PromptTemplate)
                .where(PromptTemplate.template_type == data.template_type)
                .values(is_active=False)
            )
        self.db.add(template)
        await self.db.flush()
        await self.db.refresh(template)
        return PromptTemplateRead.model_validate(template)

    async def activate_template(self, template_id: str) -> PromptTemplateRead:
        result = await self.db.execute(
            select(PromptTemplate).where(PromptTemplate.id == uuid.UUID(template_id))
        )
        template = result.scalar_one_or_none()
        if not template:
            raise ValueError("Prompt template not found")
        # Deactivate all templates of same type
        await self.db.execute(
            update(PromptTemplate)
            .where(PromptTemplate.template_type == template.template_type)
            .values(is_active=False)
        )
        template.is_active = True
        await self.db.flush()
        await self.db.refresh(template)
        return PromptTemplateRead.model_validate(template)

    async def get_active_template(self, template_type: str) -> PromptTemplateRead | None:
        result = await self.db.execute(
            select(PromptTemplate)
            .where(PromptTemplate.template_type == template_type, PromptTemplate.is_active == True)  # noqa: E712
        )
        template = result.scalar_one_or_none()
        if not template:
            return None
        return PromptTemplateRead.model_validate(template)
