export class NpmRateLimitError extends Error {
    failedPackages;
    constructor(message, failedPackages) {
        super(message);
        this.failedPackages = failedPackages;
        this.name = 'NpmRateLimitError';
    }
}
export class NpmRegistryAdapter {
    fetchFn;
    constructor(fetchOverride) {
        this.fetchFn = fetchOverride ?? globalThis.fetch;
    }
    async queryPackageMeta(packageName) {
        const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
        const res = await this.fetchWithRetry(url);
        const data = (await res.json());
        return this.parsePackageMeta(packageName, data);
    }
    async queryWeeklyDownloads(packageName) {
        const url = `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(packageName)}`;
        const res = await this.fetchWithRetry(url);
        const data = (await res.json());
        return data.downloads ?? 0;
    }
    async queryDependentCount(packageName) {
        const url = `https://registry.npmjs.org/-/v1/search?text=dependencies:${encodeURIComponent(packageName)}&size=1`;
        const res = await this.fetchWithRetry(url);
        const data = (await res.json());
        return data.total ?? 0;
    }
    async batchQuery(packageNames) {
        const failedPackages = [];
        const results = [];
        for (const name of packageNames) {
            try {
                const meta = await this.queryPackageMeta(name);
                results.push(meta);
            }
            catch (err) {
                if (err instanceof NpmRateLimitError) {
                    failedPackages.push(name);
                }
                else {
                    throw err;
                }
            }
        }
        if (failedPackages.length > 0) {
            throw new NpmRateLimitError(`npm registry rate limit exhausted for ${failedPackages.length} packages`, failedPackages);
        }
        return results;
    }
    async fetchWithRetry(url, maxRetries = 3) {
        let lastError = null;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const res = await this.fetchFn(url);
            if (res.status === 429) {
                const delayMs = 1000 * Math.pow(2, attempt);
                await this.sleep(delayMs);
                lastError = new NpmRateLimitError(`Rate limited (429) at attempt ${attempt + 1}`, []);
                continue;
            }
            if (!res.ok) {
                throw new Error(`npm registry request failed: ${res.status} for ${url}`);
            }
            return res;
        }
        throw lastError ?? new Error(`npm registry request failed after ${maxRetries} retries: ${url}`);
    }
    parsePackageMeta(name, data) {
        const latestVersion = this.getLatestVersion(data);
        const versionData = data.versions?.[latestVersion] ?? {};
        const distTags = data['dist-tags'];
        return {
            name,
            version: distTags?.latest ?? latestVersion,
            keywords: this.parseStringArray(versionData.keywords),
            description: versionData.description ?? null,
            homepage: versionData.homepage ?? null,
            repositoryUrl: this.parseRepositoryUrl(versionData.repository),
            dependencies: this.parseDepRecord(versionData.dependencies),
            peerDependencies: this.parseDepRecord(versionData.peerDependencies),
        };
    }
    getLatestVersion(data) {
        const distTags = data['dist-tags'];
        return distTags?.latest ?? '';
    }
    parseStringArray(value) {
        if (Array.isArray(value)) {
            return value.filter((v) => typeof v === 'string');
        }
        return [];
    }
    parseRepositoryUrl(value) {
        if (typeof value === 'string')
            return value;
        if (value !== null && typeof value === 'object' && 'url' in value) {
            const url = value.url;
            if (typeof url === 'string')
                return url;
        }
        return null;
    }
    parseDepRecord(value) {
        if (value === null || typeof value !== 'object')
            return [];
        const entries = Object.entries(value);
        return entries
            .filter(([, v]) => typeof v === 'string')
            .map(([name, version]) => ({ name, version: version }));
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
//# sourceMappingURL=npm-registry-adapter.js.map