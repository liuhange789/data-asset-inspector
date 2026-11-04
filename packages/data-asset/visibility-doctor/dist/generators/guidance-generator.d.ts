import type { RootCause, BugFixItem } from '../types/index.js';
export declare class GuidanceGenerator {
    generateBugFixList(rootCauses: readonly RootCause[]): readonly BugFixItem[];
    private createFixItem;
    private getLayerSpecific;
    private generateIssueTemplate;
}
//# sourceMappingURL=guidance-generator.d.ts.map