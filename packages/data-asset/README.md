# 数据资产体检仪 (Data Asset Inspector)

基于 DeepSeek Harness 的数据资产化插件，实现脱敏→清洗→盘点→包装全流程自动化。

## 安装方式

```bash
npm install @liuhange/dsh-data-asset-shared
npm install @liuhange/dsh-data-masking
npm install @liuhange/dsh-data-cleaning
npm install @liuhange/dsh-data-inventory
npm install @liuhange/dsh-data-packaging
npm install @liuhange/dsh-data-asset-orchestration
```

## 功能模块

| 模块 | 包名 | 功能 |
|------|------|------|
| 共享基础 | @liuhange/dsh-data-asset-shared | 商业规则加载、文件格式适配、报告生成、审计日志 |
| 数据脱敏 | @liuhange/dsh-data-masking | 敏感字段识别与分级脱敏（FULL/PARTIAL/GENERALIZE） |
| 数据清洗 | @liuhange/dsh-data-cleaning | 去重、格式标准化、异常值检测 |
| 数据盘点 | @liuhange/dsh-data-inventory | 目录扫描、价值评估、资产清单生成 |
| 数据包装 | @liuhange/dsh-data-packaging | 产品说明书生成、合规声明、定价建议 |
| 全流程编排 | @liuhange/dsh-data-asset-orchestration | 一键执行脱敏→清洗→盘点→包装 |

## 快速开始

```bash
pnpm dsh web --patch ./packages/data-asset/cordis.yml
```

## 商业规则配置

所有规则存储在 `config/business-rules.json`，修改规则无需改代码。

## License

MIT