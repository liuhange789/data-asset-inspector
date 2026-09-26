import type { IMarketStoreAdapter, MarketStatus } from '../types/index.js';

type FetchLike = typeof globalThis.fetch;

interface MarketQueryResult {
  readonly status: MarketStatus;
  readonly detailPageUrl: string;
  readonly httpStatus: number;
}

export class MarketStoreAdapter implements IMarketStoreAdapter {
  private readonly fetchFn: FetchLike;

  constructor(fetchOverride?: FetchLike) {
    this.fetchFn = fetchOverride ?? globalThis.fetch;
  }

  async queryMarketStatus(repoFullName: string): Promise<MarketQueryResult> {
    const detailPageUrl = `https://dsh-plugin.org/zh/plugins/${repoFullName}`;
    let res: Response;
    try {
      res = await this.fetchFn(detailPageUrl);
    } catch {
      return { status: 'NOT_SCANNED', detailPageUrl, httpStatus: 0 };
    }

    if (res.status === 404) {
      return { status: 'NOT_SCANNED', detailPageUrl, httpStatus: 404 };
    }
    if (res.status === 403) {
      return { status: 'REJECTED', detailPageUrl, httpStatus: 403 };
    }
    if (!res.ok) {
      return { status: 'NOT_SCANNED', detailPageUrl, httpStatus: res.status };
    }

    const body = await res.text();
    if (body.includes('拒收') || body.includes('rejected')) {
      return { status: 'REJECTED', detailPageUrl, httpStatus: res.status };
    }
    if (body.includes('建档中') || body.includes('pending')) {
      return { status: 'PENDING', detailPageUrl, httpStatus: res.status };
    }
    if (body.includes('npm') || body.includes('install') || body.includes('dsh plugin')) {
      return { status: 'LISTED', detailPageUrl, httpStatus: res.status };
    }

    return { status: 'PENDING', detailPageUrl, httpStatus: res.status };
  }

  async queryAllPackagesMarketStatus(
    repoFullName: string,
    packageNames: readonly string[],
  ): Promise<readonly { readonly packageName: string; readonly status: MarketStatus; readonly detailPageUrl: string; readonly httpStatus: number }[]> {
    const repoStatus = await this.queryMarketStatus(repoFullName);
    return packageNames.map((packageName) => ({
      packageName,
      status: repoStatus.status,
      detailPageUrl: repoStatus.detailPageUrl,
      httpStatus: repoStatus.httpStatus,
    }));
  }
}