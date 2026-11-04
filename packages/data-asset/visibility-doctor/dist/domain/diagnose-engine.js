import { NpmRateLimitError } from '../adapters/npm-registry-adapter.js';
const ALIAS_PREFIX = '@deepseek-ai/';
const ACTUAL_PREFIX = '@liuhange/';
export class DiagnoseEngine {
    npmAdapter;
    probeAdapter;
    marketAdapter;
    githubAdapter;
    scoringCalculator;
    constructor(npmAdapter, probeAdapter, marketAdapter, githubAdapter, scoringCalculator, reportGenerator) {
        this.npmAdapter = npmAdapter;
        this.probeAdapter = probeAdapter;
        this.marketAdapter = marketAdapter;
        this.githubAdapter = githubAdapter;
        this.scoringCalculator = scoringCalculator;
        this.reportGenerator = reportGenerator;
    }
    reportGenerator;
    async diagnose(options) {
        const startTime = Date.now();
        const { packageNames, repoFullName } = options;
        const probeSnapshot = await this.probeAdapter.getProbeSnapshot();
        const hitResult = this.probeAdapter.markHitList(probeSnapshot.candidateOrdering, packageNames);
        let npmMetas;
        try {
            npmMetas = await this.npmAdapter.batchQuery(packageNames);
        }
        catch (err) {
            if (err instanceof NpmRateLimitError) {
                npmMetas = await this.fallbackNpmQuery(packageNames, err.failedPackages);
            }
            else {
                throw err;
            }
        }
        const marketStatuses = await this.marketAdapter.queryAllPackagesMarketStatus(repoFullName, packageNames);
        const topics = await this.githubAdapter.queryTopics(repoFullName);
        const topicsDoubleHit = topics.includes('dsh-plugin') && topics.includes('deepseek-harness');
        const readmeCommands = await this.githubAdapter.queryReadmeInstallCommands(repoFullName);
        const readmePackageNames = new Set(readmeCommands.filter((c) => c.usesActualName).map((c) => c.packageName));
        const repoName = repoFullName.split('/')[1] ?? '';
        const diagnoses = [];
        for (let i = 0; i < packageNames.length; i++) {
            const pkgName = packageNames[i];
            const meta = npmMetas.find((m) => m.name === pkgName);
            const marketStatus = marketStatuses[i];
            const probeHit = hitResult.hitList[i] ?? false;
            const keywordsHit = this.checkKeywordsHit(meta?.keywords ?? []);
            const readmeInstallFormat = readmePackageNames.has(pkgName);
            const marketListed = (marketStatus?.status ?? 'NOT_SCANNED') === 'LISTED';
            const aliasDisplay = this.checkAliasDisplay(meta?.description ?? null, pkgName);
            const repoNameMatch = this.checkRepoNameMatch(repoName, pkgName);
            const input = {
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
                marketStatus: (marketStatus?.status ?? 'NOT_SCANNED'),
                marketDetailPageUrl: marketStatus?.detailPageUrl ?? null,
                topicsDoubleHit,
                readmeInstallFormat,
                repoNameMatch,
                probeHit,
                score,
            });
        }
        const result = {
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
    async fallbackNpmQuery(allPackages, failedPackages) {
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
            }
            else {
                results.push(await this.npmAdapter.queryPackageMeta(pkg));
            }
        }
        return results;
    }
    checkKeywordsHit(keywords) {
        const required = ['deepseek-harness', 'dsh-plugin', 'data-asset'];
        return required.every((k) => keywords.includes(k));
    }
    checkAliasDisplay(description, packageName) {
        if (!description)
            return false;
        if (!packageName.startsWith(ACTUAL_PREFIX))
            return true;
        const aliasName = this.getAliasName(packageName);
        return aliasName !== null && description.includes(aliasName);
    }
    getAliasName(packageName) {
        if (!packageName.startsWith(ACTUAL_PREFIX))
            return null;
        const suffix = packageName.slice(ACTUAL_PREFIX.length);
        return `${ALIAS_PREFIX}${suffix}`;
    }
    checkRepoNameMatch(repoName, packageName) {
        const pkgBaseName = packageName.split('/').pop() ?? '';
        const pkgWithoutPrefix = pkgBaseName.replace(/^dsh-/, '').replace(/^data-asset-/, '');
        const repoNormalized = repoName.replace(/-/g, '');
        const pkgNormalized = pkgWithoutPrefix.replace(/-/g, '');
        return repoNormalized.includes(pkgNormalized) || pkgNormalized.includes(repoNormalized);
    }
}
//# sourceMappingURL=diagnose-engine.js.map