import type { DiagnoseOptions, DiagnoseResult } from '../types/index.js';
import type { INpmRegistryAdapter, IProbeSimulatorAdapter, IMarketStoreAdapter, IGitHubApiAdapter } from '../types/index.js';
import { ScoringCalculator } from './scoring-calculator.js';
import { ReportGenerator } from '../generators/report-generator.js';
export declare class DiagnoseEngine {
    private readonly npmAdapter;
    private readonly probeAdapter;
    private readonly marketAdapter;
    private readonly githubAdapter;
    private readonly scoringCalculator;
    constructor(npmAdapter: INpmRegistryAdapter, probeAdapter: IProbeSimulatorAdapter, marketAdapter: IMarketStoreAdapter, githubAdapter: IGitHubApiAdapter, scoringCalculator: ScoringCalculator, reportGenerator: ReportGenerator);
    private readonly reportGenerator;
    diagnose(options: DiagnoseOptions): Promise<DiagnoseResult>;
    private fallbackNpmQuery;
    private checkKeywordsHit;
    private checkAliasDisplay;
    private getAliasName;
    private checkRepoNameMatch;
}
//# sourceMappingURL=diagnose-engine.d.ts.map