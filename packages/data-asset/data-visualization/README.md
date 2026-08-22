# @liuhange/dsh-data-visualization

可视化报表插件：生成自包含 HTML 报表，含脱敏统计、清洗对比、资产分布、质量评分、血缘追踪五种交互式图表。

## Tool 接口

### `generate_visualization`

读取各插件 JSON 报告，生成自包含 HTML 可视化报表。

**参数：**
- `reportPaths` (string, 必填): JSON 格式的报告路径对象 `{masking, cleaning, inventory, quality, lineage}`
- `outputPath` (string, 必填): HTML 报表输出路径

**输出：**
- `visualization_report.html`: 自包含 HTML 报表（断网可独立打开）

## 图表类型

| 图表 | 说明 | 数据来源 |
|------|------|---------|
| 柱状图 | 脱敏各字段统计 | 脱敏报告 JSON |
| 对比图 | 清洗前后数据量对比 | 清洗报告 JSON |
| 饼图 | 数据资产分类分布 | 盘点报告 JSON |
| 雷达图 | 质量评分多维度展示 | 质量评分 JSON |
| 流程图 | 血缘追踪可视化 | 血缘 JSON |

## 配置节点

`business-rules.json` → `visualization` 节点。缺失时使用默认模板（2列网格、默认配色、交互全启用）。

## 特性

- 自包含 HTML：所有 CSS/JS 内联，无外部依赖，断网可打开
- 交互式：支持展开/折叠详情、切换图表类型
- 容错：部分 JSON 缺失时对应图表显示占位符，其他图表正常
- 配置化：图表配置/布局/配色从配置文件读取