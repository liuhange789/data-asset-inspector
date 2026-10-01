import { describe, it, expect } from 'vitest'
import { RemediationSuggestionGenerator } from '../src/remediation-suggestion-generator.js'
import { defaultRemediationSuggestionConfig } from '../src/default-quality-dimension-config.js'
import { REMEDIATION_SUGGESTION_FALLBACK } from '../src/invariant.js'

describe('RemediationSuggestionGenerator', () => {
  it('按缺失项类型索引整改建议', () => {
    const gen = new RemediationSuggestionGenerator()
    const suggestions = gen.generate(['无分析代码', '参数不完整'], defaultRemediationSuggestionConfig)
    expect(suggestions).toHaveLength(2)
    expect(suggestions[0]!.missingItemType).toBe('无分析代码')
    expect(suggestions[0]!.suggestion).toContain('分析代码')
    expect(suggestions[0]!.policyBasis).toContain('第十一条')
    expect(suggestions[1]!.missingItemType).toBe('参数不完整')
  })

  it('配置中无对应建议显示通用提示', () => {
    const gen = new RemediationSuggestionGenerator()
    const suggestions = gen.generate(['未知缺失项类型'], defaultRemediationSuggestionConfig)
    expect(suggestions[0]!.suggestion).toBe(REMEDIATION_SUGGESTION_FALLBACK)
  })

  it('配置为null时全部使用通用提示', () => {
    const gen = new RemediationSuggestionGenerator()
    const suggestions = gen.generate(['无分析代码'], null)
    expect(suggestions[0]!.suggestion).toBe(REMEDIATION_SUGGESTION_FALLBACK)
  })

  it('空缺失项返回空数组', () => {
    const gen = new RemediationSuggestionGenerator()
    expect(gen.generate([], defaultRemediationSuggestionConfig)).toHaveLength(0)
    expect(gen.generate(null as unknown as string[], defaultRemediationSuggestionConfig)).toHaveLength(0)
  })

  it('重复缺失项去重', () => {
    const gen = new RemediationSuggestionGenerator()
    const suggestions = gen.generate(['无分析代码', '无分析代码'], defaultRemediationSuggestionConfig)
    expect(suggestions).toHaveLength(1)
  })

  it('前缀匹配回退', () => {
    const gen = new RemediationSuggestionGenerator()
    const suggestions = gen.generate(['血缘缺失：采集方法'], defaultRemediationSuggestionConfig)
    expect(suggestions[0]!.suggestion).toContain('采集方法')
  })
})