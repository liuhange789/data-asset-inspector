import { join } from 'node:path';
import type { ParsedCliArgs } from './cli-entrypoint.js';
import { NpmRegistryAdapter } from '../adapters/npm-registry-adapter.js';
import { ProbeSimulatorAdapter } from '../adapters/probe-simulator-adapter.js';
import { MarketStoreAdapter } from '../adapters/market-store-adapter.js';
import { GitHubApiAdapter } from '../adapters/github-api-adapter.js';
import { ScoringCalculator } from '../domain/scoring-calculator.js';
import { DiagnoseEngine } from '../domain/diagnose-engine.js';
import { RootCauseAnalyzer } from '../domain/root-cause-analyzer.js';
import { ExposureBooster } from '../domain/exposure-booster.js';
import { AdoptionVerifier, type VerifyOptions } from '../domain/adoption-verifier.js';
import { ReportGenerator } from '../generators/report-generator.js';

export class CommandRouter {
  async route(args: ParsedCliArgs): Promise<void> {
    switch (args.subcommand) {
      case 'diagnose':
        await this.runDiagnose(args);
        break;
      case 'analyze':
        await this.runAnalyze(args);
        break;
      case 'boost':
        await this.runBoost(args);
        break;
      case 'verify':
        await this.runVerify(args);
        break;
    }
  }

  private async runDiagnose(args: ParsedCliArgs): Promise<void> {
    const reportGen = new ReportGenerator(args.output);
    const scoringWeights = await ScoringCalculator.fromConfigFile(
      join(args.workspace, 'config', 'scoring-weights.json'),
    );
    const engine = new DiagnoseEngine(
      new NpmRegistryAdapter(),
      new ProbeSimulatorAdapter(args.workspace),
      new MarketStoreAdapter(),
      new GitHubApiAdapter(),
      scoringWeights,
      reportGen,
    );

    const result = await engine.diagnose({
      workspacePath: args.workspace,
      packageNames: args.packages,
      repoFullName: args.repo,
      issueRef: args.issue,
      outputDir: args.output,
      format: args.format,
    });

    console.log(`Diagnosis complete: ${result.packages.length} packages scored in ${result.durationMs}ms`);
    console.log(`Truncated packages: ${result.truncatedPackages.length}`);
  }

  private async runAnalyze(args: ParsedCliArgs): Promise<void> {
    const reportGen = new ReportGenerator(args.output);
    const analyzer = new RootCauseAnalyzer(
      new GitHubApiAdapter(),
      reportGen,
    );

    const reportPath = args.diagnoseReportPath ?? this.findLatestReport(args.output, 'diagnose');
    if (!reportPath) {
      throw new Error('No diagnose report found. Run "diagnose" first or specify --diagnose-report');
    }

    const issueRef = args.issue ?? 'dshplugin/dsh-plugin-hub#52';
    const result = await analyzer.analyzeRootCause({
      diagnoseReportPath: reportPath,
      issueRef,
      repoFullName: args.repo,
    });

    console.log(`Analysis complete: ${result.rootCauses.length} root causes, ${result.bugFixList.length} fix items`);
  }

  private async runBoost(args: ParsedCliArgs): Promise<void> {
    const reportGen = new ReportGenerator(args.output);
    const booster = new ExposureBooster(
      new NpmRegistryAdapter(),
      new GitHubApiAdapter(),
      reportGen,
    );

    const result = await booster.boostExposure({
      workspacePath: args.workspace,
      packageNames: args.packages,
      repoFullName: args.repo,
      dryRun: args.dryRun,
      outputDir: args.output,
    });

    console.log(`Boost complete: ${result.patches.length} patches generated (dryRun=${args.dryRun})`);
    if (!result.topicsGuidance.hasDoubleHit) {
      console.log(`Missing topics: ${result.topicsGuidance.missingTopics.join(', ')}`);
      console.log(result.topicsGuidance.manualSteps.join('\n'));
    }
  }

  private async runVerify(args: ParsedCliArgs): Promise<void> {
    const reportGen = new ReportGenerator(args.output);
    const verifier = new AdoptionVerifier(
      new NpmRegistryAdapter(),
      new ProbeSimulatorAdapter(args.workspace),
      new MarketStoreAdapter(),
      reportGen,
    );

    const verifyOpts: VerifyOptions = {
      packageNames: args.packages,
      repoFullName: args.repo,
      baseline: args.baseline ?? undefined,
      shortTermTarget: args.target ?? undefined,
    };

    const result = await verifier.verifyAdoption(verifyOpts);

    console.log(`Verification complete: overallPassed=${result.overallPassed}`);
    console.log(`  Downloads: ${result.downloads.currentWeekly} (target: ${result.downloads.shortTermTarget})`);
    console.log(`  Probe hit: ${result.probe.hitCount}/${result.probe.totalCount}`);
    console.log(`  Market listed: ${result.market.allListed}`);
    console.log(`  Install success: ${(result.install.successRate * 100).toFixed(1)}%`);
  }

  private findLatestReport(outputDir: string, command: string): string | null {
    return join(outputDir, `${command}-report-latest.json`);
  }
}