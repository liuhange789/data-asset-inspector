export const name = '@liuhange/dsh-visibility-doctor'
export const inject = ['tools'] as const

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
export function apply(ctx: { tools: { register: (tool: unknown) => void } }) {
  ctx.tools.register({
    name: 'diagnose_visibility',
    description: 'DSH 插件曝光度诊断 — 检测插件在 npm/DSH Market 中的可发现性、安装可达性、文档完整度，输出曝光度评分与改进建议',
    parameters: {
      type: 'object',
      properties: {
        workspacePath: { type: 'string', description: '工作区路径（DSH 插件项目根目录）' },
        packageNames: { type: 'array', items: { type: 'string' }, description: '待诊断的 npm 包名列表' },
        repoFullName: { type: 'string', description: 'GitHub 仓库全名（owner/repo）' },
        outputDir: { type: 'string', description: '报告输出目录（默认 ./reports）' },
      },
      required: ['workspacePath', 'packageNames', 'repoFullName'],
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args: Record<string, unknown>, value: unknown) => [
        { type: 'text', text: JSON.stringify(value, null, 2) },
      ],
    },
    async execute(args: Record<string, unknown>) {
      try {
        const result = await diagnose({
          workspacePath: args.workspacePath as string,
          packageNames: args.packageNames as readonly string[],
          repoFullName: args.repoFullName as string,
          outputDir: (args.outputDir as string | undefined) ?? null,
        });
        return result;
      } catch (e) {
        return { error: 'VISIBILITY_DOCTOR_ERROR', message: (e as Error).message };
      }
    },
  });

  ctx.tools.register({
    name: 'boost_exposure',
    description: 'DSH 插件曝光度提升 — 自动生成 README 补丁、关键词优化建议、DSH Market 注册引导',
    parameters: {
      type: 'object',
      properties: {
        workspacePath: { type: 'string', description: '工作区路径' },
        packageNames: { type: 'array', items: { type: 'string' }, description: 'npm 包名列表' },
        repoFullName: { type: 'string', description: 'GitHub 仓库全名（owner/repo）' },
        outputDir: { type: 'string', description: '报告输出目录' },
      },
      required: ['workspacePath', 'packageNames', 'repoFullName'],
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args: Record<string, unknown>, value: unknown) => [
        { type: 'text', text: JSON.stringify(value, null, 2) },
      ],
    },
    async execute(args: Record<string, unknown>) {
      try {
        const result = await boostExposure({
          workspacePath: args.workspacePath as string,
          packageNames: args.packageNames as readonly string[],
          repoFullName: args.repoFullName as string,
          outputDir: (args.outputDir as string | undefined) ?? null,
        });
        return result;
      } catch (e) {
        return { error: 'BOOST_ERROR', message: (e as Error).message };
      }
    },
  });
}