# 任务：生图 prompt 增强 + 配置模板化

## 上下文
- _gen_one_minimax: model=image-01，无 image_description/镜头/风格增强
- _gen_one_gpt_image_2: 极简 prompt+size
- step4_image cfg 缺 prompt_enhance 配置块

## 计划
| # | 任务 |
|---|------|
| 1 | tvc_config.py 加 prompt_enhance 配置 |
| 2 | tvc_providers.py 抽 _enhance_image_prompt + 两 provider 接入 |
| 3 | tvc_engine.py _generate_images_parallel 透传 |
| 4 | 端到端 |

## 验收
- prompt 含 prefix_markers + image_description + suffix_markers
- 同图复现（用 image_description cache）
