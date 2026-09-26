# @liuhange/dsh-data-quality-scoring

数据质量评分插件：对数据完整性、准确性、一致性、时效性多维度评分，生成质量报告和改进建议。


## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-data-quality-scoring
```

## Tool 接口

### `score_data_quality`

对数据文件进行多维度质量评分，生成 JSON + Markdown 双格式报告。

**参数：**
- `filePath` (string, 必填): 待评分数据文件路径
- `outputPathDir` (string, 可选): 报告输出目录，默认数据文件所在目录

**输出：**
- `quality_report.json`: 质量评分 JSON 报告
- `quality_report.md`: 质量评分 Markdown 报告（首行 `【数据质量评分报告】`）

## 评分维度

| 维度 | 说明 | 计算方式 |
|------|------|---------|
| 完整性 | 缺失值比例 | (非缺失值总数 / 字段值总数) × 100 |
| 准确性 | 格式合规率 + 值域合规率 | 加权平均 × 100 |
| 一致性 | 跨字段约束满足率 | (满足约束记录数 / 受约束记录数) × 100 |
| 时效性 | 数据新鲜度 | (1 - 过期比例) × 100 |

## 配置节点

`business-rules.json` → `qualityScoring` 节点。缺失时使用默认配置（权重各 0.25，阈值 60）。

## v1.0 兼容性

本插件为 v2.0 新增，不影响 v1.0 功能。配置缺失时降级到默认评分规则。