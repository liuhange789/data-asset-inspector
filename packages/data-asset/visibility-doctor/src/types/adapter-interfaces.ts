import type { MarketStatus, ProbeSnapshot } from './domain.js';

export interface PackageMeta {
  readonly name: string;
  readonly version: string;
  readonly keywords: readonly string[];
  readonly description: string | null;
  readonly homepage: string | null;
  readonly repositoryUrl: string | null;
  readonly dependencies: readonly { readonly name: string; readonly version: string }[];
  readonly peerDependencies: readonly { readonly name: string; readonly version: string }[];
}

export interface ReadmeInstallCommand {
  readonly command: string;
  readonly packageName: string;
  readonly usesActualName: boolean;
}

export interface IssueStatus {
  readonly issueRef: string;
  readonly state: 'open' | 'closed';
  readonly comments: readonly { readonly body: string; readonly createdAt: string }[];
  readonly lastUpdatedAt: string;
}

export interface RepoMeta {
  readonly stars: number;
  readonly topics: readonly string[];
  readonly defaultBranch: string;
}

export interface INpmRegistryAdapter {
  queryPackageMeta(packageName: string): Promise<PackageMeta>;
  queryWeeklyDownloads(packageName: string): Promise<number>;
  queryDependentCount(packageName: string): Promise<number>;
  batchQuery(packageNames: readonly string[]): Promise<readonly PackageMeta[]>;
}

export interface IProbeSimulatorAdapter {
  getProbeSnapshot(): Promise<ProbeSnapshot>;
  markHitList(
    candidateOrdering: readonly string[],
    seriesPackages: readonly string[],
  ): { readonly hitList: readonly boolean[]; readonly truncatedPackages: readonly string[] };
}

export interface IMarketStoreAdapter {
  queryMarketStatus(
    repoFullName: string,
  ): Promise<{ readonly status: MarketStatus; readonly detailPageUrl: string; readonly httpStatus: number }>;
  queryAllPackagesMarketStatus(
    repoFullName: string,
    packageNames: readonly string[],
  ): Promise<readonly { readonly packageName: string; readonly status: MarketStatus; readonly detailPageUrl: string; readonly httpStatus: number }[]>;
}

export interface IGitHubApiAdapter {
  queryTopics(repoFullName: string): Promise<readonly string[]>;
  checkTopicsDoubleHit(
    topics: readonly string[],
  ): { readonly hit: boolean; readonly missing: readonly string[] };
  queryReadmeInstallCommands(repoFullName: string): Promise<readonly ReadmeInstallCommand[]>;
  queryIssueStatus(issueRef: string): Promise<IssueStatus>;
  queryRepoMeta(repoFullName: string): Promise<RepoMeta>;
}