import { resolve } from 'node:path'
import type { Trigger, PolicyReferenceItem } from './types.js'

const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..')

export interface PackageInstallSpec {
  readonly name: string
  readonly version: string
  readonly installOrder: number
}

export const PACKAGES: readonly PackageInstallSpec[] = [
  { name: '@liuhange/dsh-data-asset-shared', version: '3.2.0', installOrder: 1 },
  { name: '@liuhange/dsh-data-asset-attestation', version: '3.1.1', installOrder: 2 },
  { name: '@liuhange/dsh-ai-dataset-inspector', version: '3.1.1', installOrder: 3 },
  { name: '@liuhange/dsh-gov-data-inspector', version: '3.1.1', installOrder: 4 },
  { name: '@liuhange/dsh-data-circulation-assessor', version: '3.1.1', installOrder: 5 },
  { name: '@liuhange/dsh-city-data-classifier', version: '3.1.1', installOrder: 6 },
  { name: '@liuhange/dsh-data-asset-orchestration', version: '3.1.0', installOrder: 7 },
]

export const EXPECTED_TOOL_NAMES: readonly string[] = [
  'attest_data_quality',
  'inspect_ai_dataset',
  'inspect_gov_data',
  'assess_circulation',
  'classify_city_data',
]

export const TRIGGERS: readonly Trigger[] = [
  '数据鉴证',
  'AI数据集体检',
  '政务数据巡检',
  '数据可流通性评估',
  '城市数据分类',
]

export const CHAIN_CHECKPOINT_FIELDS: Record<Trigger, readonly string[]> = {
  '数据鉴证': ['evidenceChainHash', 'attestationStatement', 'policyBasis'],
  'AI数据集体检': ['kappaCoefficient', 'labelDistribution', 'dataLeakage', 'policyBasis'],
  '政务数据巡检': ['guideInspection', 'classification', 'policyBasis'],
  '数据可流通性评估': ['trustedSpaceReadiness', 'transactionCompliance', 'circulationScore', 'policyBasis'],
  '城市数据分类': ['aiRecommendation', 'dataAssetCode', 'humanReview', 'policyBasis'],
}

export const POLICY_REFS_PATH = resolve(REPO_ROOT, 'packages/data-asset/data-asset-shared/config/policy-references.json')
export const VERTICAL_CHAINS_PATH = resolve(REPO_ROOT, 'packages/data-asset/data-asset-orchestration/config/vertical-chains.json')
export const BUSINESS_RULES_PATH = resolve(REPO_ROOT, 'packages/data-asset/data-asset-shared/config/business-rules.json')

export const TIMEOUTS = {
  packageInstall: 120_000,
  chainExecution: 600_000,
  npmQuery: 10_000,
  reportGeneration: 60_000,
  dshStartup: 120_000,
} as const

export const DSH_PROFILE = 'web' as const

export const POLICY_REFERENCE_LIST: readonly PolicyReferenceItem[] = [
  { seq: 1, fullName: '数据质量鉴证评价方法', docNumber: 'T/CIIA 060-2025', coreRequirement: '为数据资产入表、数据价值评估、数据融资增信、数据合规审计、数据产品定价等场景提供评价依据', relatedChains: ['数据鉴证'] },
  { seq: 2, fullName: '企业数据资源相关会计处理暂行规定', docNumber: '财会〔2023〕11号', coreRequirement: '外购数据资源的成本包括数据权属鉴证、质量评估、登记结算、安全管理等费用', relatedChains: ['数据鉴证'] },
  { seq: 3, fullName: '关于推进行业高质量数据集建设行动的实施方案', docNumber: '国数发〔2026〕39号', coreRequirement: '部署强基扩容、标注攻坚、提质增效、应用赋能、管理服务、价值释放六大行动', relatedChains: ['AI数据集体检'] },
  { seq: 4, fullName: '高质量数据集建设指南', docNumber: 'T/TC609 005-2025', coreRequirement: '覆盖数据需求、规划、采集、预处理、标注、模型验证全生命周期', relatedChains: ['AI数据集体检'] },
  { seq: 5, fullName: '资产管理 数据资产分类与代码', docNumber: 'GB/T 47949-2026', coreRequirement: '数据资产分为结构化、半结构化、非结构化三小类，16项具体细类', relatedChains: ['政务数据巡检', '城市数据分类'] },
  { seq: 6, fullName: '资产管理 数据资产登记指南', docNumber: 'GB/T 47950-2026', coreRequirement: '明确初始、变更和注销登记流程', relatedChains: ['政务数据巡检', '城市数据分类'] },
  { seq: 7, fullName: '可信数据空间发展行动计划（2024—2028年）', docNumber: '国数资源〔2024〕119号', coreRequirement: '支持可信数据空间运营者构建接入认证体系、数据资源封装、目录维护等', relatedChains: ['数据可流通性评估'] },
  { seq: 8, fullName: '数据安全技术 数据交易服务安全要求', docNumber: 'GB/T 37932-2025', coreRequirement: '规定数据交易参与方、交易平台、交易标的及交易过程的安全要求', relatedChains: ['数据可流通性评估'] },
  { seq: 9, fullName: '基于AI的城市数据分类分级框架', docNumber: 'ITU-T Y.4550（立项阶段）', coreRequirement: 'AI赋能城市数据分类分级', relatedChains: ['城市数据分类'] },
]

export const REPO_ROOT_PATH = REPO_ROOT