import type {
  DiagnoseOptions,
  DiagnoseResult,
  PackageDiagnosis,

  MarketStatus,
} from '../types/index.js';
import type {
  INpmRegistryAdapter,
  IProbeSimulatorAdapter,
  IMarketStoreAdapter,
  IGitHubApiAdapter,
} from '../types/index.js';
import { ScoringCalculator, type PackageDiagnosisInput } from './scoring-calculator.js';
import { ReportGenerator } from '../generators/report-generator.js';
import { NpmRateLimitError } from '../adapters/npm-registry-adapter.js';

const ALIAS_PREFIX = '@deepseek-ai/';
const ACTUAL_PREFIX = '@liuhange/';

export class DiagnoseEngine {
  constructor(
    private readonly npmAdapter: INpmRegistryAdapter,
    private readonly probeAdapter: IProbeSimulatorAdapter,
    private readonly marketAdapter: IMarketStoreAdapter,
    private readonly githubAdapter: IGitHubApiAdapter,
    private readonly scoringCalculator: ScoringCalculator,
    reportGenerator: ReportGenerator,
  ) {
    this.reportGenerator = reportGenerator;
  }

  private readonly reportGenerator: ReportGenerator;

  async diagnose(options: DiagnoseOptions): Promise<DiagnoseResult> {
    const startTime = Date.now();
    const { packageNames, repoFullName } = options;

    const probeSnapshot = await this.probeAdapter.getProbeSnapshot();
    const hitResult = this.probeAdapter.markHitList(
      probeSnapshot.candidateOrdering,
      packageNames,
    );

    let npmMetas;
    try {
      npmMetas = await this.npmAdapter.batchQuery(packageNames);
    } catch (err) {
      if (err instanceof NpmRateLimitError) {
        npmMetas = await this.fallbackNpmQuery(packageNames, err.failedPackages);
      } else {
        throw err;
      }
    }

    const marketStatuses = await this.marketAdapter.queryAllPackagesMarketStatus(
      repoFullName,
      packageNames,
    );

    const topics = await this.githubAdapter.queryTopics(repoFullName);
    const topicsDoubleHit = topics.includes('dsh-plugin') && topics.includes('deepseek-harness');

    const readmeCommands = await this.githubAdapter.queryReadmeInstallCommands(repoFullName);
    const readmePackageNames = new Set(readmeCommands.filter((c) => c.usesActualName).map((c) => c.packageName));


    const repoName = repoFullName.split('/')[1] ?? '';

    const diagnoses: PackageDiagnosis[] = [];
    for (let i = 0; i < packageNames.length; i++) {
      const pkgName = packageNames[i]!;
      const meta = npmMetas.find((m) => m.name === pkgName);
      const marketStatus = marketStatuses[i];
      const probeHit = hitResult.hitList[i] ?? false;

      const keywordsHit = this.checkKeywordsHit(meta?.keywords ?? []);
      const readmeInstallFormat = readmePackageNames.has(pkgName);
      const marketListed = (marketStatus?.status ?? 'NOT_SCANNED') === 'LISTED';
      const aliasDisplay = this.checkAliasDisplay(meta?.description ?? null, pkgName);
      const repoNameMatch = this.checkRepoNameMatch(repoName, pkgName);

      const input: PackageDiagnosisInput = {
        packageName: pkgName,
        keywordsHit,
        readmeInstallFormat,
        topicsDoubleHit,
        marketListed,
        aliasDisplay,
        repoNameMatch,
      };

      const score = this.scoringCalculator.scorePackage(input);

      diagnoses.push({
        packageName: pkgName,
        version: meta?.version ?? 'unknown',
        weeklyDownloads: await this.npmAdapter.queryWeeklyDownloads(pkgName).catch(() => 0),
        dependentCount: await this.npmAdapter.queryDependentCount(pkgName).catch(() => 0),
        keywords: meta?.keywords ?? [],
        homepage: meta?.homepage ?? null,
        repositoryUrl: meta?.repositoryUrl ?? null,
        description: meta?.description ?? null,
        hasAlias: aliasDisplay,
        aliasName: this.getAliasName(pkgName),
        marketStatus: (marketStatus?.status ?? 'NOT_SCANNED') as MarketStatus,
        marketDetailPageUrl: marketStatus?.detailPageUrl ?? null,
        topicsDoubleHit,
        readmeInstallFormat,
        repoNameMatch,
        probeHit,
        score,
      });
    }

    const result: DiagnoseResult = {
      packages: diagnoses,
      probeSnapshot,
      truncatedPackages: hitResult.truncatedPackages,
      diagnosedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };

    const format = options.format ?? 'both';
    await this.reportGenerator.generateDiagnoseReport(result, format);

    return result;
  }

  private async fallbackNpmQuery(
    allPackages: readonly string[],
    failedPackages: readonly string[],
  ): Promise<readonly { name: string; version: string; keywords: readonly string[]; description: string | null; homepage: string | null; repositoryUrl: string | null; dependencies: readonly { name: string; version: string }[]; peerDependencies: readonly { name: string; version: string }[] }[]> {
    const results = [];
    for (const pkg of allPackages) {
      if (failedPackages.includes(pkg)) {
        results.push({
          name: pkg,
          version: 'unknown',
          keywords: [],
          description: null,
          homepage: null,
          repositoryUrl: null,
          dependencies: [],
          peerDependencies: [],
        });
      } else {
        results.push(await this.npmAdapter.queryPackageMeta(pkg));
      }
    }
    return results;
  }

  private checkKeywordsHit(keywords: readonly string[]): boolean {
    const required = ['deepseek-harness', 'dsh-plugin', 'data-asset'];
    return required.every((k) => keywords.includes(k));
  }

  private checkAliasDisplay(description: string | null, packageName: string): boolean {
    if (!description) return false;
    if (!packageName.startsWith(ACTUAL_PREFIX)) return true;
    const aliasName = this.getAliasName(packageName);
    return aliasName !== null && description.includes(aliasName);
  }

  private getAliasName(packageName: string): string | null {
    if (!packageName.startsWith(ACTUAL_PREFIX)) return null;
    const suffix = packageName.slice(ACTUAL_PREFIX.length);
    return `${ALIAS_PREFIX}${suffix}`;
  }

  private checkRepoNameMatch(repoName: string, packageName: string): boolean {
    const pkgBaseName = packageName.split('/').pop() ?? '';
    const pkgWithoutPrefix = pkgBaseName.replace(/^dsh-/, '').replace(/^data-asset-/, '');
    const repoNormalized = repoName.replace(/-/g, '');
    const pkgNormalized = pkgWithoutPrefix.replace(/-/g, '');
    return repoNormalized.includes(pkgNormalized) || pkgNormalized.includes(repoNormalized);
  }
}