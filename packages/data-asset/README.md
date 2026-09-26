# 数据资产体检仪 (Data Asset Inspector)

基于 DeepSeek Harness 的全领域数据资产管理插件系统，24个插件覆盖"脱敏→清洗→盘点→质量→估值→合规→登记→政务→AI→流通"完整业务链路。

## 全部24个插件

### 基础模块

| 模块 | 包名 | 功能 |
|------|------|------|
| 共享基础 | @liuhange/dsh-data-asset-shared | 类型定义、配置加载、政策依据引用、文件格式适配 |

### v1.0 核心处理模块

| 模块 | 包名 | 功能 |
|------|------|------|
| 数据脱敏 | @liuhange/dsh-data-masking | 敏感字段识别与分级脱敏（FULL/PARTIAL/GENERALIZE）+ FPE/k-匿名/差分隐私/哈希 |
| 数据清洗 | @liuhange/dsh-data-cleaning | 去重、格式标准化、异常值检测 |
| 数据盘点 | @liuhange/dsh-data-inventory | 目录扫描、价值评估、资产清单生成 |
| 数据包装 | @liuhange/dsh-data-packaging | 产品说明书生成、合规声明、定价建议 |
| 全流程编排 | @liuhange/dsh-data-asset-orchestration | 全量+增量处理模式，Cron 调度，垂直链执行 |

### v2.0 质量与可视化模块

| 模块 | 包名 | 功能 |
|------|------|------|
| 质量评分 | @liuhange/dsh-data-quality-scoring | 四维度评分（完整性/准确性/一致性/时效性）+ 改进建议 |
| 血缘追踪 | @liuhange/dsh-data-lineage | 数据流转路径追踪 + Mermaid 可视化 + 链式校验 |
| 可视化报表 | @liuhange/dsh-data-visualization | 自包含 HTML + 5种交互式图表 |
| 敏感度分级 | @liuhange/dsh-data-sensitivity-classification | 四级自动分级（公开/内部/机密/绝密）+ 策略推荐 |

### v3.0 数据资产入表模块

| 模块 | 包名 | 功能 |
|------|------|------|
| 资产盘点扫描 | @liuhange/dsh-data-asset-inventory-scan | 目录扫描、元数据提取、资产编目 |
| 资产质量评分 | @liuhange/dsh-data-asset-quality-score | 六维质量评分（规范性/完整性/准确性/一致性/时效性/可访问性） |
| 资产估值 | @liuhange/dsh-data-asset-valuation | 成本法/收益法/市场法估值、资本化追溯禁止 |
| 合规审查 | @liuhange/dsh-data-asset-compliance-check | 合规检查、全过程管理试点依据嵌入 |
| 登记助手 | @liuhange/dsh-data-asset-registration-helper | 三重审核、七步流程、登记材料生成 |
| 质量确权 | @liuhange/dsh-data-asset-attestation | 数据质量确权、第三方认证对接 |

### v3.1 政务与AI扩展模块

| 模块 | 包名 | 功能 |
|------|------|------|
| 政务数据巡检 | @liuhange/dsh-gov-data-inspector | 办事指南五维检测+官方数据!源对接+公共数据分类 |
| 城市数据分类 | @liuhange/dsh-city-data-classifier | 城市数据资产分类、GB/T 47949映射 |
| AI数据集检查 | @liuhange/dsh-ai-dataset-inspector | AI训练数据集质量检查、偏见检测 |
| 数据流通评估 | @liuhange/dsh-data-circulation-assessor | 数据流通可行性评估、风险分级 |
| 登记材料生成 | @liuhange/dsh-generate-registration-docs | 自动生成登记申请材料 |
| 登记预检 | @liuhange/dsh-registration-precheck | 登记条件预检、失败项诊断 |
| 登记机构匹配 | @liuhange/dsh-match-registration-agency | 数据类型→登记机构智能匹配 |
| 可见性诊断 | @liuhange/dsh-visibility-doctor | npm/GitHub可见性诊断、DSH插件市场收录检查 |

## 安装方式

```bash
npm install @liuhange/dsh-data-asset-shared
npm install @liuhange/dsh-data-masking
npm install @liuhange/dsh-data-cleaning
npm install @liuhange/dsh-data-inventory
npm install @liuhange/dsh-data-packaging
npm install @liuhange/dsh-data-asset-orchestration
npm install @liuhange/dsh-data-quality-scoring
npm install @liuhange/dsh-data-lineage
npm install @liuhange/dsh-data-visualization
npm install @liuhange/dsh-data-sensitivity-classification
npm install @liuhange/dsh-data-asset-inventory-scan
npm install @liuhange/dsh-data-asset-quality-score
npm install @liuhange/dsh-data-asset-valuation
npm install @liuhange/dsh-data-asset-compliance-check
npm install @liuhange/dsh-data-asset-registration-helper
npm install @liuhange/dsh-data-asset-attestation
npm install @liuhange/dsh-gov-data-inspector
npm install @liuhange/dsh-city-data-classifier
npm install @liuhange/dsh-ai-dataset-inspector
npm install @liuhange/dsh-data-circulation-assessor
npm install @liuhange/dsh-generate-registration-docs
npm install @liuhange/dsh-registration-precheck
npm install @liuhange/dsh-match-registration-agency
npm install @liuhange/dsh-visibility-doctor
```

## 快速开始

```bash
pnpm dsh web --patch ./packages/data-asset/cordis.yml
```

## 商业规则配置

所有规则存储在 `config/business-rules.json`，修改规则无需改代码。

## License

MIT