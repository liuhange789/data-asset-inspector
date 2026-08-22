# @liuhange/dsh-data-lineage

数据血缘追踪插件：追踪数据从源头到最终产品的流转路径，支持链式追溯和 Mermaid 可视化。

## Tool 接口

### `trace_data_lineage`

导出数据血缘追踪报告，支持 JSON/Mermaid/Markdown 三种格式。

**参数：**
- `lineageFilePath` (string, 必填): 血缘记录文件路径（lineage.json）
- `outputFormat` (string, 可选): 输出格式 `json | mermaid | markdown | all`，默认 `all`

**输出：**
- `lineage_export.json`: 血缘 JSON
- `lineage_export.mmd`: Mermaid 流程图
- `lineage_export_report.md`: Markdown 报告（首行 `【数据血缘追踪报告】`）

## 血缘记录

每个步骤记录：步骤名、时间戳、输入文件路径+hash、输出文件路径+hash、变换规则、处理参数。

## 编排嵌入

通过 `LineageHook` 在编排流程中自动嵌入血缘记录：
- `recordBefore()`: Tool 调用前记录输入文件 hash
- `recordAfter()`: Tool 调用后记录输出文件 hash 和变换规则
- `enabled = false` 时零开销，不计算 hash，不生成文件

## 配置节点

`business-rules.json` → `lineage` 节点。缺失时默认禁用（`enabled: false`），编排行为与 v1.0 完全一致。

## v1.0 兼容性

血缘功能默认禁用，不影响 v1.0 编排行为。启用时额外耗时 ≤ 1 秒/Tool调用。