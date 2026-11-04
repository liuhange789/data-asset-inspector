import type { PipelineDataset, PipelineInspectionConfig, TopologyCheckResult, QualityCheckResult } from './types.js';
export declare class TopologyChecker {
    check(dataset: PipelineDataset, config: PipelineInspectionConfig): {
        topologyResult: TopologyCheckResult;
        checkResults: QualityCheckResult[];
    };
}
//# sourceMappingURL=topology-checker.d.ts.map