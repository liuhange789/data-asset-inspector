import type { PackagePatch, PackageMeta, KeywordsGapResult } from '../types/index.js';
export declare class PatchGenerator {
    generatePackagePatch(packageName: string, currentMeta: PackageMeta, gapResult: KeywordsGapResult): PackagePatch;
    generateAllPatches(packages: readonly PackageMeta[]): readonly PackagePatch[];
    private enhanceDescription;
    private getAliasName;
    private getMissingKeywords;
}
//# sourceMappingURL=patch-generator.d.ts.map