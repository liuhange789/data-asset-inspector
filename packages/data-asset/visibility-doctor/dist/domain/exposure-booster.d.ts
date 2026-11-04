import type { BoostOptions, BoostResult, KeywordsGapResult, MarketFilingGapResult, MainPackageBooster, PackageMeta } from '../types/index.js';
import type { IGitHubApiAdapter, INpmRegistryAdapter } from '../types/index.js';
import { ReportGenerator } from '../generators/report-generator.js';
export declare class ExposureBooster {
    private readonly npmAdapter;
    private readonly githubAdapter;
    private readonly reportGenerator;
    constructor(npmAdapter: INpmRegistryAdapter, githubAdapter: IGitHubApiAdapter, reportGenerator: ReportGenerator);
    boostExposure(options: BoostOptions): Promise<BoostResult>;
    analyzeKeywordsCoverage(existingKeywords: readonly string[]): KeywordsGapResult;
    checkMarketFilingCompleteness(detailPageContent: string): MarketFilingGapResult;
    generateMainPackageBooster(allPackages: readonly PackageMeta[]): MainPackageBooster;
    private generateTopicsGuidance;
    private checkMarketFiling;
    private generateFilingDraft;
}
//# sourceMappingURL=exposure-booster.d.ts.map