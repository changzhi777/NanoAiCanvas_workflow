"""
Skills CLI - 命令行触发 Skills 任务

Usage:
    # 列出所有模板
    python -m app.cli.skills list-templates [--skill gpt_image_2]

    # 生成图片（同步执行，不入队）
    python -m app.cli.skills generate --template <template_id> --form '{"field": "value"}' [--size 1024x1024]

    # 查询任务状态
    python -m app.cli.skills task-status <task_id>

    # 查看队列状态
    python -m app.cli.skills queue-status
"""

import argparse
import asyncio
import json
import sys


def main():
    parser = argparse.ArgumentParser(
        prog="skills",
        description="NanoAI Skills CLI - 命令行触发图片生成任务",
    )
    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    # list-templates
    tpl_parser = subparsers.add_parser("list-templates", help="列出所有模板")
    tpl_parser.add_argument("--skill", default="gpt_image_2", help="Skill ID")
    tpl_parser.add_argument("--json", action="store_true", help="JSON 格式输出")

    # generate
    gen_parser = subparsers.add_parser("generate", help="生成图片")
    gen_parser.add_argument("--template", required=True, help="模板 ID")
    gen_parser.add_argument("--form", required=True, help="表单数据 JSON")
    gen_parser.add_argument("--skill", default="gpt_image_2", help="Skill ID")
    gen_parser.add_argument("--size", default="1024x1024", help="图片尺寸")
    gen_parser.add_argument("--quality", default="standard", help="图片质量")
    gen_parser.add_argument("--json", action="store_true", help="JSON 格式输出")
    gen_parser.add_argument("--watch", action="store_true", help="实时显示步骤进度")

    # task-status
    status_parser = subparsers.add_parser("task-status", help="查询任务状态")
    status_parser.add_argument("task_id", help="任务 ID")
    status_parser.add_argument("--json", action="store_true", help="JSON 格式输出")

    # queue-status
    subparsers.add_parser("queue-status", help="查看队列状态")

    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        sys.exit(1)

    if args.command == "list-templates":
        asyncio.run(_list_templates(args))
    elif args.command == "generate":
        asyncio.run(_generate(args))
    elif args.command == "task-status":
        asyncio.run(_task_status(args))
    elif args.command == "queue-status":
        asyncio.run(_queue_status(args))


async def _list_templates(args):
    """列出所有模板"""
    from app.services.skills import get_skills_loader

    loader = get_skills_loader()
    templates = loader.get_templates(args.skill)

    if not templates:
        print(f"No templates found for skill '{args.skill}'")
        return

    if args.json:
        print(json.dumps(templates.model_dump(), indent=2, ensure_ascii=False))
        return

    for category in templates.categories:
        print(f"\n📁 {category.name} ({category.id})")
        print(f"   {category.description}")
        for tpl in category.templates:
            print(f"   ├── {tpl.name} ({tpl.id})")
            print(f"   │   {tpl.description}")


async def _generate(args):
    """生成图片（同步执行，不入队）"""
    import time
    from app.services.skills import get_skills_loader
    from app.services.skills.gpt_image_2 import PromptBuilder
    from app.services.skills_worker import SkillsWorker

    # 解析表单数据
    try:
        form_data = json.loads(args.form)
    except json.JSONDecodeError as e:
        print(f"Invalid JSON for --form: {e}")
        sys.exit(1)

    # 创建 Worker（不入队，直接同步执行）
    worker = SkillsWorker(skill_id=args.skill)
    worker._running = True  # 标记运行中

    task_data = {
        "task_id": f"cli-{int(time.time())}",
        "template_id": args.template,
        "form_data": form_data,
        "skill_id": args.skill,
        "size": args.size,
        "quality": args.quality,
    }

    if args.watch:
        # 带进度显示模式
        print(f"🚀 开始生成 (template={args.template})")

        steps = ["validating", "prompt_building", "api_submitting", "generating", "completed"]
        step_labels = {
            "validating": "参数校验",
            "prompt_building": "构建提示词",
            "api_submitting": "提交 API",
            "generating": "AI 生成中",
            "completed": "完成",
        }

        # 覆盖 _publish_step 打印进度
        async def print_step(task_id, step, progress, message):
            label = step_labels.get(step, step)
            bar_len = 30
            filled = int(bar_len * progress / 100)
            bar = "█" * filled + "░" * (bar_len - filled)
            print(f"\r  [{bar}] {progress:3d}% | {label} - {message}", end="", flush=True)
            if step in ("completed", "failed"):
                print()  # 换行

        worker._publish_step = print_step

        try:
            await worker._process_task(task_data)
        except Exception as e:
            print(f"\n❌ 生成失败: {e}")
            sys.exit(1)
    else:
        # 静默模式
        try:
            await worker._process_task(task_data)
        except Exception as e:
            if args.json:
                print(json.dumps({"status": "failed", "error": str(e)}, ensure_ascii=False))
            else:
                print(f"❌ 生成失败: {e}")
            sys.exit(1)

    # 获取结果
    if worker._queue:
        task_info = await worker._queue.get_task(task_data["task_id"])
        if task_info:
            if args.json:
                print(json.dumps(task_info, indent=2, ensure_ascii=False))
            else:
                result = task_info.get("result", {})
                images = result.get("images", [])
                if images:
                    print(f"\n✅ 生成完成！共 {len(images)} 张图片：")
                    for i, img in enumerate(images):
                        url = img.get("url", img) if isinstance(img, dict) else img
                        print(f"  [{i + 1}] {url}")


async def _task_status(args):
    """查询任务状态"""
    from app.services.task_queue import TaskQueueManager

    queue_mgr = TaskQueueManager()
    for skill_id in ["gpt_image_2"]:
        queue = await queue_mgr.get_queue(skill_id)
        task = await queue.get_task(args.task_id)
        if task:
            if args.json:
                print(json.dumps(task, indent=2, ensure_ascii=False))
            else:
                status = task.get("status", "unknown")
                progress = task.get("progress", 0)
                step = task.get("current_step", "")
                print(f"Task ID:    {task.get('task_id')}")
                print(f"Status:     {status}")
                print(f"Progress:   {progress}%")
                print(f"Step:       {step}")
                if task.get("error"):
                    print(f"Error:      {task['error']}")
                if task.get("result"):
                    images = task["result"].get("images", [])
                    if images:
                        print(f"Images:     {len(images)} 张")
                        for img in images:
                            url = img.get("url", img) if isinstance(img, dict) else img
                            print(f"  → {url}")
            return

    print(f"Task '{args.task_id}' not found")
    sys.exit(1)


async def _queue_status(args):
    """查看队列状态"""
    from app.services.task_queue import TaskQueueManager

    queue_mgr = TaskQueueManager()
    infos = await queue_mgr.get_all_queue_info()

    if not infos:
        print("No active queues")
        return

    for info in infos:
        print(f"Queue: {info['queue_name']} | Length: {info['length']}")


if __name__ == "__main__":
    main()
