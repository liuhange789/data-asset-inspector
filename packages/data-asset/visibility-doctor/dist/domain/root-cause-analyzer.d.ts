import type { RootCauseOptions, RootCauseResult } from '../types/index.js';
import type { IGitHubApiAdapter } from '../types/index.js';
import { ReportGenerator } from '../generators/report-generator.js';
export declare class RootCauseAnalyzer {
    private readonly githubAdapter;
    private readonly reportGenerator;
    constructor(githubAdapter: IGitHubApiAdapter, reportGenerator: ReportGenerator);
    analyzeRootCause(options: RootCauseOptions): Promise<RootCauseResult>;
    private loadDiagnoseReport;
    private parseOfficialIssue;
    private containsKeyword;
    private analyzeBlacklistResidual;
    private analyzeProbeWindowTruncation;
    private analyzeNamingInconsistency;
    private analyzeKeywordsGap;
    private analyzeAliasSearchBreak;
    private analyzeZeroDependencyDesign;
    private generateBugFixList;
    private createFixItem;
}
//# sourceMappingURL=root-cause-analyzer.d.ts.map