export type MarketStatus = 'LISTED' | 'PENDING' | 'REJECTED' | 'NOT_SCANNED';
export type RootCauseLayer = 'OFFICIAL' | 'PLUGIN' | 'MARKET';
export type Priority = 'P0' | 'P1' | 'P2';
export type ScoreDimension =
  | 'KEYWORDS_HIT'
  | 'README_INSTALL_FORMAT'
  | 'TOPICS_DOUBLE_HIT'
  | 'MARKET_LISTED'
  | 'ALIAS_DISPLAY'
  | 'REPO_NAME_MATCH';

export interface DiagnoseOptions {
  readonly workspacePath: string;
  readonly packageNames: readonly string[];
  readonly repoFullName: string;
  readonly issueRef?: string | null;
  readonly outputDir?: string | null;
  readonly format?: 'json' | 'md' | 'both' | null;
}

export interface Subscore {
  readonly dimension: ScoreDimension;
  readonly score: number;
  readonly maxScore: number;
  readonly hit: boolean;
  readonly evidence: string;
}

export interface DiscoverabilityScore {
  readonly packageName: string;
  readonly overallScore: number;
  readonly subscores: readonly Subscore[];
}

export interface ProbeSnapshot {
  readonly candidateOrdering: readonly string[];
  readonly windowSize: number;
  readonly windowPackages: readonly string[];
  readonly isCached: boolean;
  readonly timestamp: string;
}

export interface PackageDiagnosis {
  readonly packageName: string;
  readonly version: string;
  readonly weeklyDownloads: number;
  readonly dependentCount: number;
  readonly keywords: readonly string[];
  readonly homepage: string | null;
  readonly repositoryUrl: string | null;
  readonly description: string | null;
  readonly hasAlias: boolean;
  readonly aliasName: string | null;
  readonly marketStatus: MarketStatus;
  readonly marketDetailPageUrl: string | null;
  readonly topicsDoubleHit: boolean;
  readonly readmeInstallFormat: boolean;
  readonly repoNameMatch: boolean;
  readonly probeHit: boolean;
  readonly score: DiscoverabilityScore;
}

export interface DiagnoseResult {
  readonly packages: readonly PackageDiagnosis[];
  readonly probeSnapshot: ProbeSnapshot;
  readonly truncatedPackages: readonly string[];
  readonly diagnosedAt: string;
  readonly durationMs: number;
}

export interface RootCause {
  readonly id: string;
  readonly layer: RootCauseLayer;
  readonly priority: Priority;
  readonly title: string;
  readonly description: string;
  readonly evidence: readonly string[];
  readonly actionable: boolean;
  readonly fixId: string | null;
}

export interface BugFixItem {
  readonly id: string;
  readonly rootCauseId: string;
  readonly layer: RootCauseLayer;
  readonly priority: Priority;
  readonly description: string;
  readonly verifyCommand: string;
  readonly acceptanceCriteria: string;
  readonly autoFixScript: string | null;
}

export interface PackagePatch {
  readonly packageName: string;
  readonly patchContent: string;
  readonly addedKeywords: readonly string[];
  readonly addedHomepage: string | null;
  readonly updatedDescription: string | null;
  readonly isIdempotent: boolean;
}

export interface DownloadVerification {
  readonly currentWeekly: number;
  readonly baseline: number;
  readonly shortTermTarget: number;
  readonly longTermTarget: number;
  readonly shortTermPassed: boolean;
  readonly longTermPassed: boolean;
  readonly passed: boolean;
}

export interface ProbeVerification {
  readonly hitCount: number;
  readonly totalCount: number;
  readonly hitRate: number;
  readonly missedPackages: readonly string[];
  readonly passed: boolean;
}

export interface MarketVerification {
  readonly statuses: readonly { packageName: string; status: MarketStatus; httpStatus: number }[];
  readonly allListed: boolean;
  readonly passed: boolean;
}

export interface InstallVerification {
  readonly results: readonly { packageName: string; success: boolean; exitCode: number; errorOutput: string | null }[];
  readonly successRate: number;
  readonly passed: boolean;
}

export interface VerifyResult {
  readonly downloads: DownloadVerification;
  readonly probe: ProbeVerification;
  readonly market: MarketVerification;
  readonly install: InstallVerification;
  readonly overallPassed: boolean;
  readonly verifiedAt: string;
}

export interface BoostOptions {
  readonly workspacePath: string;
  readonly packageNames: readonly string[];
  readonly repoFullName: string;
  readonly dryRun?: boolean | null;
  readonly outputDir?: string | null;
}

export interface KeywordsGapResult {
  readonly existing: readonly string[];
  readonly missing: readonly string[];
  readonly suggested: readonly string[];
}

export interface MarketFilingGapResult {
  readonly missingFields: readonly string[];
  readonly draftContent: string;
}

export interface MainPackageBooster {
  readonly readmeSection: string;
  readonly descriptionHint: string;
}

export interface TopicsGuidance {
  readonly hasDoubleHit: boolean;
  readonly missingTopics: readonly string[];
  readonly manualSteps: readonly string[];
}

export interface BoostResult {
  readonly patches: readonly PackagePatch[];
  readonly topicsGuidance: TopicsGuidance;
  readonly marketFilingGaps: readonly MarketFilingGapResult[];
  readonly mainPackageBooster: MainPackageBooster;
  readonly boostedAt: string;
}

export interface RootCauseOptions {
  readonly diagnoseReportPath: string;
  readonly issueRef: string;
  readonly repoFullName: string;
}

export interface RootCauseResult {
  readonly rootCauses: readonly RootCause[];
  readonly bugFixList: readonly BugFixItem[];
  readonly officialIssueStatus: OfficialIssueStatus;
  readonly analyzedAt: string;
}

export interface OfficialIssueStatus {
  readonly issueRef: string;
  readonly state: 'open' | 'closed';
  readonly acknowledgedMisjudgment: boolean;
  readonly removedFromBlacklist: boolean;
  readonly filingInProgress: boolean;
  readonly filingComplete: boolean;
  readonly lastUpdatedAt: string;
}