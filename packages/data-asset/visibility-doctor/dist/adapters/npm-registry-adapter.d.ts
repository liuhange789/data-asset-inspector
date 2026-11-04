import type { INpmRegistryAdapter, PackageMeta } from '../types/adapter-interfaces.js';
export declare class NpmRateLimitError extends Error {
    readonly failedPackages: readonly string[];
    constructor(message: string, failedPackages: readonly string[]);
}
type FetchLike = typeof globalThis.fetch;
export declare class NpmRegistryAdapter implements INpmRegistryAdapter {
    private readonly fetchFn;
    constructor(fetchOverride?: FetchLike);
    queryPackageMeta(packageName: string): Promise<PackageMeta>;
    queryWeeklyDownloads(packageName: string): Promise<number>;
    queryDependentCount(packageName: string): Promise<number>;
    batchQuery(packageNames: readonly string[]): Promise<readonly PackageMeta[]>;
    private fetchWithRetry;
    private parsePackageMeta;
    private getLatestVersion;
    private parseStringArray;
    private parseRepositoryUrl;
    private parseDepRecord;
    private sleep;
}
export {};
//# sourceMappingURL=npm-registry-adapter.d.ts.map