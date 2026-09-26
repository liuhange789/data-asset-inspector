import { describe, it, expect } from 'vitest'
import { PACKAGES, EXPECTED_TOOL_NAMES, TRIGGERS, POLICY_REFERENCE_LIST, CHAIN_CHECKPOINT_FIELDS } from '../config.js'
import { matchFixSuggestion } from '../policyKnowledgeBase.js'

describe('e2e-acceptance config', () => {
  it('PACKAGES 包含7个包且顺序正确', () => {
    expect(PACKAGES).toHaveLength(7)
    expect(PACKAGES[0]!.name).toBe('@liuhange/dsh-data-asset-shared')
    expect(PACKAGES[6]!.name).toBe('@liuhange/dsh-data-asset-orchestration')
    for (let i = 0; i < PACKAGES.length; i++) {
      expect(PACKAGES[i]!.installOrder).toBe(i + 1)
    }
  })

  it('EXPECTED_TOOL_NAMES 包含5个工具名且使用assess_circulation', () => {
    expect(EXPECTED_TOOL_NAMES).toHaveLength(5)
    expect(EXPECTED_TOOL_NAMES).toContain('assess_circulation')
    expect(EXPECTED_TOOL_NAMES).not.toContain('assess_data_circulation')
  })

  it('TRIGGERS 包含5条触发词', () => {
    expect(TRIGGERS).toHaveLength(5)
    expect(TRIGGERS).toContain('数据鉴证')
    expect(TRIGGERS).toContain('城市数据分类')
  })

  it('POLICY_REFERENCE_LIST 包含9条政策依据', () => {
    expect(POLICY_REFERENCE_LIST).toHaveLength(9)
    for (const item of POLICY_REFERENCE_LIST) {
      expect(item.fullName).toBeTruthy()
      expect(item.docNumber).toBeTruthy()
      expect(item.coreRequirement).toBeTruthy()
    }
  })

  it('CHAIN_CHECKPOINT_FIELDS 每条链路有检查点字段', () => {
    for (const trigger of TRIGGERS) {
      const fields = CHAIN_CHECKPOINT_FIELDS[trigger]
      expect(fields.length).toBeGreaterThan(0)
      expect(fields).toContain('policyBasis')
    }
  })
})

describe('policyKnowledgeBase', () => {
  it('对已知错误可匹配修复建议', () => {
    const result = matchFixSuggestion('PACKAGE_INSTALL_FAILED: some package')
    expect(result).not.toBeNull()
    expect(result!.fixSuggestion).toBeTruthy()
  })

  it('对未知错误返回null', () => {
    const result = matchFixSuggestion('completely unknown error xyz123')
    expect(result).toBeNull()
  })
})