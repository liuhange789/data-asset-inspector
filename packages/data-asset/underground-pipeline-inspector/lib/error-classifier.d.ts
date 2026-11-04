import type { QualityCheckResult, ErrorClassStatistics } from './types.js';
export declare class ErrorClassifier {
    classify(checkResults: QualityCheckResult[], policyBasis: string): ErrorClassStatistics;
    calculateProportions(stats: ErrorClassStatistics): {
        classAProportion: number;
        classBProportion: number;
        classCProportion: number;
        classDProportion: number;
    };
}
//# sourceMappingURL=error-classifier.d.ts.map