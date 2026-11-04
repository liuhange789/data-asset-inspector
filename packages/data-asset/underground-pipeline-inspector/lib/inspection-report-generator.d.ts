import type { QualityCheckResult, QualityElementScore, ErrorClassStatistics, GrossErrorRateResult, ReviewOverrideRecord, ValidationError, ConfigVersionSet, InspectionReport } from './types.js';
export interface GenerateReportParams {
    checkResults: QualityCheckResult[];
    qualityElementScores: QualityElementScore[];
    totalQualityScore: number;
    errorClassStatistics: ErrorClassStatistics;
    grossErrorRate: GrossErrorRateResult;
    overrideList: ReviewOverrideRecord[];
    errorList: ValidationError[];
    configVersions: ConfigVersionSet;
    inspectionScope: string;
    warnings: string[];
}
export declare class InspectionReportGenerator {
    private readonly policyBasisBuilder;
    constructor();
    generate(params: GenerateReportParams): InspectionReport;
    writeJson(report: InspectionReport, outputPath: string): void;
    writeMarkdown(report: InspectionReport, outputPath: string): void;
    private generateReportId;
    private renderMarkdown;
}
//# sourceMappingURL=inspection-report-generator.d.ts.map