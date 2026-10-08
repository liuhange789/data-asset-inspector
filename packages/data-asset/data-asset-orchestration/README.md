# @liuhange/dsh-data-asset-orchestration

[![npm version](https://img.shields.io/npm/v/@liuhange/dsh-data-asset-orchestration)](https://www.npmjs.com/package/@liuhange/dsh-data-asset-orchestration)
[![npm downloads](https://img.shields.io/npm/dm/@liuhange/dsh-data-asset-orchestration)](https://www.npmjs.com/package/@liuhange/dsh-data-asset-orchestration)
[![Tests](https://img.shields.io/badge/tests-429%20passed-brightgreen)](https://github.com/liuhange789/data-asset-inspector)
[![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://github.com/liuhange789/data-asset-inspector)

**一键将原始数据自动完成脱敏 → 清洗 → 盘点 → 封装，让数据资产治理从"手动打补丁"变成"自动化流水线"。**

> 🔥 **为什么选择 DSH 矩阵？**
>
> 我们不仅提供编排主包，还拥有 **32 个独立迭代的功能插件**。其中政务巡检插件（[`@liuhange/dsh-gov-data-inspector`](https://www.npmjs.com/package/@liuhange/dsh-gov-data-inspector) v3.6.5）已历经**番禺/开封/苏州三城真实政务网站验收**，逻辑/语义/格式检出率 **100%**，误报率 **0%**，429 单元测试全通过。
>
> 👉 [**点击查看全部 32 个插件导航矩阵**](https://github.com/liuhange789/data-asset-inspector/blob/main/PACKAGES.md)

## 为什么选择这个包？

大多数数据治理工具需要你手动拼接多个 npm 包、处理数据格式转换、配置执行顺序。这个包让你**只需一句触发话术**，就能在 DeepSeek Harness 生态中完成端到端的数据资产化处理：

- **自动化流水线**：mask_sensitive_data → clean_data → inventory_data → package_data_asset 四步依次执行，无需手工编排
- **四步一键完成**：脱敏 → 清洗 → 盘点 → 封装，覆盖数据资产化的核心路径
- **4 类报告聚合**：masking / cleaning / inventory / packaging manual 一次输出，全程可追溯
- **失败即停可追溯**：首个步骤失败立即停止，返回已完成报告与错误信息，不产生部分脏产物

## 快速开始

```bash
npm install @liuhange/dsh-data-asset-orchestration
```

在你的 DSH 智能体中触发：

```
用户请求"数据资产化处理" → 自动执行 mask → clean → inventory → package
```

## Skill: data-asset-orchestration

- **触发条件**：用户请求"数据资产化处理"或"完整处理这份数据"
- **执行顺序**：mask_sensitive_data → clean_data → inventory_data → package_data_asset
- **输出**：Aggregated 4 reports（masking、cleaning、inventory、packaging manual）
- **失败处理**：首个失败即停，返回已完成报告 + 错误

## Known Limitations and Deferred Work

- Timeout handling uses fixed thresholds (30s per stage, 180s total)
- Inter-plugin communication via ctx.tools.call string names

---

## Data Asset Suite — 全系列包（共 32 个包）

本包是 **@liuhange/dsh** 数据资产治理系列的编排主包。安装本包后，推荐按需安装以下配套包，以获得端到端的数据资产化能力。

### 编排入口

| 包名 | 说明 |
| --- | --- |
| `@liuhange/dsh-data-asset-orchestration` | 数据资产编排主包：脱敏 → 清洗 → 盘点 → 封装 |

### 共享基础

| 包名 | 说明 |
| --- | --- |
| `@liuhange/dsh-data-asset-shared` | 共享类型与工具（基础依赖） |

### 核心资产治理

| 包名 | 说明 |
| --- | --- |
| `@liuhange/dsh-data-asset-inventory-scan` | 资产盘点扫描 |
| `@liuhange/dsh-data-asset-quality-score` | 资产质量评分 |
| `@liuhange/dsh-data-asset-valuation` | 资产估值 |
| `@liuhange/dsh-data-asset-compliance-check` | 资产合规检查 |
| `@liuhange/dsh-data-asset-registration-helper` | 数据资产登记助手 |
| `@liuhange/dsh-data-asset-attestation` | 数据资产认证报告 |

### 数据治理工具链

| 包名 | 说明 |
| --- | --- |
| `@liuhange/dsh-data-cleaning` | 数据清洗 |
| `@liuhange/dsh-data-inventory` | 数据目录盘点 |
| `@liuhange/dsh-data-lineage` | 数据血缘追踪 |
| `@liuhange/dsh-data-masking` | 数据脱敏 |
| `@liuhange/dsh-data-packaging` | 数据封装 |
| `@liuhange/dsh-data-quality-scoring` | 数据质量打分 |
| `@liuhange/dsh-data-sensitivity-classification` | 数据敏感度分类 |

### 可视化与登记

| 包名 | 说明 |
| --- | --- |
| `@liuhange/dsh-data-visualization` | 数据可视化 |
| `@liuhange/dsh-data-circulation-assessor` | 数据流通评估 |
| `@liuhange/dsh-generate-registration-docs` | 登记文档生成 |
| `@liuhange/dsh-match-registration-agency` | 登记机构匹配 |
| `@liuhange/dsh-registration-precheck` | 登记预检 |
| `@liuhange/dsh-visibility-doctor` | 曝光度诊断工具 |

### 巡检与合规检查器

| 包名 | 说明 |
| --- | --- |
| `@liuhange/dsh-gov-data-inspector` | 政务办事指南审计 |
| `@liuhange/dsh-fin-aml-checker` | 金融反洗钱检查 |
| `@liuhange/dsh-geo-data-quality-inspector` | 地理数据质量检查 |
| `@liuhange/dsh-underground-pipeline-inspector` | 地下管线数据检查 |
| `@liuhange/dsh-research-data-provenance` | 科研数据溯源检查 |
| `@liuhange/dsh-ai-dataset-inspector` | AI 数据集质量检查 |
| `@liuhange/dsh-construction-data-inventory` | 建筑数据资产盘点 |
| `@liuhange/dsh-city-data-classifier` | 城市数据分类器 |

### 政务配置包

| 包名 | 说明 |
| --- | --- |
| `@liuhange/gov-config-gd` | 广东政务配置包 |
| `@liuhange/gov-config-zj` | 浙江政务配置包 |
| `@liuhange/gov-config-schema` | 政务配置 Schema |

### 一键安装全系列（按分组）

```bash
pnpm add @liuhange/dsh-data-asset-orchestration @liuhange/dsh-data-asset-shared
pnpm add @liuhange/dsh-data-asset-inventory-scan @liuhange/dsh-data-asset-quality-score @liuhange/dsh-data-asset-valuation @liuhange/dsh-data-asset-compliance-check @liuhange/dsh-data-asset-registration-helper @liuhange/dsh-data-asset-attestation
pnpm add @liuhange/dsh-data-cleaning @liuhange/dsh-data-inventory @liuhange/dsh-data-lineage @liuhange/dsh-data-masking @liuhange/dsh-data-packaging @liuhange/dsh-data-quality-scoring @liuhange/dsh-data-sensitivity-classification
pnpm add @liuhange/dsh-data-visualization @liuhange/dsh-data-circulation-assessor @liuhange/dsh-generate-registration-docs @liuhange/dsh-match-registration-agency @liuhange/dsh-registration-precheck @liuhange/dsh-visibility-doctor
pnpm add @liuhange/dsh-gov-data-inspector @liuhange/dsh-fin-aml-checker @liuhange/dsh-geo-data-quality-inspector @liuhange/dsh-underground-pipeline-inspector @liuhange/dsh-research-data-provenance @liuhange/dsh-ai-dataset-inspector @liuhange/dsh-construction-data-inventory @liuhange/dsh-city-data-classifier
pnpm add @liuhange/gov-config-gd @liuhange/gov-config-zj @liuhange/gov-config-schema
```

> 仓库地址：https://github.com/liuhange789/data-asset-inspector