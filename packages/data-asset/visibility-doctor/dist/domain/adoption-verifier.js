import { exec } from 'node:child_process';
import { promisify } from 'node:util';
const execAsync = promisify(exec);
const DEFAULT_BASELINE = 15;
const DEFAULT_SHORT_TERM = 100;
const DEFAULT_LONG_TERM = 500;
export class AdoptionVerifier {
    npmAdapter;
    probeAdapter;
    marketAdapter;
    reportGenerator;
    constructor(npmAdapter, probeAdapter, marketAdapter, reportGenerator) {
        this.npmAdapter = npmAdapter;
        this.probeAdapter = probeAdapter;
        this.marketAdapter = marketAdapter;
        this.reportGenerator = reportGenerator;
    }
    async verifyAdoption(options) {
        const { packageNames, repoFullName, baseline = DEFAULT_BASELINE, shortTermTarget = DEFAULT_SHORT_TERM, longTermTarget = DEFAULT_LONG_TERM, } = options;
        const [downloads, probe, market, install] = await Promise.all([
            this.verifyDownloads(packageNames, baseline, shortTermTarget, longTermTarget),
            this.verifyProbeHit(packageNames, this.probeAdapter),
            this.verifyMarketListing(repoFullName, packageNames, this.marketAdapter),
            this.verifyInstallSuccess(packageNames),
        ]);
        const overallPassed = downloads.passed && probe.passed && market.passed && install.passed;
        const result = {
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
    async verifyDownloads(packageNames, baseline, shortTermTarget, longTermTarget) {
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
    async verifyProbeHit(packageNames, probeAdapter) {
        const snapshot = await probeAdapter.getProbeSnapshot();
        const hitResult = probeAdapter.markHitList(snapshot.candidateOrdering, packageNames);
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
    async verifyMarketListing(repoFullName, packageNames, marketAdapter) {
        const statuses = await marketAdapter.queryAllPackagesMarketStatus(repoFullName, packageNames);
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
    async verifyInstallSuccess(packageNames) {
        const results = [];
        for (const pkg of packageNames) {
            try {
                const { stderr } = await execAsync(`dsh plugin --profile web add ${pkg}`, { timeout: 30000 });
                results.push({
                    packageName: pkg,
                    success: true,
                    exitCode: 0,
                    errorOutput: stderr || null,
                });
            }
            catch (err) {
                const error = err;
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
//# sourceMappingURL=adoption-verifier.js.map