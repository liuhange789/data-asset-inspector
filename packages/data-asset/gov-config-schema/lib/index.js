import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
export const schema = JSON.parse(readFileSync(resolve(__dirname, '../config-pack-schema.json'), 'utf8'));
export function getSchema() {
    return schema;
}
export function getRequiredFields() {
    return schema.required ?? [];
}
export function getProperties() {
    return schema.properties ?? {};
}
export function validateConfigPack(pack) {
    const errors = [];
    const required = schema.required ?? [];
    for (const field of required) {
        if (!(field in pack)) {
            errors.push(`Missing required field: ${field}`);
        }
    }
    return { valid: errors.length === 0, errors };
}
export default schema;
//# sourceMappingURL=index.js.map