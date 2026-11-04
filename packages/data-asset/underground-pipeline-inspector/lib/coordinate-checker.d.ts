import type { PipelineDataset, PipelineInspectionConfig, CoordinateCheckResult, QualityCheckResult } from './types.js';
export declare class CoordinateChecker {
    check(dataset: PipelineDataset, config: PipelineInspectionConfig): {
        coordinateResult: CoordinateCheckResult;
        checkResults: QualityCheckResult[];
    };
}
//# sourceMappingURL=coordinate-checker.d.ts.map