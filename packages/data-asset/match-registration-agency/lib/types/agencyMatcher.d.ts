import type { AgencyMatchResult } from '@liuhange/dsh-data-asset-shared';
export declare class AgencyMatcher {
    private config;
    private configPath;
    constructor(configPath?: string);
    private loadConfig;
    match(dataType: string): AgencyMatchResult;
}
//# sourceMappingURL=agencyMatcher.d.ts.map