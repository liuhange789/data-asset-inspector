import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { IProbeSimulatorAdapter, ProbeSnapshot } from '../types/index.js';

export class ProbeUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProbeUnavailableError';
  }
}

export class ProbeSimulatorAdapter implements IProbeSimulatorAdapter {
  private readonly workspacePath: string;
  private readonly probeWindowSize: number;

  constructor(workspacePath: string, probeWindowSize?: number) {
    this.workspacePath = workspacePath;
    const envSize = process.env.DSH_PROBE_WINDOW_SIZE;
    this.probeWindowSize = probeWindowSize ?? (envSize ? parseInt(envSize, 10) : 10);
  }

  async getProbeSnapshot(): Promise<ProbeSnapshot> {
    try {
      const candidates = await this.loadCandidateOrdering();
      const windowPackages = candidates.slice(0, this.probeWindowSize);
      return {
        candidateOrdering: candidates,
        windowSize: this.probeWindowSize,
        windowPackages,
        isCached: false,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return this.loadCachedSnapshot();
    }
  }

  markHitList(
    candidateOrdering: readonly string[],
    seriesPackages: readonly string[],
  ): { readonly hitList: readonly boolean[]; readonly truncatedPackages: readonly string[] } {
    const windowSet = new Set(candidateOrdering.slice(0, this.probeWindowSize));
    const hitList: boolean[] = [];
    const truncatedPackages: string[] = [];

    for (const pkg of seriesPackages) {
      const hit = windowSet.has(pkg);
      hitList.push(hit);
      if (!hit) {
        truncatedPackages.push(pkg);
      }
    }

    return { hitList, truncatedPackages };
  }

  private async loadCandidateOrdering(): Promise<readonly string[]> {
    const rootPkgPath = join(this.workspacePath, 'package.json');
    const rootPkgContent = await readFile(rootPkgPath, 'utf-8');
    const rootPkg = JSON.parse(rootPkgContent) as Record<string, unknown>;

    const devDeps = (rootPkg.devDependencies as Record<string, string> | undefined) ?? {};
    const candidates = Object.keys(devDeps);

    const workspacePkgs = await this.loadWorkspacePackages();
    const allCandidates = [...candidates, ...workspacePkgs];

    return this.sortByProbeRule(allCandidates);
  }

  private async loadWorkspacePackages(): Promise<readonly string[]> {
    try {
      const workspacePath = join(this.workspacePath, 'pnpm-workspace.yaml');
      await readFile(workspacePath, 'utf-8');
    } catch {
      return [];
    }

    const packages: string[] = [];
    const knownSeriesPrefix = '@liuhange/dsh-';
    const knownOfficialPrefix = '@deepseek-ai/';

    const rootPkgPath = join(this.workspacePath, 'package.json');
    const rootPkgContent = await readFile(rootPkgPath, 'utf-8');
    const rootPkg = JSON.parse(rootPkgContent) as Record<string, unknown>;
    const devDeps = (rootPkg.devDependencies as Record<string, string> | undefined) ?? {};

    for (const dep of Object.keys(devDeps)) {
      if (dep.startsWith(knownSeriesPrefix) || dep.startsWith(knownOfficialPrefix)) {
        packages.push(dep);
      }
    }

    return packages;
  }

  private sortByProbeRule(candidates: readonly string[]): readonly string[] {
    return [...candidates].sort((a, b) => {
      const aOfficial = a.startsWith('@deepseek-ai/');
      const bOfficial = b.startsWith('@deepseek-ai/');
      if (aOfficial && !bOfficial) return -1;
      if (!aOfficial && bOfficial) return 1;
      return a.localeCompare(b);
    });
  }

  private async loadCachedSnapshot(): Promise<ProbeSnapshot> {
    try {
      const cachePath = join(this.workspacePath, 'reports', '.cache', 'probe-snapshot.json');
      const content = await readFile(cachePath, 'utf-8');
      const cached = JSON.parse(content) as ProbeSnapshot;
      return { ...cached, isCached: true };
    } catch {
      throw new ProbeUnavailableError(
        'Failed to load probe snapshot from workspace and no cache available',
      );
    }
  }
}