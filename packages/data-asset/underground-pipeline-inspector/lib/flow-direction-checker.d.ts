import type { PipelineDataset, PipelineAttributeConfig, FlowDirectionCheckResult, QualityCheckResult } from './types.js';
export declare class FlowDirectionChecker {
    check(dataset: PipelineDataset, config: PipelineAttributeConfig): {
        flowDirectionResult: FlowDirectionCheckResult;
        checkResults: QualityCheckResult[];
    };
}
//# sourceMappingURL=flow-direction-checker.d.ts.map