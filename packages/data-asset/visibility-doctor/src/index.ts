import { NpmRegistryAdapter } from './adapters/npm-registry-adapter.js';
import { ProbeSimulatorAdapter } from './adapters/probe-simulator-adapter.js';
import { MarketStoreAdapter } from './adapters/market-store-adapter.js';
import { GitHubApiAdapter } from './adapters/github-api-adapter.js';
import { ScoringCalculator } from './domain/scoring-calculator.js';
import { DiagnoseEngine } from './domain/diagnose-engine.js';
import { RootCauseAnalyzer } from './domain/root-cause-analyzer.js';
import { ExposureBooster } from './domain/exposure-booster.js';
import { AdoptionVerifier, type VerifyOptions } from './domain/adoption-verifier.js';
import { ReportGenerator } from './generators/report-generator.js';
import { PatchGenerator } from './generators/patch-generator.js';
import { GuidanceGenerator } from './generators/guidance-generator.js';
import { runCli } from './cli/index.js';
import type {
  DiagnoseOptions,
  DiagnoseResult,
  RootCauseOptions,
  RootCauseResult,
  BoostOptions,
  BoostResult,
  VerifyResult,
} from './types/index.js';

export async function diagnose(options: DiagnoseOptions): Promise<DiagnoseResult> {
  const reportGen = new ReportGenerator(options.outputDir ?? './reports');
  const scoring = await ScoringCalculator.fromConfigFile(
    `${options.workspacePath}/config/scoring-weights.json`,
  );
  const engine = new DiagnoseEngine(
    new NpmRegistryAdapter(),
    new ProbeSimulatorAdapter(options.workspacePath),
    new MarketStoreAdapter(),
    new GitHubApiAdapter(),
    scoring,
    reportGen,
  );
  return engine.diagnose(options);
}

export async function analyzeRootCause(options: RootCauseOptions): Promise<RootCauseResult> {
  const reportGen = new ReportGenerator('./reports');
  const analyzer = new RootCauseAnalyzer(new GitHubApiAdapter(), reportGen);
  return analyzer.analyzeRootCause(options);
}

export async function boostExposure(options: BoostOptions): Promise<BoostResult> {
  const reportGen = new ReportGenerator(options.outputDir ?? './reports');
  const booster = new ExposureBooster(
    new NpmRegistryAdapter(),
    new GitHubApiAdapter(),
    reportGen,
  );
  return booster.boostExposure(options);
}

export async function verifyAdoption(options: VerifyOptions): Promise<VerifyResult> {
  const reportGen = new ReportGenerator(options.outputDir ?? './reports');
  const verifier = new AdoptionVerifier(
    new NpmRegistryAdapter(),
    new ProbeSimulatorAdapter(process.cwd()),
    new MarketStoreAdapter(),
    reportGen,
  );
  return verifier.verifyAdoption(options);
}

export {
  NpmRegistryAdapter,
  ProbeSimulatorAdapter,
  MarketStoreAdapter,
  GitHubApiAdapter,
  ScoringCalculator,
  DiagnoseEngine,
  RootCauseAnalyzer,
  ExposureBooster,
  AdoptionVerifier,
  ReportGenerator,
  PatchGenerator,
  GuidanceGenerator,
  runCli,
};

export * from './types/index.js';