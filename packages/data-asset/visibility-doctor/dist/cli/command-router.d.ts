import type { ParsedCliArgs } from './cli-entrypoint.js';
export declare class CommandRouter {
    route(args: ParsedCliArgs): Promise<void>;
    private runDiagnose;
    private runAnalyze;
    private runBoost;
    private runVerify;
    private findLatestReport;
}
//# sourceMappingURL=command-router.d.ts.map