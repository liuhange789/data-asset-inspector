export class MarketStoreAdapter {
    fetchFn;
    constructor(fetchOverride) {
        this.fetchFn = fetchOverride ?? globalThis.fetch;
    }
    async queryMarketStatus(repoFullName) {
        const detailPageUrl = `https://dsh-plugin.org/zh/plugins/${repoFullName}`;
        let res;
        try {
            res = await this.fetchFn(detailPageUrl);
        }
        catch {
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
    async queryAllPackagesMarketStatus(repoFullName, packageNames) {
        const repoStatus = await this.queryMarketStatus(repoFullName);
        return packageNames.map((packageName) => ({
            packageName,
            status: repoStatus.status,
            detailPageUrl: repoStatus.detailPageUrl,
            httpStatus: repoStatus.httpStatus,
        }));
    }
}
//# sourceMappingURL=market-store-adapter.js.map