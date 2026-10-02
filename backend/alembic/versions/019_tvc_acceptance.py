"""019: TVC 验收标准审查闸 — 客户模板 + 审查报告两张表

功能：
- tvc_acceptance_templates：客户验收模板（criteria JSON 标准项数组）
- tvc_acceptance_reports：剧本闸/成片闸审查报告
- 种子 KFC 默认模板（customer_code=kfc，14 项标准）

downgrade：删表（种子随表删除）
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid


revision = "019_tvc_acceptance"
down_revision = "018_tvc_video_default_align"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "tvc_acceptance_templates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("customer_code", sa.String(64), nullable=False, unique=True, index=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("aspect_ratio", sa.String(8), nullable=False, server_default="9:16"),
        sa.Column("duration_sec", sa.Integer, nullable=False, server_default="15"),
        sa.Column("criteria", JSONB, nullable=False),
        sa.Column("brief_ctx", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "tvc_acceptance_reports",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("task_id", sa.String(64), nullable=False, index=True),
        sa.Column("template_id", UUID(as_uuid=True), nullable=True),
        sa.Column("template_snapshot", JSONB, nullable=True),
        sa.Column("gate", sa.String(16), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="unverified"),
        sa.Column("score", sa.Integer, nullable=False, server_default="0"),
        sa.Column("veto_hit", JSONB, nullable=False),
        sa.Column("items", JSONB, nullable=False),
        sa.Column("conflicts_top", JSONB, nullable=False),
        sa.Column("redo_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("decision", sa.String(16), nullable=True),
        sa.Column("model_meta", JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_tvc_acc_reports_task_gate", "tvc_acceptance_reports", ["task_id", "gate"])

    # 种子 KFC 模板
    from app.models.tvc_acceptance import DEFAULT_KFC_TEMPLATE
    import json

    op.execute(
        sa.text(
            """
            INSERT INTO tvc_acceptance_templates
                (id, customer_code, name, aspect_ratio, duration_sec, criteria, is_active, created_at, updated_at)
            SELECT :id, :code, :name, :ar, :dur, CAST(:criteria AS jsonb), true, NOW(), NOW()
            WHERE NOT EXISTS (SELECT 1 FROM tvc_acceptance_templates WHERE customer_code = :code)
            """
        ).bindparams(
            id=str(uuid.uuid4()),
            code=DEFAULT_KFC_TEMPLATE["customer_code"],
            name=DEFAULT_KFC_TEMPLATE["name"],
            ar=DEFAULT_KFC_TEMPLATE["aspect_ratio"],
            dur=DEFAULT_KFC_TEMPLATE["duration_sec"],
            criteria=json.dumps(DEFAULT_KFC_TEMPLATE["criteria"], ensure_ascii=False),
        )
    )

    # 种子验收审查计费规则（每次任务 5 分；admin 后台可调）
    op.execute(
        sa.text(
            """
            INSERT INTO billing_rules (name, model_type, points_per_unit, unit, is_active)
            SELECT 'TVC验收审查（双闸）', 'acceptance_review', 5, 'per_call', 1
            WHERE NOT EXISTS (SELECT 1 FROM billing_rules WHERE model_type = 'acceptance_review')
            """
        )
    )


def downgrade():
    op.execute(sa.text("DELETE FROM billing_rules WHERE model_type = 'acceptance_review'"))
    op.drop_index("ix_tvc_acc_reports_task_gate", table_name="tvc_acceptance_reports")
    op.drop_table("tvc_acceptance_reports")
    op.drop_table("tvc_acceptance_templates")
