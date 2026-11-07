export const name = '@liuhange/dsh-visibility-doctor';
export const inject = ['tools'];
import { NpmRegistryAdapter } from './adapters/npm-registry-adapter.js';
import { ProbeSimulatorAdapter } from './adapters/probe-simulator-adapter.js';
import { MarketStoreAdapter } from './adapters/market-store-adapter.js';
import { GitHubApiAdapter } from './adapters/github-api-adapter.js';
import { ScoringCalculator } from './domain/scoring-calculator.js';
import { DiagnoseEngine } from './domain/diagnose-engine.js';
import { RootCauseAnalyzer } from './domain/root-cause-analyzer.js';
import { ExposureBooster } from './domain/exposure-booster.js';
import { AdoptionVerifier } from './domain/adoption-verifier.js';
import { ReportGenerator } from './generators/report-generator.js';
import { PatchGenerator } from './generators/patch-generator.js';
import { GuidanceGenerator } from './generators/guidance-generator.js';
import { runCli } from './cli/index.js';
export async function diagnose(options) {
    const reportGen = new ReportGenerator(options.outputDir ?? './reports');
    const scoring = await ScoringCalculator.fromConfigFile(`${options.workspacePath}/config/scoring-weights.json`);
    const engine = new DiagnoseEngine(new NpmRegistryAdapter(), new ProbeSimulatorAdapter(options.workspacePath), new MarketStoreAdapter(), new GitHubApiAdapter(), scoring, reportGen);
    return engine.diagnose(options);
}
export async function analyzeRootCause(options) {
    const reportGen = new ReportGenerator('./reports');
    const analyzer = new RootCauseAnalyzer(new GitHubApiAdapter(), reportGen);
    return analyzer.analyzeRootCause(options);
}
export async function boostExposure(options) {
    const reportGen = new ReportGenerator(options.outputDir ?? './reports');
    const booster = new ExposureBooster(new NpmRegistryAdapter(), new GitHubApiAdapter(), reportGen);
    return booster.boostExposure(options);
}
export async function verifyAdoption(options) {
    const reportGen = new ReportGenerator(options.outputDir ?? './reports');
    const verifier = new AdoptionVerifier(new NpmRegistryAdapter(), new ProbeSimulatorAdapter(process.cwd()), new MarketStoreAdapter(), reportGen);
    return verifier.verifyAdoption(options);
}
export { NpmRegistryAdapter, ProbeSimulatorAdapter, MarketStoreAdapter, GitHubApiAdapter, ScoringCalculator, DiagnoseEngine, RootCauseAnalyzer, ExposureBooster, AdoptionVerifier, ReportGenerator, PatchGenerator, GuidanceGenerator, runCli, };
export * from './types/index.js';
export function apply(ctx) {
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
            schema: {
                type: 'object',
                properties: {
                    exposureScore: { type: 'number', description: '曝光度评分 (0-100)' },
                    rootCauses: { type: 'array', items: { type: 'string' }, description: '低曝光度根因列表' },
                    suggestions: { type: 'array', items: { type: 'string' }, description: '改进建议' },
                },
            },
            render: { type: 'json' },
        },
        async execute(args) {
            try {
                const result = await diagnose({
                    workspacePath: args.workspacePath,
                    packageNames: args.packageNames,
                    repoFullName: args.repoFullName,
                    outputDir: args.outputDir ?? null,
                });
                return JSON.stringify(result, null, 2);
            }
            catch (e) {
                return JSON.stringify({ error: 'VISIBILITY_DOCTOR_ERROR', message: e.message });
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
            schema: {
                type: 'object',
                properties: {
                    patches: { type: 'array', items: { type: 'object' }, description: '生成的补丁列表' },
                    guidance: { type: 'string', description: '操作引导文本' },
                },
            },
            render: { type: 'json' },
        },
        async execute(args) {
            try {
                const result = await boostExposure({
                    workspacePath: args.workspacePath,
                    packageNames: args.packageNames,
                    repoFullName: args.repoFullName,
                    outputDir: args.outputDir ?? null,
                });
                return JSON.stringify(result, null, 2);
            }
            catch (e) {
                return JSON.stringify({ error: 'BOOST_ERROR', message: e.message });
            }
        },
    });
}
//# sourceMappingURL=index.js.map