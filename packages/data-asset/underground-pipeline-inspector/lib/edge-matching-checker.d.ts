import type { PipelinePoint, PipelineInspectionConfig, EdgeMatchingResult, QualityCheckResult } from './types.js';
export declare class EdgeMatchingChecker {
    check(points: PipelinePoint[], config: PipelineInspectionConfig): {
        edgeMatchingResult: EdgeMatchingResult;
        checkResults: QualityCheckResult[];
    };
    private calculateDistance;
}
//# sourceMappingURL=edge-matching-checker.d.ts.map