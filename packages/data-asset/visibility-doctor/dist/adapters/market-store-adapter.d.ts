import type { IMarketStoreAdapter, MarketStatus } from '../types/index.js';
type FetchLike = typeof globalThis.fetch;
interface MarketQueryResult {
    readonly status: MarketStatus;
    readonly detailPageUrl: string;
    readonly httpStatus: number;
}
export declare class MarketStoreAdapter implements IMarketStoreAdapter {
    private readonly fetchFn;
    constructor(fetchOverride?: FetchLike);
    queryMarketStatus(repoFullName: string): Promise<MarketQueryResult>;
    queryAllPackagesMarketStatus(repoFullName: string, packageNames: readonly string[]): Promise<readonly {
        readonly packageName: string;
        readonly status: MarketStatus;
        readonly detailPageUrl: string;
        readonly httpStatus: number;
    }[]>;
}
export {};
//# sourceMappingURL=market-store-adapter.d.ts.map