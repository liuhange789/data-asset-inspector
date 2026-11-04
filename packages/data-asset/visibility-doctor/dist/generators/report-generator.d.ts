import type { DiagnoseResult, RootCauseResult, BoostResult, VerifyResult, ReportFiles } from '../types/index.js';
export declare class ReportGenerator {
    private readonly outputDir;
    constructor(outputDir: string);
    generateDiagnoseReport(result: DiagnoseResult, format: 'json' | 'md' | 'both'): Promise<ReportFiles>;
    generateRootCauseReport(result: RootCauseResult, format: 'json' | 'md' | 'both'): Promise<ReportFiles>;
    generateBoostReport(result: BoostResult, format: 'json' | 'md' | 'both'): Promise<ReportFiles>;
    generateVerifyReport(result: VerifyResult, format: 'json' | 'md' | 'both'): Promise<ReportFiles>;
    private atomicWrite;
    private renderDiagnoseMarkdown;
    private renderRootCauseMarkdown;
    private renderBoostMarkdown;
    private renderVerifyMarkdown;
}
//# sourceMappingURL=report-generator.d.ts.map