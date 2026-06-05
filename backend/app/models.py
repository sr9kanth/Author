"""Central import of every model module.

Importing this module registers all ORM models on Base.metadata so that
create_all() (and Alembic autogenerate) can see the full schema. Newly-added
model modules should be added here.
"""
# noqa: F401
import app.modules.auth.models
import app.modules.knowledge.models
import app.modules.frameworks.models
import app.modules.assessment_config.models
import app.modules.generation.models
import app.modules.orchestration.models
import app.modules.quality.models
import app.modules.workflow.models
import app.modules.repository.models
import app.modules.assembly.models

# Feature modules (tables auto-created via create_missing_tables on boot)
try:
    import app.modules.guides.models  # noqa: F401
except ImportError:
    pass
try:
    import app.modules.metadata.models  # noqa: F401
except ImportError:
    pass
