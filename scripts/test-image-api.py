#!/usr/bin/env python3
"""
测试前端文生图 API 调用链路
验证 /api/wuyinkeji/* 路由是否正常工作
"""
import requests
import time

API_BASE = "https://nanoai.fun"
API_KEY = "BQQPSV2KBlJsUSfoBGByekjs2s"

def test_submit_task():
    """测试提交任务"""
    url = f"{API_BASE}/api/wuyinkeji/async/image_nanoBanana2"
    data = {
        "key": API_KEY,
        "prompt": "a cute cat, anime style",
        "size": "1K"
    }
    response = requests.post(url, data=data, timeout=10)
    print(f"1. 提交任务: {response.status_code}")
    result = response.json()
    print(f"   响应: {result}")
    return result.get("data", {}).get("id")

def test_query_task(task_id):
    """测试查询任务状态"""
    url = f"{API_BASE}/api/wuyinkeji/async/detail?key={API_KEY}&id={task_id}"
    response = requests.get(url, timeout=10)
    print(f"2. 查询任务 {task_id}: {response.status_code}")
    result = response.json()
    print(f"   响应: {result}")
    return result.get("data", {})

def test_poll_task(task_id, max_attempts=10):
    """轮询等待任务完成"""
    for i in range(max_attempts):
        data = test_query_task(task_id)
        if data:
            status = data.get("status")
            print(f"   轮询 {i+1}/{max_attempts}: status={status}")
            if status == 1:  # 成功
                return data
            if status == 2:  # 失败
                print(f"   任务失败: {data.get('message')}")
                return data
        time.sleep(2)
    return None

if __name__ == "__main__":
    print("="*50)
    print("测试前端文生图 API 调用链路")
    print("="*50)

    # 1. 提交任务
    task_id = test_submit_task()
    if not task_id:
        print("❌ 提交任务失败")
        exit(1)

    print(f"\n✅ 任务提交成功: {task_id}")
    print("\n开始轮询...\n")

    # 2. 轮询等待结果
    result = test_poll_task(task_id, max_attempts=15)
    if result:
        print(f"\n✅ 最终结果:")
        print(f"   status: {result.get('status')}")
        print(f"   result: {result.get('result')}")
        print(f"   message: {result.get('message')}")
