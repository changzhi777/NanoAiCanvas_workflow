"""018: 对齐 TVC 视频全局配置默认到 minimax-official

P0 hotfix：阶段 2.1 任务。

背景：
- 生产 tvc-config step5_video.default_provider 已切到 minimax-official（手动 API）
- 后端 SubmitRequest video_model 默认改 None（让配置链生效）
- 但 tvc_engine.py:163 仍有 "MiniMax-H3" 硬编码兜底——硬编码已修
- 本迁移：把已存 tvc_workflow_configs 的 step5_video.default_provider 统一对齐到 minimax-official
- 不动 value != 'minimax-official' 的（说明用户显式选了其他——尊重用户选择）

downgrade 策略：保守，不还原（只升不降——若需回滚手动改）
"""
from alembic import op
import sqlalchemy as sa


revision = "018_tvc_video_default_align"
down_revision = "017_tvc_one_shot"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    # 仅修改 default_provider 不是 minimax-official 的记录（包括 null/旧值）
    op.execute(
        sa.text("""
            UPDATE tvc_workflow_configs
            SET step5_video = jsonb_set(
                step5_video,
                '{default_provider}',
                '"minimax-official"',
                true
            ),
            updated_at = NOW()
            WHERE step5_video IS NOT NULL
              AND step5_video->>'default_provider' IS DISTINCT FROM 'minimax-official'
        """)
    )


def downgrade():
    # 不还原（保守策略——后续手动处理）
    pass
