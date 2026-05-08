import asyncio, asyncpg
from app.config import get_settings

async def main():
    s = get_settings()
    dsn = f"postgresql://{s.POSTGRES_USER}:{s.POSTGRES_PASSWORD}@{s.POSTGRES_HOST}:{s.POSTGRES_PORT or 5432}/{s.POSTGRES_DB}"
    conn = await asyncpg.connect(dsn)

    try:
        await conn.execute("CREATE TYPE generationstatus AS ENUM ('success', 'failed', 'aborted')")
    except asyncpg.exceptions.DuplicateObjectError:
        pass

    await conn.execute("""
        CREATE TABLE IF NOT EXISTS generation_task_logs (
            id SERIAL PRIMARY KEY,
            user_id UUID,
            node_id VARCHAR(64),
            workflow_id UUID,
            skill_id VARCHAR(64),
            prompt TEXT,
            status generationstatus NOT NULL,
            error_message TEXT,
            total_time_ms INTEGER,
            step_durations JSONB,
            model_params JSONB,
            started_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    await conn.execute("CREATE INDEX IF NOT EXISTS idx_genlog_status ON generation_task_logs(status)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_genlog_created ON generation_task_logs(created_at)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_genlog_skill ON generation_task_logs(skill_id)")

    print("OK: generation_task_logs table created")
    await conn.close()

asyncio.run(main())
