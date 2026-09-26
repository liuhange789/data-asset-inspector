import { readFile } from 'node:fs/promises';
import type {
  RootCauseOptions,
  RootCauseResult,
  RootCause,
  BugFixItem,
  OfficialIssueStatus,
  DiagnoseResult,

} from '../types/index.js';
import type { IGitHubApiAdapter } from '../types/index.js';
import { ReportGenerator } from '../generators/report-generator.js';

export class RootCauseAnalyzer {
  constructor(
    private readonly githubAdapter: IGitHubApiAdapter,
    private readonly reportGenerator: ReportGenerator,
  ) {}

  async analyzeRootCause(options: RootCauseOptions): Promise<RootCauseResult> {
    const diagnoseResult = await this.loadDiagnoseReport(options.diagnoseReportPath);
    const officialIssueStatus = await this.parseOfficialIssue(options.issueRef);

    const rootCauses: RootCause[] = [];
    rootCauses.push(...this.analyzeBlacklistResidual(officialIssueStatus));
    rootCauses.push(...this.analyzeProbeWindowTruncation(diagnoseResult));
    rootCauses.push(...this.analyzeNamingInconsistency(diagnoseResult, options.repoFullName));
    rootCauses.push(...this.analyzeKeywordsGap(diagnoseResult));
    rootCauses.push(...this.analyzeAliasSearchBreak(diagnoseResult));
    rootCauses.push(...this.analyzeZeroDependencyDesign(diagnoseResult));

    const bugFixList = this.generateBugFixList(rootCauses);

    const result: RootCauseResult = {
      rootCauses,
      bugFixList,
      officialIssueStatus,
      analyzedAt: new Date().toISOString(),
    };

    await this.reportGenerator.generateRootCauseReport(result, 'both');
    return result;
  }

  private async loadDiagnoseReport(path: string): Promise<DiagnoseResult> {
    const content = await readFile(path, 'utf-8');
    const json = JSON.parse(content) as { result: DiagnoseResult };
    return json.result;
  }

  private async parseOfficialIssue(issueRef: string): Promise<OfficialIssueStatus> {
    try {
      const issueStatus = await this.githubAdapter.queryIssueStatus(issueRef);
      const allComments = issueStatus.comments.map((c) => c.body).join('\n');

      return {
        issueRef,
        state: issueStatus.state,
        acknowledgedMisjudgment: this.containsKeyword(allComments, ['误判', '误杀', 'misjudgment']),
        removedFromBlacklist: this.containsKeyword(allComments, ['移出黑名单', '移除黑名单', 'removed from blacklist']),
        filingInProgress: this.containsKeyword(allComments, ['建档中', '收录中', 'filing']),
        filingComplete: this.containsKeyword(allComments, ['已收录', '建档完成', 'listed']),
        lastUpdatedAt: issueStatus.lastUpdatedAt,
      };
    } catch {
      return {
        issueRef,
        state: 'open',
        acknowledgedMisjudgment: false,
        removedFromBlacklist: false,
        filingInProgress: false,
        filingComplete: false,
        lastUpdatedAt: new Date().toISOString(),
      };
    }
  }

  private containsKeyword(text: string, keywords: readonly string[]): boolean {
    return keywords.some((k) => text.includes(k));
  }

  private analyzeBlacklistResidual(status: OfficialIssueStatus): readonly RootCause[] {
    if (status.filingComplete) return [];
    return [{
      id: 'rc-blacklist-residual',
      layer: 'OFFICIAL',
      priority: 'P0',
      title: '黑名单已移出但市场建档未完成',
      description: status.filingInProgress
        ? '官方已从黑名单移除，正在人工收录建档中，详情页尚未上线，用户无法通过市场发现插件'
        : '官方已从黑名单移除，但建档状态不明，需确认详情页是否已上线',
      evidence: [
        `issue ${status.issueRef} state: ${status.state}`,
        `removedFromBlacklist: ${status.removedFromBlacklist}`,
        `filingInProgress: ${status.filingInProgress}`,
        `filingComplete: ${status.filingComplete}`,
      ],
      actionable: false,
      fixId: null,
    }];
  }

  private analyzeProbeWindowTruncation(result: DiagnoseResult): readonly RootCause[] {
    if (result.truncatedPackages.length === 0) return [];
    return [{
      id: 'rc-probe-window-truncation',
      layer: 'OFFICIAL',
      priority: 'P0',
      title: '探测窗口容量截断导致系列包未被发现',
      description: `dsh 探测器窗口大小为 ${result.probeSnapshot.windowSize}，前 ${result.probeSnapshot.windowSize} 个候选包中官方 @deepseek-ai/* 包占满窗口，${result.truncatedPackages.length} 个系列包被截断`,
      evidence: [
        `windowSize: ${result.probeSnapshot.windowSize}`,
        `truncatedPackages: ${result.truncatedPackages.join(', ')}`,
        `isCached: ${result.probeSnapshot.isCached}`,
      ],
      actionable: true,
      fixId: 'fix-probe-window-expansion',
    }];
  }

  private analyzeNamingInconsistency(result: DiagnoseResult, repoFullName: string): readonly RootCause[] {
    const repoName = repoFullName.split('/')[1] ?? '';
    const mismatches = result.packages.filter((p) => !p.repoNameMatch);
    if (mismatches.length === 0) return [];
    return [{
      id: 'rc-naming-inconsistency',
      layer: 'PLUGIN',
      priority: 'P1',
      title: '仓库名与包名不一致影响搜索关联',
      description: `仓库名 "${repoName}" 与 ${mismatches.length} 个包名不匹配，用户按包名搜索时可能无法关联到仓库`,
      evidence: mismatches.map((p) => `${p.packageName} repoNameMatch=false`),
      actionable: true,
      fixId: 'fix-naming-consistency',
    }];
  }

