# @liuhange/dsh-construction-data-inventory

> 建筑工程项目数据资产盘点插件

## 插件职责

对建筑工程项目产生的多源异构数据进行资产化盘点，实现符合 GB/T 51269 标准的分类编码与可追溯资产台账输出。

## 法规依据

《建筑信息模型分类和编码标准》（GB/T 51269-2017）

## 法律免责声明

本报告由辅助盘点工具生成，不替代GB/T 51269标准的正式合规认证

## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-construction-data-inventory
```

## 工具

### inspect_ai_dataset

对建筑工程项目多源异构数据进行资产化盘点，按 GB/T 51269 标准生成分类编码与资产台账。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| projectId | string | 是 | 建筑工程项目标识 |
| sourceConfigPath | string | 是 | 数据源配置文件路径 |
| changeDataPath | string | 否 | 变更单数据文件路径 |
| outputPathDir | string | 否 | 报告输出目录 |

### submit_review_override

提交人工复核覆盖指令，对自动分类与编码结果进行人工覆盖并记录覆盖理由。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| assetId | string | 是 | 被覆盖的资产标识 |
| reviewItem | string | 是 | 复核项（classification/encoding/changeTraceability） |
| overrideConclusion | string | 是 | 覆盖后结论 |
| overrideReason | string | 是 | 覆盖理由 |
| operator | string | 是 | 操作人标识 |
| inventoryReportPath | string | 是 | 盘点报告路径 |

## 配置文件

### config/classification-config.json

GB/T 51269 分类体系配置，包含建设成果（10-15）、建设进程（20-22）、建设资源（30-32, 40）、建设属性（41）四大类。

### config/encoding-rule-config.json

资产编码规则配置，包含分类层级码长度、顺序码长度、顺序码起始值、校验位算法。

### config/source-adapter-config.json

数据源适配器配置，定义 IFC/合同/进度/验收四类适配器。

## 技术栈

- TypeScript 5.7
- Node.js 22+
- DeepSeek Harness 插件框架
- Vitest