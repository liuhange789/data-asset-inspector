import type { PipelineDataset, PipelineInspectionConfig, CoverageCheckResult, QualityCheckResult } from './types.js';
export declare class CoverageChecker {
    check(dataset: PipelineDataset, config: PipelineInspectionConfig): {
        coverageResult: CoverageCheckResult;
        checkResults: QualityCheckResult[];
    };
    private checkPointFields;
    private checkSegmentFields;
}
//# sourceMappingURL=coverage-checker.d.ts.map