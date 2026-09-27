# 变更记录

## [3.1.2] - 2026-09-27

### Bug修复（P0严重×5 + P1高危×40 + P2中危×50）

- **P0**: generate-registration-docs/registration-precheck execute无try-catch → 已修复
- **P0**: gov-data-inspector 18字段类型断言 → 添加12项运行时校验
- **P1**: 12个插件execute添加外层try-catch错误处理
- **P1**: data-asset-valuation除以零防护（depreciationYears≤0, discountRate=-1）
- **P1**: data-asset-quality-score weights undefined防护
- **P1**: data-quality-scoring weightSum=0回退均分权重
- **P1**: data-masking sensitivePatterns undefined跳过
- **P1**: data-asset-shared xlsx二进制格式读写改为抛明确错误
- **P2**: 12个插件name导出添加@liuhange/dsh-前缀
- **P2**: 4处`??`改`||`（空字符串不触发空值合并）

### 曝光量优化

- 全部24个插件npm关键词扩展至20+个（typescript/nodejs/automation/audit/compliance/data-governance等）
- README添加9个徽章（npm downloads/TypeScript/Node.js/Tests/Plugins/DSH）
- LICENSE文件添加（MIT）
- CHANGELOG更新

### 验证结果

- TypeScript编译：24/24通过
- 测试：403/403通过

---

## [3.1.0] - 2026-09-12

### Added
- v3.0数据资产入表模块：盘点扫描/质量评分/估值/合规审查/登记助手/质量确权
- v3.1政务与AI扩展模块：政务数据巡检/城市数据分类/AI数据集检查/数据流通评估/登记材料生成/登记预检/登记机构匹配/可见性诊断

---

## [2.0.0] - 2026-08-22

### 新增功能

- **数据质量评分** (`@liuhange/dsh-data-quality-scoring@2.0.0`)
  - 四维度评分模型：完整性、准确性、一致性、时效性
  - 加权综合评分计算器
  - 质量问题采集与改进建议生成
  - 质量报告生成器（含评分明细与趋势分析）

- **数据血缘追踪** (`@liuhange/dsh-data-lineage@2.0.0`)
  - 基于内容哈希的数据指纹计算
  - 血缘记录与链式追溯构建
  - Mermaid 流程图自动生成
  - 编排钩子集成（自动记录每次处理的数据流转）

- **可视化报表** (`@liuhange/dsh-data-visualization@2.0.0`)
  - 自包含 HTML 报表（零依赖，可离线打开）
  - 5 种交互式图表：柱状图、饼图、雷达图、对比图、流程图
  - 报表数据加载器与模板引擎
  - 交互脚本（筛选、排序、导出）

- **数据敏感度自动分级** (`@liuhange/dsh-data-sensitivity-classification@2.0.0`)
  - 四级分类：公开、内部、机密、绝密
  - 字段名模式匹配 + 字段值采样匹配
  - 分级策略推荐器（推荐脱敏强度与访问控制策略）
  - 分级报告生成器

- **增量处理模式** (`@liuhange/dsh-data-asset-orchestration@2.0.0`)
  - 基于文件哈希的增量检测器
  - 状态持久化管理器（JSON 文件存储）
  - Cron 定时调度器
  - 并发锁机制（防止重复执行）

- **高级脱敏算法** (`@liuhange/dsh-data-masking@2.0.0`)
  - 格式保留加密（FPE，保持数据格式不变）
  - k-匿名算法（泛化+抑制，满足 k-匿名隐私模型）
  - 差分隐私算法（拉普拉斯机制 + 预算追踪）
  - 哈希脱敏算法（SHA-256 + 盐值）
  - 高级脱敏执行器（统一调度多种算法）
  - 隐私预算追踪器（防止差分隐私预算超支）

### 增强

- `data-asset-shared` 新增 v2.0 类型定义与默认配置（6 个新配置节点）
- `business-rules.json` 新增 6 个可选配置节点：`qualityScoring`、`lineage`、`advancedMasking`、`visualization`、`sensitivityClassification`、`incrementalScheduling`
- `cordis.yml` 新增 4 个插件加载条目
- 全部 10 个包通过 TypeScript 严格模式类型检查

### 测试

- 新增 20 个测试文件，298 个测试用例，100% 通过率
- 语句覆盖率 86.58%（超过 80% 目标）
- 修复 6 个 v1.0 测试文件的包路径引用

### 向后兼容

- v1.0 的 4 个 Tool 插件（脱敏、清洗、盘点、包装）接口不变
- v1.0 编排 Skill 接口不变，增量模式为可选启用
- `business-rules.json` 新增节点全部可选，不配置时使用默认值
- v1.0 用户无需修改任何代码即可升级到 v2.0

### npm 发布

- `@liuhange/dsh-data-asset-shared@2.0.0`
- `@liuhange/dsh-data-masking@2.0.0`
- `@liuhange/dsh-data-asset-orchestration@2.0.0`
- `@liuhange/dsh-data-quality-scoring@2.0.0`
- `@liuhange/dsh-data-lineage@2.0.0`
- `@liuhange/dsh-data-visualization@2.0.0`
- `@liuhange/dsh-data-sensitivity-classification@2.0.0`

---

## [1.0.0] - 2026-08-17

### 初始功能

- 数据脱敏插件（FULL/PARTIAL/GENERALIZE 三级脱敏）
- 数据清洗插件（去重、格式标准化、异常值检测）
- 数据盘点插件（目录扫描、价值评估、资产清单生成）
- 数据包装插件（产品说明书生成、合规声明、定价建议）
- 全流程编排 Skill（脱敏→清洗→盘点→包装流水线）
- 共享基础包（商业规则加载、文件格式适配、报告生成、审计日志）
- 商业规则全部从 `config/business-rules.json` 读取，零硬编码