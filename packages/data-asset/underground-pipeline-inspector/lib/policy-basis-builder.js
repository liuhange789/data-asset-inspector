import { STANDARDS } from './invariant.js';
const POLICY_PREFIX = '依据：';
export class PolicyBasisBuilder {
    build(standardFullName, standardNumber, clause) {
        return `${POLICY_PREFIX}《${standardFullName}》（${standardNumber}）${clause}`;
    }
    buildByKey(standardKey, clause) {
        const standard = STANDARDS[standardKey];
        return this.build(standard.fullName, standard.number, clause);
    }
    buildSummary(policyBasisList) {
        const uniqueSet = new Set();
        for (const basis of policyBasisList) {
            uniqueSet.add(basis);
        }
        return Array.from(uniqueSet);
    }
    extractClauses(policyBasisList) {
        const clauses = new Set();
        for (const basis of policyBasisList) {
            if (basis.startsWith(POLICY_PREFIX)) {
                const afterPrefix = basis.slice(POLICY_PREFIX.length);
                const closingParenIndex = afterPrefix.indexOf('）');
                if (closingParenIndex !== -1 && closingParenIndex + 1 < afterPrefix.length) {
                    const clause = afterPrefix.slice(closingParenIndex + 1);
                    clauses.add(clause);
                }
            }
        }
        return Array.from(clauses);
    }
}
//# sourceMappingURL=policy-basis-builder.js.map