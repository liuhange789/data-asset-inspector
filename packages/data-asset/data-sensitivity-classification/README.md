# @liuhange/dsh-data-sensitivity-classification

数据敏感度自动分级插件：自动识别数据字段敏感度等级（公开/内部/机密/绝密），并推荐相应脱敏策略。

## Tool 接口

### `classify_sensitivity`

自动识别数据文件中各字段的敏感度等级，生成分级报告和脱敏策略推荐。

**参数：**
- `filePath` (string, 必填): 待分级数据文件路径
- `outputPathDir` (string, 可选): 报告输出目录，默认数据文件所在目录
- `sampleSize` (string, 可选): 样本大小，默认 100

**输出：?**
- `classification_report.json`: 分级 JSON 报告
- `classification_report.md`: 分级 Markdown 报告（首行 `【数据敏感度分级报告】`）

## 敏感度等级

| 等级 | 说明 | 推荐策略 |
|------|------|---------|
| Public | 公开 | none（不脱敏） |
| Internal | 内部 | partial（部分脱敏） |
| Confidential | 机密 | full（完全脱敏） |
| Secret | 绝密 | encrypt（加密脱敏） |

## 识别方法

1. 字段名模式匹配：根据字段名正&则表达式匹配
2. 字段值样本匹配：字段名未匹配时，取前 N 个样本值匹配正则
3. 均未匹配时使用默认等级（Internal）

## 配置节点

`business-rules.json` → `sensitivityClassification` 节点。缺失时使用默认规则。正则编译失败的规则自动跳过并记录。

## v1.0 兼容性

本插件为 v2.0 新增，不影响 v1.0 功能。配置缺失时降级到默认分级规则。