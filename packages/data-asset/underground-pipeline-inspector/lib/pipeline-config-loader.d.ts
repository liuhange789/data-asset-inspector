import type { ConfigLoadResult } from './types.js';
export declare class PipelineConfigLoader {
    private readonly configPath;
    constructor(configPath?: string);
    load(): ConfigLoadResult;
    private resolvePath;
    private loadSingleConfig;
    private validateConfig;
    private checkRequiredFields;
}
//# sourceMappingURL=pipeline-config-loader.d.ts.map