  private analyzeKeywordsGap(result: DiagnoseResult): readonly RootCause[] {
    const required = ['deepseek-harness', 'dsh-plugin', 'data-asset'];
    const gaps = result.packages.filter((p) => !required.every((k) => p.keywords.includes(k)));
    if (gaps.length === 0) return [];
    return [{
      id: 'rc-keywords-gap',
      layer: 'PLUGIN',
      priority: 'P1',
      title: 'keywords 桥接词缺失影响 npm 搜索可发现性',
      description: `${gaps.length} 个包缺少必要的 keywords 桥接词（deepseek-harness/dsh-plugin/data-asset），用户搜索相关关键词时无法命中`,
      evidence: gaps.map((p) => `${p.packageName} keywords: [${p.keywords.join(', ')}]`),
      actionable: true,
      fixId: 'fix-keywords-bridge',
    }];
  }

  private analyzeAliasSearchBreak(result: DiagnoseResult): readonly RootCause[] {
    const aliasBreaks = result.packages.filter((p) => p.hasAlias && p.aliasName && !p.description?.includes(p.aliasName));
    if (aliasBreaks.length === 0) return [];
    return [{
      id: 'rc-alias-search-break',
      layer: 'MARKET',
      priority: 'P1',
      title: '别名搜索断链',
      description: `${aliasBreaks.length} 个包的 description 中未包含 @deepseek-ai/* 别名，用户按官方前缀搜索时无法命中`,
      evidence: aliasBreaks.map((p) => `${p.packageName} alias=${p.aliasName} not in description`),
      actionable: true,
      fixId: 'fix-alias-description',
    }];
  }

  private analyzeZeroDependencyDesign(result: DiagnoseResult): readonly RootCause[] {
    const zeroDep = result.packages.filter((p) => p.dependentCount === 0);
    if (zeroDep.length === 0) return [];
    return [{
      id: 'rc-zero-dependency-design',
      layer: 'PLUGIN',
      priority: 'P2',
      title: '零依赖零被依赖为设计特征非 Bug',
      description: `${zeroDep.length} 个包 0 被依赖，这是零运行时依赖的设计特征，非 Bug。需通过主包聚合引流提升系列整体采用率`,
      evidence: zeroDep.map((p) => `${p.packageName} dependentCount=0`),
      actionable: true,
      fixId: 'fix-main-package-booster',
    }];
  }

  private generateBugFixList(rootCauses: readonly RootCause[]): readonly BugFixItem[] {
    const fixes: BugFixItem[] = [];
    for (const rc of rootCauses) {
      if (!rc.actionable || !rc.fixId) continue;
      const fixId: string = rc.fixId;
      fixes.push(this.createFixItem(rc, fixId));
    }
    return fixes;
  }

  private createFixItem(rc: RootCause, fixId: string): BugFixItem {
    switch (fixId) {
      case 'fix-probe-window-expansion':
        return {
          id: fixId,
          rootCauseId: rc.id,
          layer: rc.layer,
          priority: rc.priority,
          description: '向 dshplugin 官方提交 issue 申请扩大探测窗口或调整排序优先级',
          verifyCommand: 'visibility-doctor verify --probe-hit',
          acceptanceCriteria: '探测命中率 100%，全部系列包落入探测窗口',
          autoFixScript: null,
        };
      case 'fix-naming-consistency':
        return {
          id: fixId,
          rootCauseId: rc.id,
          layer: rc.layer,
          priority: rc.priority,
          description: '在 README 中显式声明包名与仓库名的映射关系，或考虑重命名仓库',
          verifyCommand: 'visibility-doctor diagnose --packages <all>',
          acceptanceCriteria: '所有包 repoNameMatch=true',
          autoFixScript: null,
        };
      case 'fix-keywords-bridge':
        return {
          id: fixId,
          rootCauseId: rc.id,
          layer: rc.layer,
          priority: rc.priority,
          description: '为所有包的 package.json 补充 keywords 桥接词',
          verifyCommand: 'visibility-doctor boost --dry-run',
          acceptanceCriteria: '所有包 keywords 含 deepseek-harness/dsh-plugin/data-asset',
          autoFixScript: 'npm version patch && npm publish',
        };
      case 'fix-alias-description':
        return {
          id: fixId,
          rootCauseId: rc.id,
          layer: rc.layer,
          priority: rc.priority,
          description: '在 description 中加入 @deepseek-ai/* 别名引用',
          verifyCommand: 'visibility-doctor diagnose --packages <all>',
          acceptanceCriteria: '所有包 aliasDisplay=true',
          autoFixScript: 'npm version patch && npm publish',
        };
      case 'fix-main-package-booster':
        return {
          id: fixId,
          rootCauseId: rc.id,
          layer: rc.layer,
          priority: rc.priority,
          description: '在主包 README 中添加全系列包列表引流段落',
          verifyCommand: 'visibility-doctor boost --dry-run',
          acceptanceCriteria: '主包 README 含全系列包列表表格',
          autoFixScript: null,
        };
      default:
        return {
          id: fixId,
          rootCauseId: rc.id,
          layer: rc.layer,
          priority: rc.priority,
          description: rc.title,
          verifyCommand: 'visibility-doctor diagnose',
          acceptanceCriteria: '根因消除',
          autoFixScript: null,
        };
    }
  }
}