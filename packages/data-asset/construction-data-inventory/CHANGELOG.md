# Changelog

## 3.2.6

### fix: 工具名去重（消除多包同 Context 装载时的注册冲突）

- `inspect_ai_dataset` 重命名为 `inspect_construction_data`（原名与 @liuhange/dsh-ai-dataset-inspector 冲突）
- `submit_review_override` 重命名为 `construction_submit_review_override`（原名与另外 4 个包冲突）
- 入参、输出结构、业务判定与配置键均未改动

## 3.1.0

### feat: 初始化建筑工程项目数据资产盘点插件

- 实现多源异构数据接入（IFC 模型/合同文本/进度记录/验收文档）
- 实现 GB/T 51269 分类映射（建设成果/建设进程/建设资源/建设属性四大类）
- 实现资产编码生成（分类层级码+顺序码+校验位三段式编码）
- 实现变更追溯检测（关联资产/记录完整性/审批链完整性/影响范围）
- 实现人工复核覆盖记录（append-only，不可删除）
- 实现数据资产盘点报告生成（JSON + Markdown 双格式）
- 实现报告脱敏处理（移除敏感商业信息）
- 注册 inspect_ai_dataset 与 submit_review_override 两个工具