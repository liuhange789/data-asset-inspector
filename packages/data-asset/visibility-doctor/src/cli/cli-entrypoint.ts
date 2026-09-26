import { parseArgs } from 'node:util';

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

const DEFAULT_PACKAGES: readonly string[] = [
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
  parse(args: readonly string[]): ParsedCliArgs {
    const subcommand = args[0] as ParsedCliArgs['subcommand'];
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

    const packagesStr = values.packages as string | undefined;
    const packages = packagesStr ? packagesStr.split(',').map((s) => s.trim()) : DEFAULT_PACKAGES;

    return {
      subcommand,
      packages,
      workspace: (values.workspace as string) ?? process.cwd(),
      output: (values.output as string) ?? './reports',
      issue: (values.issue as string | undefined) ?? null,
      baseline: values.baseline ? parseInt(values.baseline as string, 10) : null,
      target: values.target ? parseInt(values.target as string, 10) : null,
      dryRun: (values['dry-run'] as boolean) ?? true,
      format: ((values.format as string) ?? 'both') as 'json' | 'md' | 'both',
      repo: (values.repo as string) ?? DEFAULT_REPO,
      diagnoseReportPath: (values['diagnose-report'] as string | undefined) ?? null,
    };
  }
}