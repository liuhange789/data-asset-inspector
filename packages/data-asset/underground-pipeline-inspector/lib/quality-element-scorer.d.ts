import type { QualityCheckResult, QualityElementScore, QualityElementConfig } from './types.js';
export declare class QualityElementScorer {
    score(checkResults: QualityCheckResult[], config: QualityElementConfig): {
        scores: QualityElementScore[];
        totalScore: number;
    };
}
//# sourceMappingURL=quality-element-scorer.d.ts.map