import type { IProbeSimulatorAdapter, ProbeSnapshot } from '../types/index.js';
export declare class ProbeUnavailableError extends Error {
    constructor(message: string);
}
export declare class ProbeSimulatorAdapter implements IProbeSimulatorAdapter {
    private readonly workspacePath;
    private readonly probeWindowSize;
    constructor(workspacePath: string, probeWindowSize?: number);
    getProbeSnapshot(): Promise<ProbeSnapshot>;
    markHitList(candidateOrdering: readonly string[], seriesPackages: readonly string[]): {
        readonly hitList: readonly boolean[];
        readonly truncatedPackages: readonly string[];
    };
    private loadCandidateOrdering;
    private loadWorkspacePackages;
    private sortByProbeRule;
    private loadCachedSnapshot;
}
//# sourceMappingURL=probe-simulator-adapter.d.ts.map