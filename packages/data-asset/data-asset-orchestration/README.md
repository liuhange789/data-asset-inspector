# @liuhange/dsh-data-asset-orchestration

Data asset orchestration skill for DeepSeek Harness. Sequentially executes masking → cleaning → inventory → packaging.


## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-data-asset-orchestration
```

## Skill: data-asset-orchestration

- **Trigger**: User requests "数据资产化处理" or "完整处理这份数据"
- **Execution order**: mask_sensitive_data → clean_data → inventory_data → package_data_asset
- **Output**: Aggregated 4 reports (masking, cleaning, inventory, packaging manual)
- **Failure handling**: Stops on first failure, returns completed reports + error

## Known Limitations and Deferred Work

- Timeout handling uses fixed thresholds (30s per stage, 180s total)
- Inter-plugin communication via ctx.tools.call string names

---

## Data Asset Suite — 全系列包

本包是 **@liuhange/dsh** 数据资产治理系列（共 19 个包）的编排主包。安装本包后，推荐按需安装以下配套包，以获得端到端的数据资产化能力。

### 核心资产治理

| 包名 | 版本 | 说明 |
| --- | --- | --- |
| `@liuhange/dsh-data-asset-shared` | 3.1.2 | 共享类型与工具（基础依赖） |
| `@liuhange/dsh-data-asset-inventory-scan` | 3.1.2 | 资产盘点扫描 |
| `@liuhange/dsh-data-asset-quality-score` | 3.1.2 | 质量评分 |
| `@liuhange/dsh-data-asset-valuation` | 3.1.2 | 资产估值 |
| `@liuhange/dsh-data-asset-compliance-check` | 3.1.2 | 合规检查 |
| `@liuhange/dsh-data-asset-registration-helper` | 3.1.2 | 登记助手 |

### 数据治理工具链

| 包名 | 版本 | 说明 |
| --- | --- | --- |
| `@liuhange/dsh-data-cleaning` | 3.0.1 | 数据清洗 |
| `@liuhange/dsh-data-inventory` | 3.0.1 | 数据目录 |
| `@liuhange/dsh-data-lineage` | 2.0.2 | 数据血缘 |
| `@liuhange/dsh-data-masking` | 3.0.1 | 数据脱敏 |
| `@liuhange/dsh-data-packaging` | 3.0.1 | 数据封装 |
| `@liuhange/dsh-data-quality-scoring` | 2.0.2 | 质量打分 |
| `@liuhange/dsh-data-sensitivity-classification` | 2.0.2 | 敏感度分类 |

### 可视化与登记

| 包名 | 版本 | 说明 |
| --- | --- | --- |
| `@liuhange/dsh-data-visualization` | 2.0.2 | 数据可视化 |
| `@liuhange/dsh-generate-registration-docs` | 3.0.1 | 登记文档生成 |
| `@liuhange/dsh-match-registration-agency` | 3.0.1 | 登记机构匹配 |
| `@liuhange/dsh-registration-precheck` | 3.0.1 | 登记预检 |
| `@liuhange/dsh-visibility-doctor` | 1.0.0 | 曝光度诊断工具 |

### 一键安装全系列

```bash
pnpm add @liuhange/dsh-data-asset-shared @liuhange/dsh-data-asset-inventory-scan @liuhange/dsh-data-asset-quality-score @liuhange/dsh-data-asset-valuation @liuhange/dsh-data-asset-compliance-check @liuhange/dsh-data-asset-registration-helper @liuhange/dsh-data-cleaning @liuhange/dsh-data-inventory @liuhange/dsh-data-lineage @liuhange/dsh-data-masking @liuhange/dsh-data-packaging @liuhange/dsh-data-quality-scoring @liuhange/dsh-data-sensitivity-classification @liuhange/dsh-data-visualization @liuhange/dsh-generate-registration-docs @liuhange/dsh-match-registration-agency @liuhange/dsh-registration-precheck @liuhange/dsh-visibility-doctor
```

> 仓库地址：https://github.com/liuhange789/data-asset-inspector