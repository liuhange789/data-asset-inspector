import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
export const configPack = JSON.parse(readFileSync(resolve(__dirname, '../config-pack.json'), 'utf8'));
export const region = configPack.region;
export const configPackId = configPack.configPackId;
export const configPackVersion = configPack.configPackVersion;
export function getPolicyBasis() {
    return configPack.policyBasis;
}
export function getRequiredFields() {
    return configPack.requiredFields;
}
export function getFormatRules() {
    return configPack.formatRules;
}
export function getScoringWeights() {
    return configPack.scoringWeights;
}
export function loadConfig() {
    return configPack;
}
export function validateConfig(pack) {
    const errors = [];
    if (!pack.configPackId || typeof pack.configPackId !== 'string') {
        errors.push('configPackId must be a non-empty string');
    }
    if (!pack.region || typeof pack.region !== 'string') {
        errors.push('region must be a non-empty string');
    }
    if (!pack.configPackVersion || typeof pack.configPackVersion !== 'string') {
        errors.push('configPackVersion must be a non-empty string');
    }
    if (!Array.isArray(pack.policyBasis)) {
        errors.push('policyBasis must be an array');
    }
    return { valid: errors.length === 0, errors };
}
export default configPack;
//# sourceMappingURL=index.js.map