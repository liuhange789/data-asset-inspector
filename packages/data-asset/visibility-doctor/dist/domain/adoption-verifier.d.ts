import type { VerifyResult, DownloadVerification, ProbeVerification, MarketVerification, InstallVerification } from '../types/index.js';
import type { INpmRegistryAdapter, IProbeSimulatorAdapter, IMarketStoreAdapter } from '../types/index.js';
import { ReportGenerator } from '../generators/report-generator.js';
export interface VerifyOptions {
    readonly packageNames: readonly string[];
    readonly repoFullName: string;
    readonly baseline?: number | undefined;
    readonly shortTermTarget?: number | undefined;
    readonly longTermTarget?: number | undefined;
    readonly outputDir?: string | null | undefined;
}
export declare class AdoptionVerifier {
    private readonly npmAdapter;
    private readonly probeAdapter;
    private readonly marketAdapter;
    private readonly reportGenerator;
    constructor(npmAdapter: INpmRegistryAdapter, probeAdapter: IProbeSimulatorAdapter, marketAdapter: IMarketStoreAdapter, reportGenerator: ReportGenerator);
    verifyAdoption(options: VerifyOptions): Promise<VerifyResult>;
    verifyDownloads(packageNames: readonly string[], baseline: number, shortTermTarget: number, longTermTarget: number): Promise<DownloadVerification>;
    verifyProbeHit(packageNames: readonly string[], probeAdapter: IProbeSimulatorAdapter): Promise<ProbeVerification>;
    verifyMarketListing(repoFullName: string, packageNames: readonly string[], marketAdapter: IMarketStoreAdapter): Promise<MarketVerification>;
    verifyInstallSuccess(packageNames: readonly string[]): Promise<InstallVerification>;
}
//# sourceMappingURL=adoption-verifier.d.ts.map