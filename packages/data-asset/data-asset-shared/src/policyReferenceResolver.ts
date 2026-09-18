import * as fs from 'fs'
import * as path from 'path'
import type { PolicyReference, PolicyStage, PolicyDocument } from './types.js'
import { defaultPolicyReferences } from './defaultBusinessRules.js'

export class PolicyReferenceResolver {
  private static instance: PolicyReferenceResolver | null = null
  private cache: Map<PolicyStage, PolicyDocument[]> = new Map()
  private references: PolicyReference[] = []
  private configPath: string

  private constructor(configPath?: string) {
    this.configPath = configPath
      ? path.resolve(configPath)
      : path.resolve(process.cwd(), 'config', 'policy-references.json')
    this.load()
  }

  static getInstance(configPath?: string): PolicyReferenceResolver {
    if (!PolicyReferenceResolver.instance) {
      PolicyReferenceResolver.instance = new PolicyReferenceResolver(configPath)
    }
    return PolicyReferenceResolver.instance
  }

  private load(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8')
        const parsed = JSON.parse(raw)
        if (parsed.policyReferences && Array.isArray(parsed.policyReferences)) {
          this.references = parsed.policyReferences
          return
        }
      }
    } catch {
      console.warn('[PolicyReferenceResolver] 配置加载失败，使用默认值')
    }
    this.references = defaultPolicyReferences
  }

  resolve(stage: PolicyStage): PolicyDocument[] {
    if (this.cache.has(stage)) {
      return this.cache.get(stage)!
    }

    const ref = this.references.find(r => r.stage === stage)
    let documents: PolicyDocument[]

    if (ref && ref.documents && ref.documents.length > 0) {
      documents = ref.documents
    } else {
      console.warn(`[PolicyReferenceResolver] 环节 ${stage} 未配置政策依据，使用占位项`)
      documents = [
        {
          name: '依据文件待补充',
          docNumber: '待配置',
          coreRequirement: '请补充对应政策依据',
        },
      ]
    }

    this.cache.set(stage, documents)
    return documents
  }

  clearCache(): void {
    this.cache.clear()
    PolicyReferenceResolver.instance = null
  }
}