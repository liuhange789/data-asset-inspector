import type { INpmRegistryAdapter, PackageMeta } from '../types/adapter-interfaces.js';

export class NpmRateLimitError extends Error {
  constructor(
    message: string,
    public readonly failedPackages: readonly string[],
  ) {
    super(message);
    this.name = 'NpmRateLimitError';
  }
}

type FetchLike = typeof globalThis.fetch;

export class NpmRegistryAdapter implements INpmRegistryAdapter {
  private readonly fetchFn: FetchLike;

  constructor(fetchOverride?: FetchLike) {
    this.fetchFn = fetchOverride ?? globalThis.fetch;
  }

  async queryPackageMeta(packageName: string): Promise<PackageMeta> {
    const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
    const res = await this.fetchWithRetry(url);
    const data = (await res.json()) as Record<string, unknown>;
    return this.parsePackageMeta(packageName, data);
  }

  async queryWeeklyDownloads(packageName: string): Promise<number> {
    const url = `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(packageName)}`;
    const res = await this.fetchWithRetry(url);
    const data = (await res.json()) as { downloads?: number };
    return data.downloads ?? 0;
  }

  async queryDependentCount(packageName: string): Promise<number> {
    const url = `https://registry.npmjs.org/-/v1/search?text=dependencies:${encodeURIComponent(packageName)}&size=1`;
    const res = await this.fetchWithRetry(url);
    const data = (await res.json()) as { total?: number };
    return data.total ?? 0;
  }

  async batchQuery(packageNames: readonly string[]): Promise<readonly PackageMeta[]> {
    const failedPackages: string[] = [];
    const results: PackageMeta[] = [];

    for (const name of packageNames) {
      try {
        const meta = await this.queryPackageMeta(name);
        results.push(meta);
      } catch (err) {
        if (err instanceof NpmRateLimitError) {
          failedPackages.push(name);
        } else {
          throw err;
        }
      }
    }

    if (failedPackages.length > 0) {
      throw new NpmRateLimitError(
        `npm registry rate limit exhausted for ${failedPackages.length} packages`,
        failedPackages,
      );
    }

    return results;
  }

  private async fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
    let lastError: Error | null = null;
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

  private parsePackageMeta(name: string, data: Record<string, unknown>): PackageMeta {
    const latestVersion = this.getLatestVersion(data);
    const versionData = (data.versions as Record<string, Record<string, unknown>> | undefined)?.[latestVersion] ?? {};
    const distTags = data['dist-tags'] as Record<string, string> | undefined;

    return {
      name,
      version: distTags?.latest ?? latestVersion,
      keywords: this.parseStringArray(versionData.keywords),
      description: (versionData.description as string | undefined) ?? null,
      homepage: (versionData.homepage as string | undefined) ?? null,
      repositoryUrl: this.parseRepositoryUrl(versionData.repository),
      dependencies: this.parseDepRecord(versionData.dependencies),
      peerDependencies: this.parseDepRecord(versionData.peerDependencies),
    };
  }

  private getLatestVersion(data: Record<string, unknown>): string {
    const distTags = data['dist-tags'] as Record<string, string> | undefined;
    return distTags?.latest ?? '';
  }

  private parseStringArray(value: unknown): readonly string[] {
    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === 'string');
    }
    return [];
  }

  private parseRepositoryUrl(value: unknown): string | null {
    if (typeof value === 'string') return value;
    if (value !== null && typeof value === 'object' && 'url' in value) {
      const url = (value as { url: unknown }).url;
      if (typeof url === 'string') return url;
    }
    return null;
  }

  private parseDepRecord(value: unknown): readonly { readonly name: string; readonly version: string }[] {
    if (value === null || typeof value !== 'object') return [];
    const entries = Object.entries(value as Record<string, unknown>);
    return entries
      .filter(([, v]) => typeof v === 'string')
      .map(([name, version]) => ({ name, version: version as string }));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}