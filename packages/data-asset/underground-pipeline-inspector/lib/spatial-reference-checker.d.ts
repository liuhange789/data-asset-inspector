import type { PipelineDataset, PipelineInspectionConfig, SpatialReferenceCheckResult, QualityCheckResult } from './types.js';
export declare class SpatialReferenceChecker {
    check(dataset: PipelineDataset, config: PipelineInspectionConfig): {
        spatialReferenceResult: SpatialReferenceCheckResult;
        checkResults: QualityCheckResult[];
    };
}
//# sourceMappingURL=spatial-reference-checker.d.ts.map