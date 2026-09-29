import { describe, expect, it } from 'vitest'
import { getModelDurationOptions, MODEL_DURATION_LIMITS, resolveModelId } from './tvc-cascade'

describe('MODEL_DURATION_LIMITS（阶段 3.2 修复回归）', () => {
  it('minimax-official 档位为 [6, 10]（官方 Hailuo-02 仅支持）', () => {
    expect(MODEL_DURATION_LIMITS['minimax-official']).toEqual([6, 10])
  })

  it('已废弃模型不再出现在级联表', () => {
    expect(MODEL_DURATION_LIMITS['cogvideox-3']).toBeUndefined()
    expect(MODEL_DURATION_LIMITS['hailuo-2.3-768P']).toBeUndefined()
  })
})

describe('resolveModelId 别名映射', () => {
  it('glm 不再指向已废弃的 cogvideox-3，改走官方 MiniMax', () => {
    expect(resolveModelId('glm')).toBe('minimax-official')
  })

  it('minimax 短 ID 映射到速创 H3', () => {
    expect(resolveModelId('minimax')).toBe('MiniMax-H3')
    expect(resolveModelId('minimax-h3')).toBe('MiniMax-H3')
  })

  it('minimax-official 直通', () => {
    expect(resolveModelId('minimax-official')).toBe('minimax-official')
  })
})

describe('getModelDurationOptions（属性面板总时长选项）', () => {
  it('minimax-official 按 10s 上限生成选项（修复前兜底 [5] 导致全错）', () => {
    const options = getModelDurationOptions('minimax-official')
    expect(options.length).toBeGreaterThan(0)
    // 所有选项都应是 maxShotDur=10 的整数倍
    for (const opt of options) {
      expect(opt % 10).toBe(0)
    }
  })

  it('未知模型兜底 [5] 不炸', () => {
    const options = getModelDurationOptions('unknown-xyz')
    expect(options.length).toBeGreaterThan(0)
  })
})
