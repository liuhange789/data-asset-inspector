import type { StandardKey } from './invariant.js';
export declare class PolicyBasisBuilder {
    build(standardFullName: string, standardNumber: string, clause: string): string;
    buildByKey(standardKey: StandardKey, clause: string): string;
    buildSummary(policyBasisList: string[]): string[];
    extractClauses(policyBasisList: string[]): string[];
}
//# sourceMappingURL=policy-basis-builder.d.ts.map