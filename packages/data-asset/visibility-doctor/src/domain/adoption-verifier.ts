import type {
  VerifyResult,
  DownloadVerification,
  ProbeVerification,
  MarketVerification,
  InstallVerification,
} from '../types/index.js';
import type {
  INpmRegistryAdapter,
  IProbeSimulatorAdapter,
  IMarketStoreAdapter,
} from '../types/index.js';
import { ReportGenerator } from '../generators/report-generator.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface VerifyOptions {
  readonly packageNames: readonly string[];
  readonly repoFullName: string;
  readonly baseline?: number | undefined;
  readonly shortTermTarget?: number | undefined;
  readonly longTermTarget?: number | undefined;
  readonly outputDir?: string | null | undefined;
}

const DEFAULT_BASELINE = 15;
const DEFAULT_SHORT_TERM = 100;
const DEFAULT_LONG_TERM = 500;

export class AdoptionVerifier {
  constructor(
    private readonly npmAdapter: INpmRegistryAdapter,
    private readonly probeAdapter: IProbeSimulatorAdapter,
    private readonly marketAdapter: IMarketStoreAdapter,
    private readonly reportGenerator: ReportGenerator,
  ) {}

  async verifyAdoption(options: VerifyOptions): Promise<VerifyResult> {
    const {
      packageNames,
      repoFullName,
      baseline = DEFAULT_BASELINE,
      shortTermTarget = DEFAULT_SHORT_TERM,
      longTermTarget = DEFAULT_LONG_TERM,
    } = options;

    const [downloads, probe, market, install] = await Promise.all([
      this.verifyDownloads(packageNames, baseline, shortTermTarget, longTermTarget),
      this.verifyProbeHit(packageNames, this.probeAdapter),
      this.verifyMarketListing(repoFullName, packageNames, this.marketAdapter),
      this.verifyInstallSuccess(packageNames),
    ]);

    const overallPassed = downloads.passed && probe.passed && market.passed && install.passed;

    const result: VerifyResult = {
      downloads,
      probe,
      market,
      install,
      overallPassed,
      verifiedAt: new Date().toISOString(),
    };

    await this.reportGenerator.generateVerifyReport(result, 'both');
    return result;
  }

  async verifyDownloads(
    packageNames: readonly string[],
    baseline: number,
    shortTermTarget: number,
    longTermTarget: number,
  ): Promise<DownloadVerification> {
    let totalDownloads = 0;
    for (const pkg of packageNames) {
      totalDownloads += await this.npmAdapter.queryWeeklyDownloads(pkg).catch(() => 0);
    }

    const currentWeekly = totalDownloads;
    const shortTermPassed = currentWeekly >= shortTermTarget;
    const longTermPassed = currentWeekly >= longTermTarget;

    return {
      currentWeekly,
      baseline,
      shortTermTarget,
      longTermTarget,
      shortTermPassed,
      longTermPassed,
      passed: shortTermPassed && longTermPassed,
    };
  }

  async verifyProbeHit(
    packageNames: readonly string[],
    probeAdapter: IProbeSimulatorAdapter,
  ): Promise<ProbeVerification> {
    const snapshot = await probeAdapter.getProbeSnapshot();
    const hitResult = probeAdapter.markHitList(
      snapshot.candidateOrdering,
      packageNames,
    );

    const hitCount = hitResult.hitList.filter(Boolean).length;
    const totalCount = packageNames.length;
    const hitRate = totalCount > 0 ? hitCount / totalCount : 0;

    return {
      hitCount,
      totalCount,
      hitRate,
      missedPackages: hitResult.truncatedPackages,
      passed: hitRate === 1,
    };
  }

  async verifyMarketListing(
    repoFullName: string,
    packageNames: readonly string[],
    marketAdapter: IMarketStoreAdapter,
  ): Promise<MarketVerification> {
    const statuses = await marketAdapter.queryAllPackagesMarketStatus(
      repoFullName,
      packageNames,
    );

    const allListed = statuses.every((s) => s.status === 'LISTED');

    return {
      statuses: statuses.map((s) => ({
        packageName: s.packageName,
        status: s.status,
        httpStatus: s.httpStatus,
      })),
      allListed,
      passed: allListed,
    };
  }

  async verifyInstallSuccess(
    packageNames: readonly string[],
  ): Promise<InstallVerification> {
    const results: { packageName: string; success: boolean; exitCode: number; errorOutput: string | null }[] = [];

    for (const pkg of packageNames) {
      try {
        const { stderr } = await execAsync(
          `dsh plugin --profile web add ${pkg}`,
          { timeout: 30000 },
        );
        results.push({
          packageName: pkg,
          success: true,
          exitCode: 0,
          errorOutput: stderr || null,
        });
      } catch (err) {
        const error = err as { code?: number; stderr?: string };
        results.push({
          packageName: pkg,
          success: false,
          exitCode: error.code ?? 1,
          errorOutput: error.stderr ?? String(err),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const successRate = results.length > 0 ? successCount / results.length : 0;

    return {
      results,
      successRate,
      passed: successRate === 1,
    };
  }
}