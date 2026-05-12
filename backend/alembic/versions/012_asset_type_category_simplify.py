"""asset type/category simplify: 6 categories

- storyboard_shot → storyboard_image (default, most are images)
- category: character/scene/general/prop/effect/background/reference → image
- category: storyboard → storyboard_image
- category: music → audio
- category: script → text
"""
from alembic import op
import sqlalchemy as sa

revision = '012_asset_type_category_simplify'
down_revision = '011_apikey_health_fields'
branch_labels = None
depends_on = None


def upgrade():
    # 1. type: storyboard_shot → storyboard_image
    op.execute("UPDATE assets SET type = 'storyboard_image' WHERE type = 'storyboard_shot'")
    # 2. category: old values → new 6 categories
    op.execute("""
        UPDATE assets SET category = CASE
            WHEN category IN ('character', 'scene', 'general', 'prop', 'effect', 'background', 'reference') THEN 'image'
            WHEN category = 'storyboard' THEN 'storyboard_image'
            WHEN category IN ('music') THEN 'audio'
            WHEN category IN ('script') THEN 'text'
            ELSE category
        END
        WHERE category IS NOT NULL
    """)
    # 3. Fix type/category mismatch: video assets with storyboard category
    op.execute("UPDATE assets SET type = 'storyboard_video', category = 'storyboard_video' WHERE category = 'storyboard_image' AND type = 'video'")


def downgrade():
    # Revert storyboard_image → storyboard_shot
    op.execute("UPDATE assets SET type = 'storyboard_shot' WHERE type IN ('storyboard_image', 'storyboard_video')")
    op.execute("UPDATE assets SET category = 'storyboard' WHERE category IN ('storyboard_image', 'storyboard_video')")
