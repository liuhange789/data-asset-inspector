import type { DiscoverabilityScore } from '../types/index.js';
export interface ScoringWeights {
    readonly keywords: number;
    readonly readmeInstall: number;
    readonly topicsDoubleHit: number;
    readonly marketListed: number;
    readonly aliasDisplay: number;
    readonly repoNameMatch: number;
}
export interface PackageDiagnosisInput {
    readonly packageName: string;
    readonly keywordsHit: boolean;
    readonly readmeInstallFormat: boolean;
    readonly topicsDoubleHit: boolean;
    readonly marketListed: boolean;
    readonly aliasDisplay: boolean;
    readonly repoNameMatch: boolean;
}
declare const DEFAULT_WEIGHTS: ScoringWeights;
export declare class ScoringCalculator {
    private readonly weights;
    constructor(weights?: ScoringWeights);
    static fromConfigFile(configPath: string): Promise<ScoringCalculator>;
    scorePackage(input: PackageDiagnosisInput): DiscoverabilityScore;
    scoreAll(packages: readonly PackageDiagnosisInput[]): readonly DiscoverabilityScore[];
    private scoreDimension;
}
export { DEFAULT_WEIGHTS };
//# sourceMappingURL=scoring-calculator.d.ts.map