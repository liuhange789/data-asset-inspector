import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
export class ProbeUnavailableError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ProbeUnavailableError';
    }
}
export class ProbeSimulatorAdapter {
    workspacePath;
    probeWindowSize;
    constructor(workspacePath, probeWindowSize) {
        this.workspacePath = workspacePath;
        const envSize = process.env.DSH_PROBE_WINDOW_SIZE;
        this.probeWindowSize = probeWindowSize ?? (envSize ? parseInt(envSize, 10) : 10);
    }
    async getProbeSnapshot() {
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
        }
        catch {
            return this.loadCachedSnapshot();
        }
    }
    markHitList(candidateOrdering, seriesPackages) {
        const windowSet = new Set(candidateOrdering.slice(0, this.probeWindowSize));
        const hitList = [];
        const truncatedPackages = [];
        for (const pkg of seriesPackages) {
            const hit = windowSet.has(pkg);
            hitList.push(hit);
            if (!hit) {
                truncatedPackages.push(pkg);
            }
        }
        return { hitList, truncatedPackages };
    }
    async loadCandidateOrdering() {
        const rootPkgPath = join(this.workspacePath, 'package.json');
        const rootPkgContent = await readFile(rootPkgPath, 'utf-8');
        const rootPkg = JSON.parse(rootPkgContent);
        const devDeps = rootPkg.devDependencies ?? {};
        const candidates = Object.keys(devDeps);
        const workspacePkgs = await this.loadWorkspacePackages();
        const allCandidates = [...candidates, ...workspacePkgs];
        return this.sortByProbeRule(allCandidates);
    }
    async loadWorkspacePackages() {
        try {
            const workspacePath = join(this.workspacePath, 'pnpm-workspace.yaml');
            await readFile(workspacePath, 'utf-8');
        }
        catch {
            return [];
        }
        const packages = [];
        const knownSeriesPrefix = '@liuhange/dsh-';
        const knownOfficialPrefix = '@deepseek-ai/';
        const rootPkgPath = join(this.workspacePath, 'package.json');
        const rootPkgContent = await readFile(rootPkgPath, 'utf-8');
        const rootPkg = JSON.parse(rootPkgContent);
        const devDeps = rootPkg.devDependencies ?? {};
        for (const dep of Object.keys(devDeps)) {
            if (dep.startsWith(knownSeriesPrefix) || dep.startsWith(knownOfficialPrefix)) {
                packages.push(dep);
            }
        }
        return packages;
    }
    sortByProbeRule(candidates) {
        return [...candidates].sort((a, b) => {
            const aOfficial = a.startsWith('@deepseek-ai/');
            const bOfficial = b.startsWith('@deepseek-ai/');
            if (aOfficial && !bOfficial)
                return -1;
            if (!aOfficial && bOfficial)
                return 1;
            return a.localeCompare(b);
        });
    }
    async loadCachedSnapshot() {
        try {
            const cachePath = join(this.workspacePath, 'reports', '.cache', 'probe-snapshot.json');
            const content = await readFile(cachePath, 'utf-8');
            const cached = JSON.parse(content);
            return { ...cached, isCached: true };
        }
        catch {
            throw new ProbeUnavailableError('Failed to load probe snapshot from workspace and no cache available');
        }
    }
}
//# sourceMappingURL=probe-simulator-adapter.js.map