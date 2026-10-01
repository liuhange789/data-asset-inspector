import { describe, it, expect } from 'vitest'
import { ReproducibilityChecker } from '../src/reproducibility-checker.js'
import { ReproducibilityScorer } from '../src/reproducibility-scorer.js'
import type { AttachmentList } from '../src/types.js'

function makeAttachment(exists: boolean, fileSize: number): { fileName: string; exists: boolean; fileSize: number; nonEmpty: boolean } {
  return { fileName: 'f', exists, fileSize, nonEmpty: fileSize > 0 }
}

describe('ReproducibilityChecker', () => {
  it('无分析代码标记"可复现性缺失：无分析代码"并附带第十一条', () => {
    const list: AttachmentList = {
      analysisCode: makeAttachment(false, 0),
      environmentDeclaration: makeAttachment(true, 100),
      parameterConfig: makeAttachment(true, 100),
    }
    const detail = new ReproducibilityChecker().check(list)
    expect(detail.result.missingItems).toContain('无分析代码')
    expect(detail.result.policyBasis).toContain('第十一条')
  })

  it('有代码无环境声明标记"无环境声明"', () => {
    const list: AttachmentList = {
      analysisCode: makeAttachment(true, 100),
      environmentDeclaration: makeAttachment(false, 0),
      parameterConfig: makeAttachment(true, 100),
    }
    const detail = new ReproducibilityChecker().check(list)
    expect(detail.result.missingItems).toContain('无环境声明')
  })

  it('有代码有环境无参数标记"参数不完整"', () => {
    const list: AttachmentList = {
      analysisCode: makeAttachment(true, 100),
      environmentDeclaration: makeAttachment(true, 100),
      parameterConfig: makeAttachment(false, 0),
    }
    const detail = new ReproducibilityChecker().check(list)
    expect(detail.result.missingItems).toContain('参数不完整')
  })

  it('附件文件存在但大小为0视为缺失', () => {
    const list: AttachmentList = {
      analysisCode: makeAttachment(true, 0),
      environmentDeclaration: makeAttachment(true, 100),
      parameterConfig: makeAttachment(true, 100),
    }
    const detail = new ReproducibilityChecker().check(list)
    expect(detail.hasCode).toBe(false)
    expect(detail.result.missingItems.some((m) => m.includes('代码文件为空'))).toBe(true)
  })

  it('存储系统不可用跳过检测评分N/A', () => {
    const detail = new ReproducibilityChecker().check(null)
    expect(detail.storageUnavailable).toBe(true)
    expect(detail.result.skipped).toBe(true)
    expect(detail.result.reproducibilityScore).toBeNull()
    expect(detail.result.missingItems).toContain('检测跳过：存储系统不可用')
  })

  it('三项齐全评分100.00', () => {
    const list: AttachmentList = {
      analysisCode: makeAttachment(true, 100),
      environmentDeclaration: makeAttachment(true, 100),
      parameterConfig: makeAttachment(true, 100),
    }
    const detail = new ReproducibilityChecker().check(list)
    expect(detail.result.reproducibilityScore).toBe(100)
  })

  it('缺失一项评分66.67', () => {
    const list: AttachmentList = {
      analysisCode: makeAttachment(true, 100),
      environmentDeclaration: makeAttachment(true, 100),
      parameterConfig: makeAttachment(false, 0),
    }
    const detail = new ReproducibilityChecker().check(list)
    expect(detail.result.reproducibilityScore).toBe(66.67)
  })

  it('缺失两项评分33.33', () => {
    const list: AttachmentList = {
      analysisCode: makeAttachment(true, 100),
      environmentDeclaration: makeAttachment(false, 0),
      parameterConfig: makeAttachment(false, 0),
    }
    const detail = new ReproducibilityChecker().check(list)
    expect(detail.result.reproducibilityScore).toBe(33.33)
  })

  it('全部缺失评分0.00', () => {
    const list: AttachmentList = {
      analysisCode: makeAttachment(false, 0),
      environmentDeclaration: makeAttachment(false, 0),
      parameterConfig: makeAttachment(false, 0),
    }
    const detail = new ReproducibilityChecker().check(list)
    expect(detail.result.reproducibilityScore).toBe(0)
  })
})

describe('ReproducibilityScorer', () => {
  const scorer = new ReproducibilityScorer()
  it('评分计算', () => {
    expect(scorer.score(true, true, true)).toBe(100)
    expect(scorer.score(true, true, false)).toBe(66.67)
    expect(scorer.score(true, false, false)).toBe(33.33)
    expect(scorer.score(false, false, false)).toBe(0)
  })
})