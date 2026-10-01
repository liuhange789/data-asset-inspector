# @liuhange/dsh-research-data-provenance

科研数据溯源审计插件。检测科研数据集是否具备可追溯、可复现的完整证据链，实现符合《科学数据管理办法》的溯源审计与六维质量评估。

## 法规依据

- 《科学数据管理办法》（国办发〔2018〕17号）第二条、第九条、第十一条
- 《高质量数据集 建设指南》（TC609-5-2025-01）六大质量维度（准确性、完整性、一致性、时效性、规范性、安全性）

## 法律免责声明

本报告由辅助审计工具生成，不替代学术伦理审查与法人单位的数据管理主体责任

## 安装

```bash
pnpm add @liuhange/dsh-research-data-provenance
```

## 工具

### attest_data_quality

对科研数据集进行溯源审计，检测数据血缘完整性、可复现性与六维质量，输出审计报告与整改建议。

参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| datasetMetadataPath | string | 是 | 数据集元数据文件路径（JSON格式） |
| lineageRecordPath | string | 否 | 数据血缘记录文件路径（缺省则血缘完整度记为0.00） |
| attachmentListPath | string | 否 | 数据集附件清单文件路径（缺省则可复现性记为0.00） |
| qualityRecordsPath | string | 否 | 六维度质量检测输入记录文件路径（JSON格式） |
| outputPathDir | string | 否 | 报告输出目录（默认元数据文件所在目录） |

### submit_review_override

提交人工复核覆盖指令，对自动检测结果进行人工覆盖并记录覆盖理由。

参数：datasetId、detectionItem、overrideConclusion、overrideReason、operator、auditReportPath（均必填）。

## 配置文件

- `config/quality-dimension-config.json`：六维度检测规则、权重、政策依据章节
- `config/remediation-suggestion-config.json`：按缺失项类型索引的整改建议

配置均含 `version`/`lastUpdated` 字段，报告记录所用配置版本号。配置缺失时回退至缺省配置并标注状态。

## 数据安全

- 不读取原始数据文件内容，仅检查元数据、血缘记录与结构信息
- 数据集元数据不离开本地运行环境
- 审计报告不含原始数据内容或敏感字段值

## 人工复核

- 覆盖记录采用 append-only 存储，禁止删除（删除尝试返回 `OVERWRITE_RECORD_IMMUTABLE`）
- 每条覆盖记录包含操作人、操作时间、原结论、新结论、覆盖理由