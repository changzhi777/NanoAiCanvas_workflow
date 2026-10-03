"""020: 验收闸 KFC 种子模板 criteria 扩容 14→16 项

新增：
- ad_law_compliance（rule_content，veto，正则硬清单——广告法第九条极限词+食品违禁语）
- logo_integrity（llm_visual，veto，KFC Logo/上校头像完整性）

来源：KFC 官方品牌规范（global.kfc.com Brand Assets + Brand Identity Standards PDF）
与中国广告法对照差距分析（2026-10-03，详见 .claude/plan/tvc-five-anchors.md 附三）。

只覆盖 customer_code='kfc' 的官方种子模板（from-brief 生成的用户模板不动）。
"""
from alembic import op
import sqlalchemy as sa
import json


revision = "020_acceptance_adlaw_logo"
down_revision = "019_tvc_acceptance"
branch_labels = None
depends_on = None


def upgrade():
    from app.models.tvc_acceptance import DEFAULT_KFC_TEMPLATE

    op.execute(
        sa.text(
            """
            UPDATE tvc_acceptance_templates
            SET criteria = CAST(:criteria AS jsonb), updated_at = NOW()
            WHERE customer_code = 'kfc'
            """
        ).bindparams(
            criteria=json.dumps(DEFAULT_KFC_TEMPLATE["criteria"], ensure_ascii=False),
        )
    )


def downgrade():
    # 不还原（criteria 为 JSON 文档，旧版可从 git 历史 019 取回）
    pass
