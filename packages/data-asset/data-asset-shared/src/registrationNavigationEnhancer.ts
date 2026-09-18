import * as fs from 'fs'
import * as path from 'path'
import type {
  OrchestrationResult,
  PolicyStage,

  AgencyMatchResult,
  RegistrationConfig,
} from './types.js'
import { PolicyReferenceResolver } from './policyReferenceResolver.js'
import { defaultRegistrationConfig } from './defaultBusinessRules.js'

const PLUGIN_STAGE_MAP: Record<string, PolicyStage> = {
  'data-inventory': 'INVENTORY',
  'data-cleaning': 'CLEANING',
  'data-masking': 'MASKING',
  'data-packaging': 'PACKAGING',
}

const NAVIGATION_TEXTS: Record<string, string> = {
  'data-inventory':
    '本数据集已完成盘点，建议下一步申请数据产权登记。登记机构推荐：{agency}',
  'data-cleaning':
    '数据质量已达到登记要求（依据《数据资产评估指导意见》六维质量评价标准）。',
  'data-masking':
    "脱敏后数据已符合登记审查中的'来源合规性'要求（依据《数据产权登记工作指引》第三章）。",
  'data-packaging':
    "本产品说明书可直接用于登记申请材料中的'数据描述'部分。",
}

export class RegistrationNavigationEnhancer {
  private config: RegistrationConfig
  private configPath: string

  constructor(configPath?: string) {
    this.configPath = configPath
      ? path.resolve(configPath)
      : path.resolve(process.cwd(), 'config', 'registration-agencies.json')
    this.config = this.loadConfig()
  }

  private loadConfig(): RegistrationConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8')
        return JSON.parse(raw) as RegistrationConfig
      }
    } catch {
      console.warn('[RegistrationNavigationEnhancer] 配置加载失败，使用默认值')
    }
    return defaultRegistrationConfig
  }

  private matchAgency(dataType: string): string {
    const agencyId = this.config.dataTypeMapping[dataType]
    if (agencyId) {
      const agency = this.config.agencies.find(a => a.id === agencyId)
      if (agency) return agency.name
    }
    return this.config.defaultRecommendation.message
  }

  enhance(report: string, pluginName: string, dataType: string): string {
    const stage = PLUGIN_STAGE_MAP[pluginName]
    if (!stage) return report

    const resolver = PolicyReferenceResolver.getInstance()
    const policyDocs = resolver.resolve(stage)

    let navText = NAVIGATION_TEXTS[pluginName] || ''
    if (pluginName === 'data-inventory') {
      const agencyName = this.matchAgency(dataType)
      navText = navText.replace('{agency}', agencyName)
    }

    const policyText = policyDocs
      .map(d => `- 《${d.name}》（${d.docNumber}）：${d.coreRequirement}`)
      .join('\n')

    const enhancedReport = `${report}

---

## 登记导航

${navText}

## 政策依据

${policyText}
`

    return enhancedReport
  }

  enhanceAll(orchestrationResult: OrchestrationResult, dataType: string): OrchestrationResult {
    return {
      ...orchestrationResult,
      maskingReport: this.enhance(orchestrationResult.maskingReport, 'data-masking', dataType),
      cleaningReport: this.enhance(orchestrationResult.cleaningReport, 'data-cleaning', dataType),
      inventoryReport: this.enhance(orchestrationResult.inventoryReport, 'data-inventory', dataType),
      packagingManual: this.enhance(orchestrationResult.packagingManual, 'data-packaging', dataType),
    }
  }

  matchAgencyResult(dataType: string): AgencyMatchResult {
    const agencyId = this.config.dataTypeMapping[dataType]
    if (agencyId) {
      const agency = this.config.agencies.find(a => a.id === agencyId)
      if (agency) {
        return {
          agency: agency.id,
          agencyName: agency.name,
          basis: agency.basis,
          dataType,
          ruleVersion: this.config.ruleVersion,
        }
      }
    }
    return {
      agency: null,
      agencyName: this.config.defaultRecommendation.message,
      basis: this.config.defaultRecommendation.basis,
      dataType,
      ruleVersion: this.config.ruleVersion,
    }
  }
}