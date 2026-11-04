import type { ReviewOverrideRecord } from './types.js';
import type { ErrorCode } from './invariant.js';
export declare class ReviewOverrideRecorder {
    private readonly logFilePath;
    constructor(logFilePath?: string);
    record(record: ReviewOverrideRecord): void;
    delete(): {
        error: ErrorCode;
        message: string;
    };
    readAll(): ReviewOverrideRecord[];
    validateOverrideInstruction(objectId: string, overrideConclusion: string, overrideReason: string, existingObjectIds: Set<string>): {
        valid: boolean;
        error: ErrorCode | null;
        message: string | null;
    };
}
//# sourceMappingURL=review-override-recorder.d.ts.map