# 📦 DSH 数据资产治理全系列矩阵 (共 32 个包)

> 💡 **架构说明**：本项目采用微内核架构，主包与各功能插件**独立发版、按需迭代**。核心政府巡检插件已历经多轮真实政务网站验收（番禺/开封/苏州三城，逻辑/语义/格式检出率 100%，误报率 0%），429 单元测试全通过。

## 🏛️ 核心引擎（王牌）

| 包名 | 版本 | 状态 | 说明 |
| :--- | :--- | :--- | :--- |
| [`@liuhange/dsh-gov-data-inspector`](https://www.npmjs.com/package/@liuhange/dsh-gov-data-inspector) | **v3.6.5** | ✅ 生产就绪 | 政务办事指南巡检，429测试全通过，三城验收误报率0% |

## 🛠️ 核心编排

| 包名 | 版本 | 状态 | 说明 |
| :--- | :--- | :--- | :--- |
| [`@liuhange/dsh-data-asset-orchestration`](https://www.npmjs.com/package/@liuhange/dsh-data-asset-orchestration) | 3.1.2 | ✅ 稳定 | 编排主包，一键串联脱敏→清洗→盘点→封装 |
| [`@liuhange/dsh-data-asset-shared`](https://www.npmjs.com/package/@liuhange/dsh-data-asset-shared) | 3.2.3 | ✅ 稳定 | 共享类型与工具（基础依赖） |
| [`@liuhange/dsh-data-asset-inventory-scan`](https://www.npmjs.com/package/@liuhange/dsh-data-asset-inventory-scan) | 3.1.5 | ✅ 稳定 | 资产盘点扫描，深度元数据扫描+三性检测 |
| [`@liuhange/dsh-data-asset-quality-score`](https://www.npmjs.com/package/@liuhange/dsh-data-asset-quality-score) | 3.1.5 | ✅ 稳定 | 资产质量评分，六维量化评分 |

## 🧹 数据治理工具链

| 包名 | 版本 | 状态 | 说明 |
| :--- | :--- | :--- | :--- |
| [`@liuhange/dsh-data-masking`](https://www.npmjs.com/package/@liuhange/dsh-data-masking) | 3.0.4 | ✅ 稳定 | 数据脱敏，敏感字段识别与分级脱敏 |
| [`@liuhange/dsh-data-cleaning`](https://www.npmjs.com/package/@liuhange/dsh-data-cleaning) | 3.0.4 | ✅ 稳定 | 数据清洗，去重+格式标准化+异常值处理 |
| [`@liuhange/dsh-data-inventory`](https://www.npmjs.com/package/@liuhange/dsh-data-inventory) | 3.0.4 | ✅ 稳定 | 数据目录盘点 |
| [`@liuhange/dsh-data-lineage`](https://www.npmjs.com/package/@liuhange/dsh-data-lineage) | 2.0.5 | ✅ 稳定 | 数据血缘追踪 |
| [`@liuhange/dsh-data-packaging`](https://www.npmjs.com/package/@liuhange/dsh-data-packaging) | 3.0.4 | ✅ 稳定 | 数据封装，产品说明书生成 |
| [`@liuhange/dsh-data-quality-scoring`](https://www.npmjs.com/package/@liuhange/dsh-data-quality-scoring) | 2.0.5 | ✅ 稳定 | 数据质量打分，多维度评分 |
| [`@liuhange/dsh-data-sensitivity-classification`](https://www.npmjs.com/package/@liuhange/dsh-data-sensitivity-classification) | 2.0.5 | ✅ 稳定 | 数据敏感度分类 |
| [`@liuhange/dsh-data-visualization`](https://www.npmjs.com/package/@liuhange/dsh-data-visualization) | 2.0.5 | ✅ 稳定 | 数据可视化，自包含HTML报告 |

## 📋 登记注册工具链

| 包名 | 版本 | 状态 | 说明 |
| :--- | :--- | :--- | :--- |
| [`@liuhange/dsh-data-asset-registration-helper`](https://www.npmjs.com/package/@liuhange/dsh-data-asset-registration-helper) | 3.1.5 | ✅ 稳定 | 数据资产登记助手 |
| [`@liuhange/dsh-generate-registration-docs`](https://www.npmjs.com/package/@liuhange/dsh-generate-registration-docs) | 3.0.4 | ✅ 稳定 | 登记文档生成 |
| [`@liuhange/dsh-match-registration-agency`](https://www.npmjs.com/package/@liuhange/dsh-match-registration-agency) | 3.0.4 | ✅ 稳定 | 登记机构匹配 |
| [`@liuhange/dsh-registration-precheck`](https://www.npmjs.com/package/@liuhange/dsh-registration-precheck) | 3.0.4 | ✅ 稳定 | 登记预检 |

## 💰 数据资产评估

| 包名 | 版本 | 状态 | 说明 |
| :--- | :--- | :--- | :--- |
| [`@liuhange/dsh-data-asset-valuation`](https://www.npmjs.com/package/@liuhange/dsh-data-asset-valuation) | 3.1.5 | ✅ 稳定 | 资产估值，成本法+收益法+市场法 |
| [`@liuhange/dsh-data-asset-compliance-check`](https://www.npmjs.com/package/@liuhange/dsh-data-asset-compliance-check) | 3.1.5 | ✅ 稳定 | 资产合规检查 |
| [`@liuhange/dsh-data-asset-attestation`](https://www.npmjs.com/package/@liuhange/dsh-data-asset-attestation) | 3.1.3 | ✅ 稳定 | 数据资产认证报告 |
| [`@liuhange/dsh-data-circulation-assessor`](https://www.npmjs.com/package/@liuhange/dsh-data-circulation-assessor) | 3.1.3 | ✅ 稳定 | 数据流通评估 |

## 🔍 行业检测插件

| 包名 | 版本 | 状态 | 说明 |
| :--- | :--- | :--- | :--- |
| [`@liuhange/dsh-fin-aml-checker`](https://www.npmjs.com/package/@liuhange/dsh-fin-aml-checker) | 3.1.3 | ✅ 稳定 | 金融反洗钱合规检查 |
| [`@liuhange/dsh-research-data-provenance`](https://www.npmjs.com/package/@liuhange/dsh-research-data-provenance) | 3.1.3 | ✅ 稳定 | 科研数据溯源，FAIR原则审计 |
| [`@liuhange/dsh-ai-dataset-inspector`](https://www.npmjs.com/package/@liuhange/dsh-ai-dataset-inspector) | 3.1.4 | ✅ 稳定 | AI训练数据集质检 |
| [`@liuhange/dsh-construction-data-inventory`](https://www.npmjs.com/package/@liuhange/dsh-construction-data-inventory) | 3.2.2 | ✅ 稳定 | 建筑工程数据资产盘点 |
| [`@liuhange/dsh-geo-data-quality-inspector`](https://www.npmjs.com/package/@liuhange/dsh-geo-data-quality-inspector) | 1.0.2 | ✅ 稳定 | 地理空间数据质量检查 |
| [`@liuhange/dsh-underground-pipeline-inspector`](https://www.npmjs.com/package/@liuhange/dsh-underground-pipeline-inspector) | 1.0.2 | ✅ 稳定 | 地下管线数据质量检查 |
| [`@liuhange/dsh-city-data-classifier`](https://www.npmjs.com/package/@liuhange/dsh-city-data-classifier) | 3.1.3 | ✅ 稳定 | 城市数据AI分类器 |

## 🏛️ 政务配置包

| 包名 | 版本 | 状态 | 说明 |
| :--- | :--- | :--- | :--- |
| [`@liuhange/gov-config-gd`](https://www.npmjs.com/package/@liuhange/gov-config-gd) | 2026.1.1 | ✅ 稳定 | 广东省政务数据巡检配置包 |
| [`@liuhange/gov-config-zj`](https://www.npmjs.com/package/@liuhange/gov-config-zj) | 2026.1.1 | ✅ 稳定 | 浙江省政务数据巡检配置包 |
| [`@liuhange/gov-config-schema`](https://www.npmjs.com/package/@liuhange/gov-config-schema) | 2026.1.1 | ✅ 稳定 | 政务配置包JSON Schema |

## 🔧 生态工具

| 包名 | 版本 | 状态 | 说明 |
| :--- | :--- | :--- | :--- |
| [`@liuhange/dsh-visibility-doctor`](https://www.npmjs.com/package/@liuhange/dsh-visibility-doctor) | 1.0.3 | ✅ 稳定 | 插件曝光度诊断与采用率提升CLI |

---

## 📥 一键安装全系列（按分组）

```bash
# 核心引擎 + 编排
pnpm add @liuhange/dsh-gov-data-inspector @liuhange/dsh-data-asset-orchestration @liuhange/dsh-data-asset-shared

# 资产治理
pnpm add @liuhange/dsh-data-asset-inventory-scan @liuhange/dsh-data-asset-quality-score @liuhange/dsh-data-asset-valuation @liuhange/dsh-data-asset-compliance-check @liuhange/dsh-data-asset-registration-helper @liuhange/dsh-data-asset-attestation

# 数据治理工具链
pnpm add @liuhange/dsh-data-masking @liuhange/dsh-data-cleaning @liuhange/dsh-data-inventory @liuhange/dsh-data-lineage @liuhange/dsh-data-packaging @liuhange/dsh-data-quality-scoring @liuhange/dsh-data-sensitivity-classification @liuhange/dsh-data-visualization

# 登记注册
pnpm add @liuhange/dsh-generate-registration-docs @liuhange/dsh-match-registration-agency @liuhange/dsh-registration-precheck

# 行业检测
pnpm add @liuhange/dsh-fin-aml-checker @liuhange/dsh-research-data-provenance @liuhange/dsh-ai-dataset-inspector @liuhange/dsh-construction-data-inventory @liuhange/dsh-geo-data-quality-inspector @liuhange/dsh-underground-pipeline-inspector @liuhange/dsh-city-data-classifier

# 政务配置
pnpm add @liuhange/gov-config-gd @liuhange/gov-config-zj @liuhange/gov-config-schema
```

> 仓库地址：https://github.com/liuhange789/data-asset-inspector