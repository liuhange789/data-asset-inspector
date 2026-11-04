import { appendFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { ERROR_CODES, OVERRIDE_RECORD_FILE, OVERRIDE_CONCLUSIONS } from './invariant.js';
export class ReviewOverrideRecorder {
    logFilePath;
    constructor(logFilePath) {
        this.logFilePath = logFilePath ?? resolve(process.cwd(), OVERRIDE_RECORD_FILE);
    }
    record(record) {
        const dir = dirname(this.logFilePath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        const line = JSON.stringify(record) + '\n';
        appendFileSync(this.logFilePath, line, 'utf-8');
    }
    delete() {
        return {
            error: ERROR_CODES.OVERWRITE_RECORD_IMMUTABLE,
            message: '人工复核覆盖记录不可删除，仅允许追加新的覆盖记录',
        };
    }
    readAll() {
        if (!existsSync(this.logFilePath)) {
            return [];
        }
        const content = readFileSync(this.logFilePath, 'utf-8');
        const lines = content.split('\n').filter((line) => line.trim().length > 0);
        const records = [];
        for (const line of lines) {
            try {
                const parsed = JSON.parse(line);
                records.push(parsed);
            }
            catch {
                continue;
            }
        }
        return records;
    }
    validateOverrideInstruction(objectId, overrideConclusion, overrideReason, existingObjectIds) {
        if (!existingObjectIds.has(objectId)) {
            return {
                valid: false,
                error: ERROR_CODES.OBJECT_NOT_FOUND,
                message: `对象标识 ${objectId} 在巡检结果中不存在`,
            };
        }
        if (!overrideReason || overrideReason.trim().length === 0) {
            return {
                valid: false,
                error: ERROR_CODES.REASON_REQUIRED,
                message: '覆盖理由不可为空',
            };
        }
        if (!OVERRIDE_CONCLUSIONS.includes(overrideConclusion)) {
            return {
                valid: false,
                error: ERROR_CODES.INVALID_OVERRIDE_CONCLUSION,
                message: `覆盖结论不合法，须为 ${OVERRIDE_CONCLUSIONS.join('/')}`,
            };
        }
        return { valid: true, error: null, message: null };
    }
}
//# sourceMappingURL=review-override-recorder.js.map