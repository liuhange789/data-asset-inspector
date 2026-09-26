import { writeFile, rename, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  DiagnoseResult,
  RootCauseResult,
  BoostResult,
  VerifyResult,
  ReportFiles,
  DiagnoseReportJson,
  RootCauseReportJson,
  BoostReportJson,
  VerifyReportJson,
} from '../types/index.js';

export class ReportGenerator {
  private readonly outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
  }

  async generateDiagnoseReport(
    result: DiagnoseResult,
    format: 'json' | 'md' | 'both',
  ): Promise<ReportFiles> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonReport: DiagnoseReportJson = {
      command: 'diagnose',
      generatedAt: new Date().toISOString(),
      result,
    };

    let jsonPath: string | null = null;
    let mdPath: string | null = null;

    if (format === 'json' || format === 'both') {
      const filename = `diagnose-report-${timestamp}.json`;
      jsonPath = await this.atomicWrite(filename, JSON.stringify(jsonReport, null, 2));
    }
    if (format === 'md' || format === 'both') {
      const filename = `diagnose-report-${timestamp}.md`;
      const md = this.renderDiagnoseMarkdown(result);
      mdPath = await this.atomicWrite(filename, md);
    }

    return { jsonPath, mdPath };
  }

  async generateRootCauseReport(
    result: RootCauseResult,
    format: 'json' | 'md' | 'both',
  ): Promise<ReportFiles> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonReport: RootCauseReportJson = {
      command: 'analyze',
      generatedAt: new Date().toISOString(),
      result,
    };

    let jsonPath: string | null = null;
    let mdPath: string | null = null;

    if (format === 'json' || format === 'both') {
      const filename = `analyze-report-${timestamp}.json`;
      jsonPath = await this.atomicWrite(filename, JSON.stringify(jsonReport, null, 2));
    }
    if (format === 'md' || format === 'both') {
      const filename = `analyze-report-${timestamp}.md`;
      const md = this.renderRootCauseMarkdown(result);
      mdPath = await this.atomicWrite(filename, md);
    }

    return { jsonPath, mdPath };
  }

  async generateBoostReport(
    result: BoostResult,
    format: 'json' | 'md' | 'both',
  ): Promise<ReportFiles> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonReport: BoostReportJson = {
      command: 'boost',
      generatedAt: new Date().toISOString(),
      result,
    };

    let jsonPath: string | null = null;
    let mdPath: string | null = null;

    if (format === 'json' || format === 'both') {
      const filename = `boost-report-${timestamp}.json`;
      jsonPath = await this.atomicWrite(filename, JSON.stringify(jsonReport, null, 2));
    }
    if (format === 'md' || format === 'both') {
      const filename = `boost-report-${timestamp}.md`;
      const md = this.renderBoostMarkdown(result);
      mdPath = await this.atomicWrite(filename, md);
    }

    return { jsonPath, mdPath };
  }

  async generateVerifyReport(
    result: VerifyResult,
    format: 'json' | 'md' | 'both',
  ): Promise<ReportFiles> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonReport: VerifyReportJson = {
      command: 'verify',
      generatedAt: new Date().toISOString(),
      result,
    };

    let jsonPath: string | null = null;
    let mdPath: string | null = null;

    if (format === 'json' || format === 'both') {
      const filename = `verify-report-${timestamp}.json`;
      jsonPath = await this.atomicWrite(filename, JSON.stringify(jsonReport, null, 2));
    }
    if (format === 'md' || format === 'both') {
      const filename = `verify-report-${timestamp}.md`;
      const md = this.renderVerifyMarkdown(result);
      mdPath = await this.atomicWrite(filename, md);
    }

    return { jsonPath, mdPath };
  }

  private async atomicWrite(filename: string, content: string): Promise<string> {
    await mkdir(this.outputDir, { recursive: true });
    const tmpDir = join(this.outputDir, '.tmp');
    await mkdir(tmpDir, { recursive: true });
    const tmpPath = join(tmpDir, filename);
    const finalPath = join(this.outputDir, filename);
    await writeFile(tmpPath, content, 'utf-8');
    await rename(tmpPath, finalPath);
    return finalPath;
  }

  private renderDiagnoseMarkdown(result: DiagnoseResult): string {
    const lines: string[] = [
      '# 插件可发现性诊断报告',
      '',
      `> 生成时间: ${result.diagnosedAt} | 耗时: ${result.durationMs}ms`,
      '',
      '## 探测窗口',
      '',
      `- 窗口大小: ${result.probeSnapshot.windowSize}`,
      `- 是否缓存: ${result.probeSnapshot.isCached}`,
      `- 被截断包: ${result.truncatedPackages.length > 0 ? result.truncatedPackages.join(', ') : '无'}`,
      '',
      '## 逐包评分',
      '',
      '| 包名 | 总分 | keywords | README | Topics | 市场 | 别名 | 仓库名 |',
      '|------|------|----------|--------|--------|------|------|--------|',
    ];

    for (const pkg of result.packages) {
      const s = pkg.score;
      const getScore = (dim: string): string => {
        const sub = s.subscores.find((x) => x.dimension === dim);
        return sub ? `${sub.score}/${sub.maxScore}` : '-';
      };
      lines.push(
        `| ${pkg.packageName} | ${s.overallScore} | ${getScore('KEYWORDS_HIT')} | ${getScore('README_INSTALL_FORMAT')} | ${getScore('TOPICS_DOUBLE_HIT')} | ${getScore('MARKET_LISTED')} | ${getScore('ALIAS_DISPLAY')} | ${getScore('REPO_NAME_MATCH')} |`,
      );
    }

    return lines.join('\n');
  }

  private renderRootCauseMarkdown(result: RootCauseResult): string {
    const lines: string[] = [
      '# 根因分析与 Bug 修复清单',
      '',
      `> 生成时间: ${result.analyzedAt}`,
      '',
      '## 官方 Issue 状态',
      '',
      `- Issue: ${result.officialIssueStatus.issueRef}`,
      `- 状态: ${result.officialIssueStatus.state}`,
      `- 承认误判: ${result.officialIssueStatus.acknowledgedMisjudgment}`,
      `- 已移出黑名单: ${result.officialIssueStatus.removedFromBlacklist}`,
      `- 建档中: ${result.officialIssueStatus.filingInProgress}`,
      `- 建档完成: ${result.officialIssueStatus.filingComplete}`,
      '',
      '## 根因清单',
      '',
    ];

    for (const rc of result.rootCauses) {
      lines.push(`### [${rc.priority}] ${rc.title} (${rc.layer})`);
      lines.push(`- ${rc.description}`);
      lines.push(`- 可操作: ${rc.actionable}`);
      lines.push(`- 证据: ${rc.evidence.join('; ')}`);
      lines.push('');
    }

    lines.push('## Bug 修复清单', '');
    for (const fix of result.bugFixList) {
      lines.push(`### [${fix.priority}] ${fix.description} (${fix.layer})`);
      lines.push(`- 验证命令: \`${fix.verifyCommand}\``);
      lines.push(`- 验收标准: ${fix.acceptanceCriteria}`);
      if (fix.autoFixScript) {
        lines.push(`- 自动修复: \`${fix.autoFixScript}\``);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private renderBoostMarkdown(result: BoostResult): string {
    const lines: string[] = [
      '# 曝光度提升方案',
      '',
      `> 生成时间: ${result.boostedAt}`,
      '',
      '## Topics 指引',
      '',
      `- 双命中: ${result.topicsGuidance.hasDoubleHit}`,
      `- 缺失标签: ${result.topicsGuidance.missingTopics.join(', ') || '无'}`,
      '',
      '## package.json 补丁',
      '',
    ];

    for (const patch of result.patches) {
      lines.push(`### ${patch.packageName}`);
      lines.push(`- 新增 keywords: ${patch.addedKeywords.join(', ') || '无'}`);
      if (patch.addedHomepage) lines.push(`- 新增 homepage: ${patch.addedHomepage}`);
      if (patch.updatedDescription) lines.push(`- 更新 description: ${patch.updatedDescription}`);
      lines.push(`- 幂等: ${patch.isIdempotent}`);
      lines.push('');
    }

    lines.push('## 主包引流', '', result.mainPackageBooster.readmeSection);

    return lines.join('\n');
  }

  private renderVerifyMarkdown(result: VerifyResult): string {
    const lines: string[] = [
      '# 采用率验证报告',
      '',
      `> 生成时间: ${result.verifiedAt}`,
      `> 总体通过: ${result.overallPassed}`,
      '',
      '## 下载量验证',
      '',
      `- 当前周下载: ${result.downloads.currentWeekly}`,
      `- 基线: ${result.downloads.baseline}`,
      `- 短期目标: ${result.downloads.shortTermTarget} → ${result.downloads.shortTermPassed ? 'PASS' : 'FAIL'}`,
      `- 长期目标: ${result.downloads.longTermTarget} → ${result.downloads.longTermPassed ? 'PASS' : 'FAIL'}`,
      '',
      '## 探测命中率',
      '',
      `- 命中: ${result.probe.hitCount}/${result.probe.totalCount} (${(result.probe.hitRate * 100).toFixed(1)}%)`,
      `- 未命中: ${result.probe.missedPackages.join(', ') || '无'}`,
      '',
      '## 市场收录',
      '',
      `- 全部已收录: ${result.market.allListed}`,
      '',
      '## 安装成功率',
      '',
      `- 成功率: ${(result.install.successRate * 100).toFixed(1)}%`,
    ];

    return lines.join('\n');
  }
}