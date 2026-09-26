export type AcceptanceExitCode = 0 | 1 | 2

export type ErrorSeverity = 'fatal' | 'error' | 'warning'

export type Trigger = '数据鉴证' | 'AI数据集体检' | '政务数据巡检' | '数据可流通性评估' | '城市数据分类'

export interface ErrorRecord {
  readonly severity: ErrorSeverity
  readonly code: string
  readonly message: string
  readonly context?: string
  readonly fixSuggestion?: string
}

export interface EnvironmentInfo {
  readonly nodeVersion: string
  readonly platform: string
  readonly sandboxDir: string
  readonly dshBaseUrl: string
  readonly startedAt: string
}

export interface InstallLogEntry {
  readonly packageName: string
  readonly version: string
  readonly stdout: string
  readonly stderr: string
  readonly exitCode: number
  readonly durationMs: number
  readonly timestamp: string
}

export interface PreparedEnvironment {
  readonly sandboxDir: string
  readonly dshClient: unknown
  readonly dshProcess: unknown
  readonly installLog: readonly InstallLogEntry[]
  readonly baseUrl: string
}

export interface PreparationResult {
  readonly success: boolean
  readonly environment?: PreparedEnvironment
  readonly errors: readonly ErrorRecord[]
}

export interface VisibilityAcceptanceResult {
  readonly pluginsVisible: readonly { packageName: string; visible: boolean }[]
  readonly toolsRegistered: readonly { toolName: string; registered: boolean }[]
  readonly loadErrors: readonly string[]
  readonly peerDepWarnings: readonly string[]
  readonly passed: boolean
  readonly errors: readonly ErrorRecord[]
}

export interface ChainRunOutput {
  readonly trigger: Trigger
  readonly rawOutput: string
  readonly parsedOutput: Record<string, unknown> | null
  readonly success: boolean
  readonly durationMs: number
}

export interface ChainAcceptanceResult {
  readonly chainResults: readonly ChainRunOutput[]
  readonly checkpointChecks: readonly { trigger: Trigger; field: string; present: boolean; nonEmpty: boolean }[]
  readonly passed: boolean
  readonly errors: readonly ErrorRecord[]
}

export interface FailureTestResult {
  readonly trigger: Trigger
  readonly rawOutput: string
  readonly hasFailureStructure: boolean
  readonly completedSteps: readonly string[]
  readonly failedStep: string | null
  readonly errorMessage: string | null
  readonly passed: boolean
}

export interface FailureAcceptanceResult {
  readonly failureResults: readonly FailureTestResult[]
  readonly passed: boolean
  readonly errors: readonly ErrorRecord[]
}

export interface PolicyReferenceItem {
  readonly seq: number
  readonly fullName: string
  readonly docNumber: string
  readonly coreRequirement: string
  readonly relatedChains: readonly Trigger[]
}

export interface PolicyAcceptanceResult {
  readonly totalExpected: number
  readonly foundInReports: readonly PolicyReferenceItem[]
  readonly missing: readonly PolicyReferenceItem[]
  readonly formatIssues: readonly string[]
  readonly passed: boolean
  readonly errors: readonly ErrorRecord[]
}

export interface NpmPackageMetadata {
  readonly name: string
  readonly latestVersion: string
  readonly versions: readonly string[]
  readonly description: string
  readonly repositoryUrl: string
  readonly homepage: string
}

export interface NpmAcceptanceResult {
  readonly packageChecks: readonly { packageName: string; expectedVersion: string; actualLatest: string; pageAccessible: boolean; versionMatch: boolean }[]
  readonly passed: boolean
  readonly errors: readonly ErrorRecord[]
}

export interface ThreeStandardsSummary {
  readonly visible: { passed: boolean; details: string }
  readonly queryable: { passed: boolean; details: string }
  readonly usable: { passed: boolean; details: string }
}

export interface AcceptanceReport {
  readonly generatedAt: string
  readonly environment: EnvironmentInfo
  readonly visibility: VisibilityAcceptanceResult
  readonly chain: ChainAcceptanceResult
  readonly failure: FailureAcceptanceResult
  readonly policy: PolicyAcceptanceResult
  readonly npm: NpmAcceptanceResult
  readonly threeStandards: ThreeStandardsSummary
  readonly overallPassed: boolean
  readonly errors: readonly ErrorRecord[]
}

export interface AcceptanceConfig {
  readonly keepSandbox: boolean
  readonly timeoutMultiplier: number
  readonly sandboxDir?: string
}

export interface TestDataFiles {
  readonly inputFiles: readonly { readonly path: string; readonly description: string }[]
}

export type InvalidTestDataKind = 'nonexistent-path' | 'empty-file' | 'corrupted-format' | 'missing-required-field'

export interface InvalidTestDataSpec {
  readonly trigger: Trigger
  readonly kind: InvalidTestDataKind
  readonly path: string
  readonly expectedFailStep: string
}

export type NormalTestDataSets = Record<Trigger, TestDataFiles>
export type InvalidTestDataSets = Record<Trigger, InvalidTestDataSpec>

export type DshClientType = {
  invokeTool: (toolName: string, args: Record<string, unknown>) => Promise<string>
  listPlugins: () => Promise<string[]>
  getToolMetadata: (toolName: string) => Promise<{ name: string; description: string } | null>
  getStartupLogs: () => Promise<string>
}