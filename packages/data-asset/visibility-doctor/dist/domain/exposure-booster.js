import { PatchGenerator } from '../generators/patch-generator.js';
const REQUIRED_BRIDGE_KEYWORDS = [
    'deepseek-harness',
    'dsh-plugin',
    'data-asset',
    'data-asset-inspector',
    'shujintong',
    '数据资产',
];
const MAIN_PACKAGE = '@liuhange/dsh-data-asset-orchestration';
export class ExposureBooster {
    npmAdapter;
    githubAdapter;
    reportGenerator;
    constructor(npmAdapter, githubAdapter, reportGenerator) {
        this.npmAdapter = npmAdapter;
        this.githubAdapter = githubAdapter;
        this.reportGenerator = reportGenerator;
    }
    async boostExposure(options) {
        const { packageNames, repoFullName } = options;
        const npmMetas = await this.npmAdapter.batchQuery(packageNames);
        const topics = await this.githubAdapter.queryTopics(repoFullName);
        const topicsCheck = this.githubAdapter.checkTopicsDoubleHit(topics);
        const patches = [];
        for (const meta of npmMetas) {
            const gapResult = this.analyzeKeywordsCoverage(meta.keywords);
            const patch = new PatchGenerator().generatePackagePatch(meta.name, meta, gapResult);
            patches.push(patch);
        }
        const topicsGuidance = this.generateTopicsGuidance(topicsCheck);
        const marketFilingGaps = await this.checkMarketFiling(repoFullName);
        const mainPackageBooster = this.generateMainPackageBooster(npmMetas);
        const result = {
            patches,
            topicsGuidance,
            marketFilingGaps,
            mainPackageBooster,
            boostedAt: new Date().toISOString(),
        };
        await this.reportGenerator.generateBoostReport(result, 'both');
        return result;
    }
    analyzeKeywordsCoverage(existingKeywords) {
        const existingSet = new Set(existingKeywords);
        const missing = REQUIRED_BRIDGE_KEYWORDS.filter((k) => !existingSet.has(k));
        const suggested = Array.from(new Set([...existingKeywords, ...REQUIRED_BRIDGE_KEYWORDS]));
        return { existing: existingKeywords, missing, suggested };
    }
    checkMarketFilingCompleteness(detailPageContent) {
        const requiredFields = [
            '插件简介',
            '功能截图',
            '安装命令',
            '使用示例',
            '依赖说明',
            '版本兼容性',
        ];
        const missingFields = requiredFields.filter((f) => !detailPageContent.includes(f));
        const draftContent = this.generateFilingDraft(missingFields);
        return { missingFields, draftContent };
    }
    generateMainPackageBooster(allPackages) {
        const tableRows = allPackages
            .map((p) => `| \`${p.name}\` | ${p.description ?? '-'} | v${p.version} |`)
            .join('\n');
        const readmeSection = [
            '## 完整数据资产插件套件',
            '',
            '本插件属于 dsh 数据资产系列，完整包列表如下：',
            '',
            '| 包名 | 描述 | 版本 |',
            '|------|------|------|',
            tableRows,
            '',
            `> 使用 \`${MAIN_PACKAGE}\` 可一键编排全流程（掩蔽→清洁→库存→包装）。`,
        ].join('\n');
        const descriptionHint = '本插件属于 dsh 数据资产系列，完整包列表见 README';
        return { readmeSection, descriptionHint };
    }
    generateTopicsGuidance(check) {
        if (check.hit) {
            return { hasDoubleHit: true, missingTopics: [], manualSteps: [] };
        }
        const manualSteps = [
            '1. 打开 GitHub 仓库设置页: Settings → General → Topics',
            `2. 添加缺失标签: ${check.missing.join(', ')}`,
            '3. 点击 Save Changes 保存',
        ];
        return {
            hasDoubleHit: false,
            missingTopics: check.missing,
            manualSteps,
        };
    }
    async checkMarketFiling(repoFullName) {
        try {
            const detailPageUrl = `https://dsh-plugin.org/zh/plugins/${repoFullName}`;
            const res = await globalThis.fetch(detailPageUrl);
            if (!res.ok) {
                return [this.checkMarketFilingCompleteness('')];
            }
            const content = await res.text();
            return [this.checkMarketFilingCompleteness(content)];
        }
        catch {
            return [this.checkMarketFilingCompleteness('')];
        }
    }
    generateFilingDraft(missingFields) {
        if (missingFields.length === 0)
            return '建档信息完整，无需补全。';
        const sections = missingFields.map((field) => `### ${field}\n\n[请补充 ${field} 内容]`);
        return `# 建档补全草稿\n\n${sections.join('\n\n')}`;
    }
}
//# sourceMappingURL=exposure-booster.js.map