"""
提示词限制词库初始化脚本
基于 GPT-Image-2 / DALL-E / OpenAI 图像生成内容政策

参考政策:
1. OpenAI 使用政策: https://openai.com/policies/usage-policies
2. DALL-E 内容规定
3. 速创API实际返回的错误信息
"""

CATEGORIES = [
    {
        "name": "年龄相关",
        "description": "涉及未成年人年龄的描述",
        "words": [
            {"word": "14岁", "alternative": "少女", "severity": 3},
            {"word": "15岁", "alternative": "少女", "severity": 3},
            {"word": "16岁", "alternative": "年轻女子", "severity": 3},
            {"word": "17岁", "alternative": "年轻女子", "severity": 3},
            {"word": "18岁", "alternative": "年轻女子", "severity": 2},
            {"word": "未成年", "alternative": "年轻", "severity": 3},
            {"word": "儿童", "alternative": "人物", "severity": 3},
            {"word": "小孩", "alternative": "人物", "severity": 3},
            {"word": "孩子", "alternative": "人物", "severity": 3},
            {"word": "幼儿", "alternative": "人物", "severity": 3},
            {"word": "婴儿", "alternative": "人物", "severity": 3},
            {"word": "teenager", "alternative": "young adult", "severity": 3},
            {"word": "teen", "alternative": "young person", "severity": 3},
            {"word": "child", "alternative": "person", "severity": 3},
            {"word": "children", "alternative": "people", "severity": 3},
            {"word": "kid", "alternative": "person", "severity": 3},
            {"word": "baby", "alternative": "person", "severity": 3},
            {"word": "infant", "alternative": "person", "severity": 3},
            {"word": "minor", "alternative": "young person", "severity": 3},
            {"word": "underage", "alternative": "young", "severity": 3},
            {"word": "young girl", "alternative": "woman", "severity": 2},
            {"word": "young boy", "alternative": "man", "severity": 2},
            {"word": "little girl", "alternative": "woman", "severity": 3},
            {"word": "little boy", "alternative": "man", "severity": 3},
        ]
    },
    {
        "name": "真实人物",
        "description": "真实人物肖像和隐私相关内容",
        "words": [
            {"word": "名人", "alternative": "人物", "severity": 2},
            {"word": "明星", "alternative": "人物", "severity": 2},
            {"word": "总统", "alternative": "政治人物", "severity": 2},
            {"word": " politician", "alternative": "person", "severity": 2},
            {"word": "celebrity", "alternative": "person", "severity": 2},
            {"word": "star", "alternative": "person", "severity": 1},
            {"word": "真实脸", "alternative": "艺术风格", "severity": 2},
            {"word": "real face", "alternative": "artistic style", "severity": 2},
            {"word": "real person", "alternative": "fictional character", "severity": 2},
        ]
    },
    {
        "name": "色情相关内容",
        "description": "成人内容和性感描写",
        "words": [
            {"word": "nude", "alternative": "dressed", "severity": 3},
            {"word": "naked", "alternative": "clothed", "severity": 3},
            {"word": "explicit", "alternative": "appropriate", "severity": 3},
            {"word": "NSFW", "alternative": "SFW", "severity": 3},
            {"word": "成人", "alternative": "普通", "severity": 3},
            {"word": "色情", "alternative": "艺术", "severity": 3},
            {"word": "露骨", "alternative": "含蓄", "severity": 3},
            {"word": "sexy", "alternative": "elegant", "severity": 2},
            {"word": "露", "alternative": "", "severity": 1},
        ]
    },
    {
        "name": "暴力血腥",
        "description": "暴力、伤害和血腥内容",
        "words": [
            {"word": "blood", "alternative": "", "severity": 2},
            {"word": "gore", "alternative": "", "severity": 3},
            {"word": "暴力", "alternative": "", "severity": 2},
            {"word": "血腥", "alternative": "", "severity": 3},
            {"word": "weapon", "alternative": "", "severity": 2},
            {"word": "gun", "alternative": "", "severity": 2},
            {"word": "knife", "alternative": "", "severity": 1},
            {"word": "sword", "alternative": "", "severity": 1},
            {"word": "gunshot", "alternative": "", "severity": 2},
            {"word": "wound", "alternative": "", "severity": 2},
            {"word": "injury", "alternative": "", "severity": 2},
        ]
    },
    {
        "name": "政治敏感",
        "description": "政治人物和敏感政治内容",
        "words": [
            {"word": "国家领导人", "alternative": "政治人物", "severity": 3},
            {"word": "主席", "alternative": "人物", "severity": 2},
            {"word": "总理", "alternative": "人物", "severity": 2},
            {"word": "总统", "alternative": "政治人物", "severity": 3},
            {"word": "习近平", "alternative": "人物", "severity": 3},
            {"word": "毛泽东", "alternative": "历史人物", "severity": 2},
            {"word": "政治宣传", "alternative": "", "severity": 3},
            {"word": "propaganda", "alternative": "", "severity": 3},
        ]
    },
    {
        "name": "歧视偏见",
        "description": "种族、性别、宗教歧视内容",
        "words": [
            {"word": "歧视", "alternative": "", "severity": 3},
            {"word": "racist", "alternative": "", "severity": 3},
            {"word": "sexist", "alternative": "", "severity": 3},
            {"word": "homophobic", "alternative": "", "severity": 3},
            {"word": "伊斯兰", "alternative": "", "severity": 2},
            {"word": "基督教", "alternative": "", "severity": 1},
            {"word": "佛教", "alternative": "", "severity": 1},
        ]
    },
    {
        "name": "医疗健康",
        "description": "医疗、疾病相关限制内容",
        "words": [
            {"word": "disease", "alternative": "", "severity": 1},
            {"word": "illness", "alternative": "", "severity": 1},
            {"word": "virus", "alternative": "", "severity": 2},
            {"word": "covid", "alternative": "", "severity": 2},
            {"word": "医院", "alternative": "建筑", "severity": 1},
            {"word": "手术", "alternative": "", "severity": 2},
            {"word": "doctor", "alternative": "person", "severity": 1},
        ]
    },
    {
        "name": "危险行为",
        "description": "可能导致危险行为的内容",
        "words": [
            {"word": "drug", "alternative": "", "severity": 3},
            {"word": "毒品", "alternative": "", "severity": 3},
            {"word": "吸毒", "alternative": "", "severity": 3},
            {"word": "酒精", "alternative": "", "severity": 2},
            {"word": "alcohol", "alternative": "", "severity": 2},
            {"word": "自杀", "alternative": "", "severity": 3},
            {"word": "suicide", "alternative": "", "severity": 3},
            {"word": "自残", "alternative": "", "severity": 3},
        ]
    },
]


