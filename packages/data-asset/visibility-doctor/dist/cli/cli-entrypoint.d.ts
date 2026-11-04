export interface ParsedCliArgs {
    readonly subcommand: 'diagnose' | 'analyze' | 'boost' | 'verify';
    readonly packages: readonly string[];
    readonly workspace: string;
    readonly output: string;
    readonly issue: string | null;
    readonly baseline: number | null;
    readonly target: number | null;
    readonly dryRun: boolean;
    readonly format: 'json' | 'md' | 'both';
    readonly repo: string;
    readonly diagnoseReportPath: string | null;
}
export declare class CliEntrypoint {
    parse(args: readonly string[]): ParsedCliArgs;
}
//# sourceMappingURL=cli-entrypoint.d.ts.map