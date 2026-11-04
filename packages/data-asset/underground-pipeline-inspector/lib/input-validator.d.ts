import type { PipelinePoint, PipelineSegment, Structure, PipelineDataset, ValidationError } from './types.js';
export declare class InputValidator {
    validatePoint(raw: unknown): {
        point: PipelinePoint | null;
        error: ValidationError | null;
    };
    validateSegment(raw: unknown): {
        segment: PipelineSegment | null;
        error: ValidationError | null;
    };
    validateStructure(raw: unknown): {
        structure: Structure | null;
        error: ValidationError | null;
    };
    validateDataset(raw: unknown): {
        dataset: PipelineDataset | null;
        errors: ValidationError[];
    };
}
//# sourceMappingURL=input-validator.d.ts.map