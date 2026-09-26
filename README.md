# 数据资产体检仪·全领域插件矩阵 (Data Asset Inspector Plugin Suite)

[![Listed on dsh-plugin.org](https://dsh-plugin.org/badges/listed.svg)](https://dsh-plugin.org/plugins/liuhange789/data-asset-inspector)
[![npm version](https://img.shields.io/npm/v/@liuhange/dsh-data-asset-shared.svg)](https://www.npmjs.com/package/@liuhange/dsh-data-asset-shared)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

基于 DeepSeek Harness (DSH) 的全领域数据资产管理插件矩阵，覆盖"脱敏→清洗→盘点→质量→估值→合规→登记→政务→AI→流通"完整业务链路。24个插件全部发布至npm，每个插件嵌入政策依据引用，确保"有理有据、可审计、可追溯"。

## 全部24个插件列表

### 基础模块

| 插件 | 包名 | 功能 | 版本 |
|------|------|------|------|
| 共享基础 | @liuhange/dsh-data-asset-shared | 类型定义、配置加载、政策依据引用、文件格式适配 | 3.2.1 |

### v1.0 核心处理模块

| 插件 | 包名 | 功能 | 版本 |
|------|------|------|------|
| 数据脱敏 | @liuhange/dsh-data-masking | 敏感字段识别与分级脱敏+FPE/k-匿名/差分隐私 | 3.0.2 |
| 数据清洗 | @liuhange/dsh-data-cleaning | 去重、格式标准化、异常值检测 | 3.0.2 |
| 数据盘点 | @liuhange/dsh-data-inventory | 目录扫描、价值评估、资产清单生成 | 3.0.2 |
| 数据包装 | @liuhange/dsh-data-packaging | 产品说明书生成、合规声明、定价建议 | 3.0.2 |
| 全流程编排 | @liuhange/dsh-data-asset-orchestration | 全量+增量处理模式、Cron调度、垂直链执行 | 3.1.0 |

### v2.0 质量与可视化模块

| 插件 | 包名 | 功能 | 版本 |
|------|------|------|------|
| 质量评分 | @liuhange/dsh-data-quality-scoring | 四维度评分+改进建议 | 2.0.3 |
| 血缘追踪 | @liuhange/dsh-data-lineage | 数据流转路径追踪+Mermaid可视化 | 2.0.3 |
| 可视化报表 | @liuhange/dsh-data-visualization | 自包含HTML+5种交互式图表 | 2.0.3 |
| 敏感度分级 | @liuhange/dsh-data-sensitivity-classification | 四级自动分级+策略推荐 | 2.0.3 |

### v3.0 数据资产入表模块

| 插件 | 包名 | 功能 | 版本 |
|------|------|------|------|
| 资产盘点扫描 | @liuhange/dsh-data-asset-inventory-scan | 目录扫描、元数据提取、资产编目 | 3.1.3 |
| 资产质量评分 | @liuhange/dsh-data-asset-quality-score | 六维质量评分（规范性/完整性/准确性/一致性/时效性/可访问性） | 3.1.3 |
| 资产估值 | @liuhange/dsh-data-asset-valuation | 成本法/收益法/市场法估值、资本化追溯禁止 | 3.1.3 |
| 合规审查 | @liuhange/dsh-data-asset-compliance-check | 合规检查、全过程管理试点依据嵌入 | 3.1.3 |
| 登记助手 | @liuhange/dsh-data-asset-registration-helper | 三重审核、七步流程、登记材料生成 | 3.1.3 |
| 质量确权 | @liuhange/dsh-data-asset-attestation | 数据质量确权、第三方认证对接 | 3.1.1 |

### v3.1 政务与AI扩展模块

| 插件 | 包名 | 功能 | 版本 |
|------|------|------|------|
| 政务数据巡检 | @liuhange/dsh-gov-data-inspector | 办事指南五维检测+官方数据源对接+公共数据分类 | 3.1.2 |
| 城市数据分类 | @liuhange/dsh-city-data-classifier | 城市数据资产分类、GB/T 47949映射 | 3.1.1 |
| AI数据集检查 | @liuhange/dsh-ai-dataset-inspector | AI训练数据集质量检查、偏见检测 | 3.1.1 |
| 数据流通评估 | @liuhange/dsh-data-circulation-assessor | 数据流通可行性评估、风险分级 | 3.1.1 |
| 登记材料生成 | @liuhange/dsh-generate-registration-docs | 自动生成登记申请材料 | 3.0.2 |
| 登记预检 | @liuhange/dsh-registration-precheck | 登记条件预检、失败项诊断 | 3.0.2 |
| 登记机构匹配 | @liuhange/dsh-match-registration-agency | 数据类型→登记机构智能匹配 | 3.0.2 |
| 可见性诊断 | @liuhange/dsh-visibility-doctor | npm/GitHub可见性诊断、DSH插件市场收录检查 | 1.0.0 |

## 安装方式

### 方式一：DSH CLI 安装（推荐）

```bash
npx @deepseek-ai/dsh web

# 安装全部24个插件
dsh plugin --profile web add @liuhange/dsh-data-asset-shared
dsh plugin --profile web add @liuhange/dsh-data-masking
dsh plugin --profile web add @liuhange/dsh-data-cleaning
dsh plugin --profile web add @liuhange/dsh-data-inventory
dsh plugin --profile web add @liuhange/dsh-data-packaging
dsh plugin --profile web add @liuhange/dsh-data-asset-orchestration
dsh plugin --profile web add @liuhange/dsh-data-quality-scoring
dsh plugin --profile web add @liuhange/dsh-data-lineage
dsh plugin --profile web add @liuhange/dsh-data-visualization
dsh plugin --profile web add @liuhange/dsh-data-sensitivity-classification
dsh plugin --profile web add @liuhange/dsh-data-asset-inventory-scan
dsh plugin --profile web add @liuhange/dsh-data-asset-quality-score
dsh plugin --profile web add @liuhange/dsh-data-asset-valuation
dsh plugin --profile web add @liuhange/dsh-data-asset-compliance-check
dsh plugin --profile web add @liuhange/dsh-data-asset-registration-helper
dsh plugin --profile web add @liuhange/dsh-data-asset-attestation
dsh plugin --profile web add @liuhange/dsh-gov-data-inspector
dsh plugin --profile web add @liuhange/dsh-city-data-classifier
dsh plugin --profile web add @liuhange/dsh-ai-dataset-inspector
dsh plugin --profile web add @liuhange/dsh-data-circulation-assessor
dsh plugin --profile web add @liuhange/dsh-generate-registration-docs
dsh plugin --profile web add @liuhange/dsh-registration-precheck
dsh plugin --profile web add @liuhange/dsh-match-registration-agency
dsh plugin --profile web add @liuhange/dsh-visibility-doctor
```

### 方式二：npm 批量安装

```bash
npm install @liuhange/dsh-data-asset-shared @liuhange/dsh-data-masking @liuhange/dsh-data-cleaning @liuhange/dsh-data-inventory @liuhange/dsh-data-packaging @liuhange/dsh-data-asset-orchestration @liuhange/dsh-data-quality-scoring @liuhange/dsh-data-lineage @liuhange/dsh-data-visualization @liuhange/dsh-data-sensitivity-classification @liuhange/dsh-data-asset-inventory-scan @liuhange/dsh-data-asset-quality-score @liuhange/dsh-data-asset-valuation @liuhange/dsh-data-asset-compliance-check @liuhange/dsh-data-asset-registration-helper @liuhange/dsh-data-asset-attestation @liuhange/dsh-gov-data-inspector @liuhange/dsh-city-data-classifier @liuhange/dsh-ai-dataset-inspector @liuhange/dsh-data-circulation-assessor @liuhange/dsh-generate-registration-docs @liuhange/dsh-registration-precheck @liuhange/dsh-match-registration-agency @liuhange/dsh-visibility-doctor
```

## 快速开始

```bash
git clone https://github.com/liuhange789/data-asset-inspector.git
cd data-asset-inspector
pnpm install
pnpm build
pnpm test
npx @deepseek-ai/dsh web
```

## 插件架构

每个插件遵循 DeepSeek Harness 插件规范，导出 `name`/`inject`/`apply` 三个接口：

```typescript
export const name: string;
export const inject: string[];
export function apply(ctx: Context): void;
```

### 业务链路

```
v1.0: 脱敏 → 清洗 → 盘点 → 包装 → 编排
v2.0: 质量评分 → 血缘追踪 → 可视化 → 敏感度分级
v3.0: 盘点扫描 → 质量评分 → 估值 → 合规审查 → 登记助手 → 质量确权
v3.1: 政务巡检 → 城市分类 → AI数据集 → 流通评估 → 登记材料 → 登记预检 → 机构匹配 → 可见性诊断
```

## 政策依据

每个插件输出报告均含"政策依据"字段，格式：`依据：《文件名称》（文号）——核心条款摘要`

| 政策文件 | 文号 | 适用插件 |
|----------|------|----------|
| 数据安全法 | — | 盘点扫描、合规审查 |
| 个人信息保护法 | — | 盘点扫描、合规审查 |
| 企业数据资源相关会计处理暂行规定 | 财会〔2025〕33号 | 估值、登记助手 |
| 企业数据资源会计处理应用案例 | 财会〔2025〕33号 | 估值、登记助手 |
| 加强数据资产管理的通知 | 财资〔2024〕167号 | 估值、合规审查、登记助手 |
| 数据资产全过程管理试点工作方案 | — | 合规审查、登记助手 |
| DB1405/T 085-2025 政务数据质量检查规范 | — | 政务数据巡检 |
| 国务院办公厅关于印发政务服务平台移动端建设指南 | 国办发〔2017〕47号 | 政务数据巡检 |

## 商业规则配置

所有业务规则存储在 JSON 配置文件，修改规则无需改代码：

- `config/business-rules.json` — 业务规则（评分阈值、估值参数、合规标准、官方数据源优先级等）
- `config/policy-references.json` — 政策依据引用表

## 技术栈

- TypeScript 5.7 + Node.js 22+
- DeepSeek Harness (DSH) / Cordis 4.0
- Vitest 3.0 测试框架（403个测试全部通过）
- pnpm workspace 单仓多包

## License

MIT
