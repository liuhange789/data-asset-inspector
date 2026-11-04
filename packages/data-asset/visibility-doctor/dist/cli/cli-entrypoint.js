import { parseArgs } from 'node:util';
const DEFAULT_PACKAGES = [
    '@liuhange/dsh-data-asset-shared',
    '@liuhange/dsh-data-asset-orchestration',
    '@liuhange/dsh-data-asset-inventory-scan',
    '@liuhange/dsh-data-asset-quality-score',
    '@liuhange/dsh-data-asset-valuation',
    '@liuhange/dsh-data-asset-compliance-check',
    '@liuhange/dsh-data-asset-registration-helper',
    '@liuhange/dsh-data-cleaning',
    '@liuhange/dsh-data-inventory',
    '@liuhange/dsh-data-lineage',
    '@liuhange/dsh-data-masking',
    '@liuhange/dsh-data-packaging',
    '@liuhange/dsh-data-quality-scoring',
    '@liuhange/dsh-data-sensitivity-classification',
];
const DEFAULT_REPO = 'liuhange789/data-asset-inspector';
export class CliEntrypoint {
    parse(args) {
        const subcommand = args[0];
        if (!subcommand || !['diagnose', 'analyze', 'boost', 'verify'].includes(subcommand)) {
            throw new Error(`Unknown subcommand: ${subcommand}. Expected: diagnose|analyze|boost|verify`);
        }
        const { values } = parseArgs({
            args: args.slice(1),
            options: {
                packages: { type: 'string' },
                workspace: { type: 'string', default: process.cwd() },
                output: { type: 'string', default: './reports' },
                issue: { type: 'string' },
                baseline: { type: 'string' },
                target: { type: 'string' },
                'dry-run': { type: 'boolean', default: true },
                format: { type: 'string', default: 'both' },
                repo: { type: 'string', default: DEFAULT_REPO },
                'diagnose-report': { type: 'string' },
            },
            strict: false,
            allowPositionals: true,
        });
        const packagesStr = values.packages;
        const packages = packagesStr ? packagesStr.split(',').map((s) => s.trim()) : DEFAULT_PACKAGES;
        return {
            subcommand,
            packages,
            workspace: values.workspace ?? process.cwd(),
            output: values.output ?? './reports',
            issue: values.issue ?? null,
            baseline: values.baseline ? parseInt(values.baseline, 10) : null,
            target: values.target ? parseInt(values.target, 10) : null,
            dryRun: values['dry-run'] ?? true,
            format: (values.format ?? 'both'),
            repo: values.repo ?? DEFAULT_REPO,
            diagnoseReportPath: values['diagnose-report'] ?? null,
        };
    }
}
//# sourceMappingURL=cli-entrypoint.js.map