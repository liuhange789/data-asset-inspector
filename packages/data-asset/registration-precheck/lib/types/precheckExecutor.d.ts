import type { OrchestrationResult, PrecheckReport } from '@liuhange/dsh-data-asset-shared';
export declare class PrecheckExecutor {
    execute(orchestrationResult: OrchestrationResult, ownershipConfirmation: {
        hasDispute: boolean;
        confirmedAt: string;
    }): PrecheckReport;
    private validateInputs;
    private checkNationalSecurity;
    private checkSourceCompliance;
    private checkOwnershipDispute;
    private checkMaterialAuthenticity;
    private determineConclusion;
    private getPolicyRefs;
}
//# sourceMappingURL=precheckExecutor.d.ts.map