export interface PolicyBasisItem {
    name: string;
    docNumber: string;
    coreRequirement: string;
}
export interface ConfigPack {
    configPackId: string;
    region: string;
    configPackVersion: string;
    policyBasis: PolicyBasisItem[];
    requiredFields: unknown;
    formatRules: unknown;
    localStandardTerms: unknown;
    logicErrorRules: unknown;
    scoringWeights: unknown;
    itemTypeMatching: unknown;
    severityMapping: unknown;
    gbtMapping: unknown;
    dataSourceCredentials: unknown;
    dataSourcePriority: unknown;
    [key: string]: unknown;
}
export declare const configPack: ConfigPack;
export declare const region: string;
export declare const configPackId: string;
export declare const configPackVersion: string;
export declare function getPolicyBasis(): PolicyBasisItem[];
export declare function getRequiredFields(): unknown;
export declare function getFormatRules(): unknown;
export declare function getScoringWeights(): unknown;
export declare function loadConfig(): ConfigPack;
export declare function validateConfig(pack: ConfigPack): {
    valid: boolean;
    errors: string[];
};
export default configPack;
//# sourceMappingURL=index.d.ts.map