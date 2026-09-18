import { ScanExecutor, type ScanExecutorConfig } from './scanExecutor.js'
import { validateScanArgs } from './invariant.js'
import { loadJsonConfig } from '@liuhange/dsh-data-asset-shared'


export const name = '@liuhange/dsh-data-asset-inventory-scan'
export const inject = ['tools'] as const

export function apply(ctx: { tools: { register: (tool: unknown) => void } }) {
  ctx.tools.register({
    name: 'scan_data_assets',
    description: '数据资产深度扫描：全量元数据扫描+资产三条件初筛+权属线索标注+政策依据输出',
    parameters: {
      type: 'object',
      properties: {
        scanSource: { type: 'string', description: '目录路径或数据库连接配置JSON' },
        sourceType: { type: 'string', enum: ['directory', 'database'], description: '扫描源类型' },
        outputPathDir: { type: 'string', description: '报告输出目录（可选）' },
      },
      required: ['scanSource', 'sourceType'],
    },
    async execute(args: Record<string, unknown>) {
      try {
        const validated = validateScanArgs(args)

        let rulesConfig: Record<string, unknown>
        try {
          rulesConfig = loadJsonConfig('BUSINESS_RULES_PATH', 'config/business-rules.json', '@liuhange/dsh-data-asset-shared/config/business-rules.json')
        } catch {
          return JSON.stringify({ error: 'SCAN_RULES_MISSING', message: '无法加载business-rules.json' })
        }

        const inventoryConfig = rulesConfig.inventoryScan as Record<string, unknown>
        if (!inventoryConfig) {
          return JSON.stringify({ error: 'SCAN_RULES_MISSING', message: 'inventoryScan配置段缺失' })
        }

        let policyDocuments: { name: string; docNumber: string; coreRequirement: string }[]
        try {
          const policyConfig = loadJsonConfig('POLICY_REFS_PATH', 'config/policy-references.json', '@liuhange/dsh-data-asset-shared/config/policy-references.json')
          const refs = policyConfig.policyReferences as { stage: string; documents: { name: string; docNumber: string; coreRequirement: string }[] }[] | undefined
          const stage = refs?.find(s => s.stage === 'INVENTORY_SCAN')
          policyDocuments = stage?.documents ?? []
        } catch {
          policyDocuments = []
        }

        if (!policyDocuments || policyDocuments.length === 0) {
          return JSON.stringify({ error: 'POLICY_REFERENCES_EMPTY', message: 'INVENTORY_SCAN阶段政策依据缺失' })
        }

        const executorConfig: ScanExecutorConfig = {
          tripleCondition: inventoryConfig.assetTripleCondition as ScanExecutorConfig['tripleCondition'],
          ownershipClueRules: inventoryConfig.ownershipClueRules as ScanExecutorConfig['ownershipClueRules'],
          scanScaleLimit: (inventoryConfig.scanScaleLimit as number) ?? 10000,
          policyDocuments,
        }

        const executor = new ScanExecutor(executorConfig)
        const report = executor.execute(validated.scanSource, validated.sourceType, validated.outputPathDir)

        return JSON.stringify(report, null, 2)
      } catch (e) {
        const err = e as Error
        return JSON.stringify({
          error: err.message.split(':')[0] ?? 'UNKNOWN_ERROR',
          message: err.message,
        })
      }
    },
  })
}