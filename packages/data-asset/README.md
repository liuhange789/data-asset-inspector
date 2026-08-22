# 数据资产体检仪 (Data Asset Inspector)

基于 DeepSeek Harness 的数据资产化插件系统，实现脱敏→清洗→盘点→包装全流程自动化，v2.0 新增质量评分、血缘追踪、高级脱敏、可视化报表、敏感度分级、增量处理六大功能。

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
```

## 功能模块

### v1.0 核心模块

| 模块 | 包名 | 功能 |
|------|------|------|
| 共享基础 | @liuhange/dsh-data-asset-shared | 商业规则加载、文件格式适配、报告生成、审计日志 |
| 数据脱敏 | @liuhange/dsh-data-masking | 敏感字段识别与分级脱敏（FULL/PARTIAL/GENERALIZE）+ 高级算法（FPE/k-匿名/差分隐私/哈希） |
| 数据清洗 | @liuhange/dsh-data-cleaning | 去重、格式标准化、异常值检测 |
| 数据盘点 | @liuhange/dsh-data-inventory | 目录扫描、价值评估、资产清单生成 |
| 数据包装 | @liuhange/dsh-data-packaging | 产品说明书生成、合规声明、定价建议 |
| 全流程编排 | @liuhange/dsh-data-asset-orchestration | 全量+增量处理模式，Cron 调度 |

### v2.0 新增模块

| 模块 | 包名 | 功能 |
|------|------|------|
| 质量评分 | @liuhange/dsh-data-quality-scoring | 四维度评分（完整性/准确性/一致性/时效性）+ 改进建议 |
| 血缘追踪 | @liuhange/dsh-data-lineage | 数据流转路径追踪 + Mermaid 可视化 + 链式校验 |
| 可视化报表 | @liuhange/dsh-data-visualization | 自包含 HTML + 5种交互式图表 |
| 敏感度分级 | @liuhange/dsh-data-sensitivity-classification | 四级自动分级（公开/内部/机密/绝密）+ 策略推荐 |

## 快速开始

```bash
pnpm dsh web --patch ./packages/data-asset/cordis.yml
```

## 商业规则配置

所有规则存储在 `config/business-rules.json`，修改规则无需改代码。

## License

MIT