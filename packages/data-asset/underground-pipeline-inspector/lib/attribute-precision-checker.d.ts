import type { PipelineDataset, PipelineAttributeConfig, AttributePrecisionCheckResult, QualityCheckResult } from './types.js';
export declare class AttributePrecisionChecker {
    check(dataset: PipelineDataset, config: PipelineAttributeConfig): {
        attributeResult: AttributePrecisionCheckResult;
        checkResults: QualityCheckResult[];
    };
    private checkFieldLength;
}
//# sourceMappingURL=attribute-precision-checker.d.ts.map