async def seed_restrictions(db):
    """填充限制词库"""
    from app.models.prompt_restrictions import PromptRestrictionCategory, PromptRestrictionWord

    for cat_data in CATEGORIES:
        # Check if category exists
        result = await db.execute(
            select(PromptRestrictionCategory).where(
                PromptRestrictionCategory.name == cat_data["name"]
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            category = existing
            print(f"Category '{cat_data['name']}' already exists, skipping...")
        else:
            category = PromptRestrictionCategory(
                name=cat_data["name"],
                description=cat_data.get("description", ""),
                is_active=1
            )
            db.add(category)
            await db.commit()
            await db.refresh(category)
            print(f"Created category: {cat_data['name']}")

        # Add words for this category
        for word_data in cat_data.get("words", []):
            result = await db.execute(
                select(PromptRestrictionWord).where(
                    PromptRestrictionWord.word == word_data["word"]
                )
            )
            existing_word = result.scalar_one_or_none()

            if existing_word:
                print(f"  Word '{word_data['word']}' already exists, skipping...")
                continue

            word = PromptRestrictionWord(
                category_id=category.id,
                word=word_data["word"],
                alternative=word_data.get("alternative", ""),
                severity=word_data.get("severity", 1),
                is_active=1
            )
            db.add(word)
            print(f"  Added word: {word_data['word']}")

        await db.commit()

    print("\n✅ 限制词库初始化完成!")


if __name__ == "__main__":
    import asyncio
    from app.database import async_session

    async def main():
        async with async_session() as db:
            await seed_restrictions(db)

    asyncio.run(main())
