'use client'

import { useCallback, useState } from 'react'
import { Music, Volume2, Play, Pause } from 'lucide-react'
import { NodeProps } from 'reactflow'
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore'
import { BaseNode, ParamEditor, ExecuteButton } from './BaseNode'

export interface BackgroundMusicData extends WorkflowNodeData {
  params: {
    source: 'library' | 'generate'
    libraryId?: string
    mood: 'upbeat' | 'calm' | 'dramatic' | 'romantic' | 'ambient'
    duration: number
    volume: number
    fadeIn: number
    fadeOut: number
  }
  result?: {
    musicUrl: string
    duration: number
  }
}

const MOODS = [
  { label: '轻快', value: 'upbeat' },
  { label: '平静', value: 'calm' },
  { label: '戏剧性', value: 'dramatic' },
  { label: '浪漫', value: 'romantic' },
  { label: '氛围', value: 'ambient' },
]

const MOOD_OPTIONS = MOODS.map(m => ({ label: m.label, value: m.value }))

const SOURCE_OPTIONS = [
  { label: '素材库', value: 'library' },
  { label: 'AI生成', value: 'generate' },
]

export const BackgroundMusicNode = ({ id, data }: NodeProps<BackgroundMusicData>) => {
  const { updateNodeParams, updateNode } = useNanoaiWorkflowStore()
  const [, setIsGenerating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const paramSchema = [
    {
      key: 'source',
      label: '音乐来源',
      type: 'select' as const,
      options: SOURCE_OPTIONS,
      defaultValue: 'library',
    },
    {
      key: 'mood',
      label: '情绪风格',
      type: 'select' as const,
      options: MOOD_OPTIONS,
      defaultValue: 'calm',
    },
    {
      key: 'duration',
      label: '时长（秒）',
      type: 'number' as const,
      defaultValue: 60,
    },
    {
      key: 'volume',
      label: '音量',
      type: 'number' as const,
      defaultValue: 80,
    },
    {
      key: 'fadeIn',
      label: '淡入（秒）',
      type: 'number' as const,
      defaultValue: 2,
    },
    {
      key: 'fadeOut',
      label: '淡出（秒）',
      type: 'number' as const,
      defaultValue: 3,
    },
  ]

  const handleParamsChange = useCallback((params: Record<string, any>) => {
    updateNodeParams(id, params)
  }, [id, updateNodeParams])

  const handleExecute = useCallback(async () => {
    setIsGenerating(true)
    try {
      updateNode(id, { status: NodeStatus.RUNNING, error: undefined })

      for (let i = 0; i <= 100; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 400))
      }

      const musicUrl = `https://example.com/music/${Date.now()}.mp3`
      updateNode(id, {
        status: NodeStatus.SUCCESS,
        result: {
          musicUrl,
          duration: data.params.duration,
        },
      })
    } catch (error) {
      updateNode(id, {
        status: NodeStatus.ERROR,
        error: error instanceof Error ? error.message : '获取音乐失败',
      })
    } finally {
      setIsGenerating(false)
    }
  }, [id, data.params, updateNode])

  const handlePlayToggle = useCallback(() => {
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  return (
    <BaseNode
      data={data}
      icon={<Music className="w-4 h-4" />}
    >
      <ParamEditor params={data.params} onChange={handleParamsChange} schema={paramSchema} />

      {/* 音乐预览 */}
      {data.result?.musicUrl && (
        <div className="flex items-center gap-2 p-2 bg-black/20 rounded mt-3">
          <button
            onClick={handlePlayToggle}
            className="w-8 h-8 flex items-center justify-center bg-primary/20 rounded-full hover:bg-primary/30"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <div className="flex-1">
            <div className="text-xs text-foreground">背景音乐.mp3</div>
            <div className="text-[10px] text-muted-foreground">{data.result.duration}秒</div>
          </div>
          <Volume2 className="w-4 h-4 text-muted-foreground" />
        </div>
      )}

      <ExecuteButton
        onExecute={handleExecute}
        status={data.status}
        label="获取音乐"
        loadingLabel="获取中..."
      />
    </BaseNode>
  )
}

export const backgroundMusicNodeType = 'background-music'

export default BackgroundMusicNode