# 数据资产化插件系统 - 编码任务规划

> **任务执行约束**
> - 所有商业判断逻辑（敏感字段模式、脱敏策略、价值评估规则、清洗规则、合规策略、定价规则）必须从 `config/business-rules.json` 读取，代码中不硬编码任何业务判断逻辑。代码中仅保留技术实现（如 Set 去重、正则匹配、文件读写）和默认配置常量（用于配置缺失时的降级）。
> - 所有 TypeScript 函数、方法、变量使用 camelCase 命名（如 `maskSensitiveData`、`cleanData`、`loadBusinessRules`、`packageDataAsset`、`removeDuplicates`、`standardizeFormat`）。
> - 所有包使用 TypeScript + ESM（`"type": "module"`），从 `@deepseek-ai/cordis`、`@deepseek-ai/dsh-tools` 导入，使用 Node.js `fs`/`path` 模块。
> - 严格遵循 DeepSeek Harness 标准插件开发模式：函数插件命名导出 `name`/`inject`/`Config`/`apply`，无默认导出；使用 Schemastery 定义 Config schema；使用 `defineTool` + `ctx.tools.register` 注册 Tool；使用 `ctx.skills.register` 注册 Skill。
> - 包路径：`DeepSeek-Harness/packages/data-asset/<pkg-name>/`，包名：`@deepseek-ai/dsh-<pkg-name>`。
> - 不能修改任何 UI 和现有 Harness 代码，只能新增功能代码。
> - 路径处理必须使用跨平台 API（`path.join`、`path.resolve`），禁止路径穿越攻击。

## 1. 创建商业规则配置文件

### 1.1 创建 `config/business-rules.json` 配置文件
- [x] 在 `DeepSeek-Harness/config/business-rules.json` 创建商业规则配置文件，包含以下节点：
  - `version`: "1.0"
  - `lastUpdated`: "2026-08-17"
  - `valueAssessment`: 高/中/低三档价值评估规则，每档含 `keywords`/`score`/`label`/`recommendation`
  - `sensitivePatterns`: 身份证/手机号/银行卡/邮箱四类敏感字段正则表达式和脱敏级别
  - `cleaningRules`: 缺失值处理策略和质量阈值
  - `compliance`: 三项合规政策（数据产权登记工作指引/数据流通安全治理/数据脱敏工具标准）
  - `packaging`: 合规声明、定价规则、默认描述
- [x] 配置内容必须与 design.md 2.3.2.4 节示例完全一致，确保所有商业判断逻辑的唯一定义源
- [x] 验证 JSON 格式合法，可通过 `JSON.parse` 解析
- **验收标准**：文件存在于 `DeepSeek-Harness/config/business-rules.json`，包含 7 个顶层节点，所有正则表达式以字符串形式存储

## 2. 开发 data-asset-shared 共享基础包（P0 基础）

### 2.1 初始化 `data-asset-shared` 包结构
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-asset-shared/` 创建包目录结构：`src/`、`tests/`、`package.json`、`tsconfig.json`、`README.md`
- [x] 编写 `package.json`：包名 `@deepseek-ai/dsh-data-asset-shared`，`"type": "module"`，`peerDependencies` 包含 `@deepseek-ai/cordis`、`@deepseek-ai/dsh-tools`、`@deepseek-ai/schemastery`，`dependencies` 包含 `csv-parse`、`xlsx` 等格式解析库
- [x] 编写 `tsconfig.json`：extends `tsconfig.base.json`，`rootDir: src`，`outDir: lib/types`，`strict: true`，`noImplicitAny`
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-asset-shared/src/types.ts` 定义所有共享类型：`BusinessRulesConfig`、`ValueAssessmentRules`、`ValueRule`、`SensitivePatterns`、`SensitivePattern`、`CleaningRules`、`CompliancePolicy`、`PackagingRules`、`PricingRule`、`DataFile`、`DataFormat`、`SensitiveField`、`SensitiveFieldType`、`MaskingStrategy`、`ProcessingResult`、`ProcessingStatus`、`ConfigStatus`、`AssetItem`、`ProductManual`、`DataOverview`、`OrchestrationResult`
- **验收标准**：包结构完整，`pnpm install` 后无报错，`pnpm run typecheck` 通过

### 2.2 实现 `BusinessRulesLoader` 商业规则加载器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-asset-shared/src/businessRulesLoader.ts` 实现 `BusinessRulesLoader` 类
- [x] 实现 `load()` 方法：读取 `config/business-rules.json`，按 design.md 2.1.3.4 状态机执行配置降级
  - 文件不存在 → 返回默认规则 + `DEFAULT_MISSING` 状态
  - JSON 解析失败 → 返回默认规则 + `DEFAULT_PARSE` 状态
  - `version` 字段不兼容 v1.0 → 返回默认规则 + `DEFAULT_VERSION` 状态
  - 必要节点缺失 → 返回默认规则 + `DEFAULT_PARTIAL` 状态
  - 配置合法 → 返回配置 + `CONFIG_LOADED` 状态
- [x] 在 `src/defaultBusinessRules.ts` 定义内置默认规则常量（结构与配置文件一致，作为代码常量但不参与业务判断逻辑）
- [x] 使用 Node.js `fs.readFileSync` 同步读取，路径通过 `path.resolve` 解析为绝对路径
- [x] 缓存加载结果，运行时不再重复读取
- **验收标准**：配置缺失/解析失败/版本不兼容/节点缺失/正常加载五种场景均能正确返回对应 `ConfigStatus`，默认规则结构与配置文件一致

### 2.3 实现 `FileFormatAdapter` 文件格式适配器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-asset-shared/src/fileFormatAdapter.ts` 实现 `FileFormatAdapter` 类
- [x] 实现 `detectFormat(filePath)` 方法：按扩展名返回 `'csv' | 'json' | 'txt' | 'xlsx' | 'unknown'`
- [x] 实现 `read(filePath)` 方法：返回 `Promise<{ lines: string[]; format: string; raw: unknown }>`
  - TXT：按行读取，过滤空行
  - CSV：使用 `csv-parse` 解析表头和行，转为行字符串数组
  - JSON：解析对象数组，每行序列化为 JSON 字符串
  - XLSX：使用 `xlsx` 库解析工作表，转为行字符串数组
  - unknown：按 TXT 降级处理
- [x] 实现 `write(filePath, lines, format)` 方法：按格式写入文件
  - TXT：直接写入行字符串
  - CSV：保留首行作为表头，写入 CSV 格式
  - JSON：每行解析为对象，写入 JSON 数组
  - XLSX：使用 `xlsx` 库写入工作表
- [x] 大文件（>= 10MB）采用流式读取，避免内存溢出
- [x] 文件编码默认 UTF-8，其他编码在返回结果中标注警告
- **验收标准**：四种格式（CSV/JSON/TXT/XLSX）均能正确读写，round-trip 一致；unknown 格式降级为 TXT 处理

### 2.4 实现 `ReportGenerator` 报告生成器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-asset-shared/src/reportGenerator.ts` 实现 `ReportGenerator` 类
- [x] 实现 `generateMaskingReport(params)` 方法：生成符合 spec 6.3 章节规范的脱敏报告
  - 首行 `【脱敏报告】`
  - 包含处理文件路径、敏感字段发现（每类数量，无发现显示"无"）、脱敏策略、输出文件路径、✅ 状态标识
- [x] 实现 `generateCleaningReport(params)` 方法：生成符合 spec 6.4 章节规范的清洗报告
  - 首行 `【数据清洗报告】`
  - 包含原始行数、去重统计、异常值详情（超过 5 项显示省略提示）、输出文件路径、✅ 状态标识
- [x] 实现 `generateInventoryReport(params)` 方法：生成符合 spec 6.5 章节规范的盘点报告
  - 首行 `【数据资产盘点报告】`
  - 包含目录路径、文件数量、Markdown 表格资产清单（文件名/大小/类型/价值评估/说明五列）、价值星级（★符号）、处理建议、合规审查提示
- [x] 实现 `generatePackagingManual(params)` 方法：生成符合 spec 6.6 章节规范的产品说明书
  - 包含 8 个固定章节：产品名称、版本（V1.0）、生成日期（YYYY-MM-DD）、数据概览、数据样例（前 5 行）、使用场景、合规声明（4 项✅）、定价建议
- [x] 所有报告采用统一 Markdown 格式，包含标题、处理时间、输入输出、统计信息、状态标识等固定章节
- **验收标准**：四种报告均符合 spec 6.3-6.6 章节规范，首行标题正确，包含所有必需章节

### 2.5 实现 `PathValidator` 路径安全校验器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-asset-shared/src/pathValidator.ts` 实现 `PathValidator` 类
- [x] 实现 `validate(filePath, workingDir)` 方法：
  - 使用 `path.resolve` 解析为绝对路径
  - 检查路径不包含 `..` 路径穿越符号
  - 检查解析后的绝对路径必须位于 `workingDir` 及其子目录内
  - 路径不合法时抛出 `PATH_TRAVERSAL` 错误，错误信息为 `错误：路径不合法 - {路径}`
- [x] 使用跨平台 API（`path.join`、`path.resolve`、`path.relative`）
- **验收标准**：合法路径通过校验；包含 `..` 的路径穿越攻击被拒绝；工作目录外的路径被拒绝

### 2.6 实现 `AuditLogger` 审计日志记录器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-asset-shared/src/auditLogger.ts` 实现 `AuditLogger` 类
- [x] 实现 `log(params)` 方法：记录处理时间、操作人、输入文件、输出文件、处理结果
- [x] 日志格式：`[插件名] 消息内容`，便于日志检索和问题定位
- [x] 可选写入文件系统：`logs/audit-{YYYY-MM-DD}.log`，按日轮转
- [x] 默认仅输出到 stdout，文件写入通过配置开关启用
- **验收标准**：每次处理生成审计日志，包含 5 项必需信息，日志格式符合 `[插件名] 消息内容` 规范

### 2.7 编写 `data-asset-shared` 单元测试
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-asset-shared/tests/` 编写单元测试：
  - `businessRulesLoader.test.ts`：覆盖 5 种配置降级场景
  - `fileFormatAdapter.test.ts`：覆盖 4 种格式读写 + unknown 降级
  - `reportGenerator.test.ts`：覆盖 4 种报告生成的章节完整性
  - `pathValidator.test.ts`：覆盖合法/路径穿越/工作目录外三种场景
  - `auditLogger.test.ts`：覆盖日志格式和必需字段
- [x] 测试通过 `pnpm run test`，覆盖率达到 `test:coverage` 标准
- **验收标准**：所有单元测试通过，关键路径 100% 覆盖

## 3. 开发 data-masking 脱敏插件（P0 优先级，合规优先）

### 3.1 初始化 `data-masking` 包结构
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-masking/` 创建包目录结构：`src/`、`tests/`、`package.json`、`tsconfig.json`、`README.md`
- [x] 编写 `package.json`：包名 `@deepseek-ai/dsh-data-masking`，`peerDependencies` 包含 `@deepseek-ai/cordis`、`@deepseek-ai/dsh-tools`、`@deepseek-ai/dsh-data-asset-shared`
- [x] 编写 `tsconfig.json`：extends `tsconfig.base.json`，references 包含 `data-asset-shared`
- **验收标准**：包结构完整，依赖关系正确

### 3.2 实现 `SensitiveFieldScanner` 敏感字段扫描器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-masking/src/sensitiveFieldScanner.ts` 实现 `SensitiveFieldScanner` 类
- [x] 实现 `scan(lines, sensitivePatterns)` 方法：
  - 从 `BusinessRulesConfig.sensitivePatterns` 读取四类敏感字段的正则表达式（运行时编译为 RegExp）
  - 逐行扫描，识别身份证号、手机号、银行卡号、邮箱四类敏感字段
  - 返回 `SensitiveField[]`，包含 `type`/`value`/`line`/`column` 信息
  - 统计每类敏感字段的发现数量
- [x] 正则表达式全部从配置读取，代码中不硬编码任何敏感字段模式
- **验收标准**：能正确识别 18 位身份证号、11 位手机号、16-19 位银行卡号、邮箱格式；正则模式全部来自配置

### 3.3 实现 `MaskingStrategyExecutor` 脱敏策略执行器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-masking/src/maskingStrategyExecutor.ts` 实现 `MaskingStrategyExecutor` 类
- [x] 实现 `execute(value, type, strategy)` 方法，支持三种策略：
  - `FULL`：完全匿名化，整体替换为 `***`
  - `PARTIAL`：假名化，保留前 3 后 4，中间替换为 `***`
  - `GENERALIZE`：泛化处理，替换为 `<脱敏数据>` 通用占位符
- [x] 实现 `resolveStrategy(strategy)` 方法：无效策略回退到 `PARTIAL`，返回实际使用的策略
- [x] 策略选择由用户参数指定，未指定时默认 `PARTIAL`；策略的具体行为（如保留位数）为技术实现，不读取配置
- **验收标准**：三种策略输出符合 spec 5.1.1 规则 2 定义；无效策略回退到 PARTIAL；输出不残留任何敏感字段原始值

### 3.4 实现 `mask_sensitive_data` Tool 注册
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-masking/src/index.ts` 实现函数插件入口
- [x] 命名导出 `name = 'data-masking'`、`inject = ['tools']`、`Config`（Schemastery schema）、`apply`
- [x] 在 `apply` 中使用 `defineTool` 定义 `mask_sensitive_data` Tool：
  - `parameters`：JSON Schema 描述 `filePath`（必填）+ `strategy`（可选，enum FULL/PARTIAL/GENERALIZE）
  - `output.schema`：描述 `MaskSensitiveDataResult` 结构
  - `output.render`：纯函数，返回 UI 卡片
  - `presentCall`：`generic` 卡片类型
- [x] 在 `execute(args, exec)` 中实现脱敏处理流程（按 design.md 2.1.3.1 状态机）：
  1. 加载商业规则配置（`BusinessRulesLoader.load()`）
  2. 校验路径合法性（`PathValidator.validate()`）
  3. 读取原始文件（`FileFormatAdapter.read()`）
  4. 扫描敏感字段（`SensitiveFieldScanner.scan()`）
  5. 按策略执行脱敏（`MaskingStrategyExecutor.execute()`）
  6. 写入 `_masked` 后缀新文件（`FileFormatAdapter.write()`）
  7. 生成脱敏报告（`ReportGenerator.generateMaskingReport()`）
  8. 记算输出路径：`{原文件名}_masked.{原扩展名}`
  9. 记审计日志（`AuditLogger.log()`）
  10. 返回 `MaskSensitiveDataResult`
- [x] 异常映射：文件不存在→`FILE_NOT_FOUND`、文件无法读取→`FILE_READ_ERROR`、无效策略→回退 PARTIAL、路径穿越→`PATH_TRAVERSAL`
- [x] 通过 `ctx.tools.register()` 注册 Tool，返回 disposer
- **验收标准**：Tool 注册成功，可通过 `ctx.tools.call('mask_sensitive_data', {...})` 调用；输出文件名为 `{原文件名}_masked.{原扩展名}`；原始文件内容不变；脱敏报告中首行为 `【脱敏报告】`

### 3.5 编写 `data-masking` 单元测试与集成测试
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-masking/tests/` 编写测试：
  - `sensitiveFieldScanner.test.ts`：覆盖四类敏感字段识别
  - `maskingStrategyExecutor.test.ts`：覆盖三种策略 + 无效策略回退
  - `maskingTool.test.ts`：覆盖完整脱敏流程，包括异常场景（文件不存在/无权限/不支持格式/无效策略）
  - 验证脱敏后输出文件不包含原始敏感值（如 `13800138000` 不在输出中）
  - 验证原始文件内容不变
- **验收标准**：所有测试通过，覆盖 spec 5.1.1 所有业务规则和 5.1.3 异常场景

## 4. 开发 data-cleaning 清洗插件（P1）

### 4.1 初始化 `data-cleaning` 包结构
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-cleaning/` 创建包目录结构：`src/`、`tests/`、`package.json`、`tsconfig.json`、`README.md`
- [x] 编写 `package.json`：包名 `@deepseek-ai/dsh-data-cleaning`，`peerDependencies` 包含 `@deepseek-ai/cordis`、`@deepseek-ai/dsh-tools`、`@deepseek-ai/dsh-data-asset-shared`
- **验收标准**：包结构完整，依赖关系正确

### 4.2 实现 `DuplicateRemover` 去重处理器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-cleaning/src/duplicateRemover.ts` 实现 `DuplicateRemover` 类
- [x] 实现 `remove(lines)` 方法：基于 Set 数据结构移除完全相同行，保留首次出现
- [x] 返回 `{ cleanedLines: string[]; duplicateRemoved: number }`
- **验收标准**：输入 3 行完全相同数据，输出 1 行，`duplicateRemoved = 2`；保留首次出现顺序

### 4.3 实现 `FormatStandardizer` 格式标准化器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-cleaning/src/formatStandardizer.ts` 实现 `FormatStandardizer` 类
- [x] 实现 `standardize(lines)` 方法：
  - 合并连续多个空格为单个空格
  - 统一分隔符（多个连续分隔符合并为单个）
  - 去除每行首尾空白
- **验收标准**：输入行包含连续多个空格，输出行中多个空格合并为单个空格；首尾空白被去除

### 4.4 实现 `AnomalyDetector` 异常值检测器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-cleaning/src/anomalyDetector.ts` 实现 `AnomalyDetector` 类
- [x] 实现 `detect(lines, maxDisplay)` 方法：
  - 检测长度 < 3 的过短内容
  - 检测包含 `null`/`NULL` 值的行
  - 返回 `{ anomalies: Array<{ line: number; reason: string }>; totalCount: number }`
  - 超过 `maxDisplay`（默认 5）个时，仅返回前 5 个，附加 `...等{总数}项` 提示
- [x] `maxDisplay` 从 `data-asset-shared` Config 读取（`maxAnomalyDisplay`）
- **验收标准**：检测到包含 `null` 的行，报告中显示 `行N: 包含null值`；异常值超过 5 个时仅展示前 5 个 + 省略提示

### 4.5 实现 `clean_data` Tool 注册
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-cleaning/src/index.ts` 实现函数插件入口
- [x] 命名导出 `name = 'data-cleaning'`、`inject = ['tools']`、`Config`、`apply`
- [x] 在 `apply` 中使用 `defineTool` 定义 `clean_data` Tool：
  - `parameters`：`filePath`（必填）+ `removeDuplicates`（可选，默认 true）+ `standardizeFormat`（可选，默认 true）
  - `output.schema`：描述 `CleanDataResult` 结构
- [x] 在 `execute(args, exec)` 中实现清洗处理流程（按 design.md 2.1.3.2 活动图）：
  1. 加载商业规则配置
  2. 校验路径合法性
  3. 读取原始文件，按行分割并过滤空行，记录原始行数
  4. 若 `removeDuplicates` 为 true，执行 `DuplicateRemover.remove()`
  5. 若 `standardizeFormat` 为 true，执行 `FormatStandardizer.standardize()`
  6. 执行 `AnomalyDetector.detect()`
  7. 写入 `_cleaned` 后缀新文件
  8. 生成清洗报告（`ReportGenerator.generateCleaningReport()`）
  9. 计审计日志
  10. 返回 `CleanDataResult`
- [x] 异常映射：文件不存在→`FILE_NOT_FOUND`、空文件→正常处理（原始行数为 0）、全部重复→正常处理（仅保留 1 行）
- **验收标准**：Tool 注册成功；输出文件名为 `{原文件名}_cleaned.{原扩展名}`；原始文件内容不变；清洗报告首行为 `【数据清洗报告】`

### 4.6 编写 `data-cleaning` 单元测试与集成测试
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-cleaning/tests/` 编写测试：
  - `duplicateRemover.test.ts`：覆盖去重 + 保留首次出现
  - `formatStandardizer.test.ts`：覆盖空格合并 + 首尾空白去除
  - `anomalyDetector.test.ts`：覆盖过短内容 + null 值 + 超过 5 个省略提示
  - `cleaningTool.test.ts`：覆盖完整清洗流程，包括异常场景（文件不存在/空文件/全部重复）
- **验收标准**：所有测试通过，覆盖 spec 5.2.1 所有业务规则和 5.2.3 异常场景

## 5. 开发 data-inventory 盘点插件（P2）

### 5.1 初始化 `data-inventory` 包结构
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-inventory/` 创建包目录结构：`src/`、`tests/`、`package.json`、`tsconfig.json`、`README.md`
- [x] 编写 `package.json`：包名 `@deepseek-ai/dsh-data-inventory`，`peerDependencies` 包含 `@deepseek-ai/cordis`、`@deepseek-ai/dsh-tools`、`@deepseek-ai/dsh-data-asset-shared`
- **验收标准**：包结构完整，依赖关系正确

### 5.2 实现 `DirectoryScanner` 目录扫描器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-inventory/src/directoryScanner.ts` 实现 `DirectoryScanner` 类
- [x] 实现 `scan(directory)` 方法：
  - 扫描指定目录下扩展名为 `.csv`/`.xlsx`/`.json`/`.txt` 的数据文件
  - 忽略其他文件（如 `readme.md`）
  - 跳过无读取权限的文件，在结果中标注跳过原因
  - 返回 `{ files: DataFile[]; skippedFiles: number }`
- [x] 使用 `fs.readdir` 读取目录，`fs.stat` 获取文件大小
- [x] 禁止盘点系统目录、`node_modules` 等（正常扫描但报告中文件数为 0 或提示无数据文件）
- **验收标准**：目录包含 `test.csv` 和 `readme.md`，盘点报告中仅出现 `test.csv`；无权限文件被跳过并标注

### 5.3 实现 `ValueAssessor` 价值评估器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-inventory/src/valueAssessor.ts` 实现 `ValueAssessor` 类
- [x] 实现 `assess(fileName, valueAssessmentRules)` 方法：
  - 从 `BusinessRulesConfig.valueAssessment` 读取高/中/低三档评估规则
  - 基于文件名关键词匹配规则（如包含"供应链"→★★★★★，包含"日志"→★）
  - 返回 `{ stars: number; label: string; recommendation: string }`
  - 文件名不包含任何预设关键词时，使用默认价值评估（★★★，说明为"需进一步评估"）
- [x] 评估规则全部从配置读取，代码中不硬编码任何关键词或星级
- **验收标准**：文件名包含"供应链"→★★★★★；包含"日志"→★；不匹配任何关键词→★★★ + "需进一步评估"

### 5.4 实现 `AssetListGenerator` 资产清单生成器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-inventory/src/assetListGenerator.ts` 实现 `AssetListGenerator` 类
- [x] 实现 `generate(files, valueAssessor)` 方法：
  - 对每个文件调用 `ValueAssessor.assess()` 进行价值评估
  - 生成 `AssetItem[]`，包含 `fileName`/`size`（人类可读，如"1.2 MB"）/`type`/`valueAssessment`（星级）/`description`
  - 生成 Markdown 表格格式资产清单，包含文件名、大小、类型、价值评估、说明五列
- [x] 实现 `humanReadableSize(bytes)` 辅助方法：将字节数转为人类可读大小（B/KB/MB/GB）
- **验收标准**：资产清单为 Markdown 表格，包含 5 列；价值星级使用 ★ 符号；文件大小为人类可读格式

### 5.5 实现 `inventory_data` Tool 注册
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-inventory/src/index.ts` 实现函数插件入口
- [x] 命名导出 `name = 'data-inventory'`、`inject = ['tools']`、`Config`、`apply`
- [x] 在 `apply` 中使用 `defineTool` 定义 `inventory_data` Tool：
  - `parameters`：`directory`（必填）
  - `output.schema`：描述 `InventoryDataResult` 结构
- [x] 在 `execute(args, exec)` 中实现盘点处理流程：
  1. 加载商业规则配置
  2. 校验目录路径合法性
  3. 扫描目录数据文件（`DirectoryScanner.scan()`）
  4. 价值评估（`ValueAssessor.assess()`）
  5. 生成资产清单（`AssetListGenerator.generate()`）
  6. 生成盘点报告（`ReportGenerator.generateInventoryReport()`），包含处理建议和合规审查提示
  7. 计审计日志
  8. 返回 `InventoryDataResult`
- [x] 处理建议：高价值数据建议"优先进行清洗和脱敏后交易"，低价值数据建议"评估处理成本"
- [x] 合规提示：所有数据交易前必须完成合规审查
- [x] 异常映射：目录不存在→`DIR_NOT_FOUND`、无数据文件→正常处理（文件数为 0）、价值规则未匹配→默认★★★
- **验收标准**：Tool 注册成功；盘点报告首行为 `【数据资产盘点报告】`；资产清单为 Markdown 表格；处理建议包含合规审查提示

### 5.6 编写 `data-inventory` 单元测试与集成测试
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-inventory/tests/` 编写测试：
  - `directoryScanner.test.ts`：覆盖数据文件过滤 + 无权限跳过
  - `valueAssessor.test.ts`：覆盖高/中/低三档 + 默认评估
  - `assetListGenerator.test.ts`：覆盖 Markdown 表格生成 + 人类可读大小
  - `inventoryTool.test.ts`：覆盖完整盘点流程，包括异常场景（目录不存在/无数据文件/价值规则未匹配）
- **验收标准**：所有测试通过，覆盖 spec 5.3.1 所有业务规则和 5.3.3 异常场景

## 6. 开发 data-packaging 包装插件（P3）

### 6.1 初始化 `data-packaging` 包结构
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-packaging/` 创建包目录结构：`src/`、`tests/`、`package.json`、`tsconfig.json`、`README.md`
- [x] 编写 `package.json`：包名 `@deepseek-ai/dsh-data-packaging`，`peerDependencies` 包含 `@deepseek-ai/cordis`、`@deepseek-ai/dsh-tools`、`@deepseek-ai/dsh-data-asset-shared`
- **验收标准**：包结构完整，依赖关系正确

### 6.2 实现 `SampleExtractor` 数据样例提取器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-packaging/src/sampleExtractor.ts` 实现 `SampleExtractor` 类
- [x] 实现 `extract(filePath, lineCount)` 方法：
  - 读取数据文件前 `lineCount` 行（默认 5，从 Config `sampleLineCount` 读取）
  - 返回 `string[]`，每行为字符串
- [x] 使用 `FileFormatAdapter.read()` 读取文件
- **验收标准**：输入文件包含 10 行数据，输出前 5 行

### 6.3 实现 `ComplianceGenerator` 合规声明生成器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-packaging/src/complianceGenerator.ts` 实现 `ComplianceGenerator` 类
- [x] 实现 `generate(packagingRules)` 方法：
  - 从 `BusinessRulesConfig.packaging.complianceStatements` 读取合规声明内容
  - 生成 4 项合规声明（已完成脱敏处理/不包含个人身份信息/数据来源合法/建议完成数据产权登记）
  - 每项声明带 ✅ 标识
- [x] 合规声明内容全部从配置读取，代码中不硬编码任何声明文本
- **验收标准**：生成 4 项合规声明，每项带 ✅ 标识；声明内容来自配置

### 6.4 实现 `ManualGenerator` 产品说明书生成器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-packaging/src/manualGenerator.ts` 实现 `ManualGenerator` 类
- [x] 实现 `generate(params)` 方法，生成包含 8 个固定章节的产品说明书：
  1. 产品名称（用户指定）
  2. 版本号（固定 V1.0）
  3. 生成日期（YYYY-MM-DD）
  4. 数据概览（源文件名/数据量行数/文件大小 KB/格式）
  5. 数据样例（前 5 行，调用 `SampleExtractor.extract()`）
  6. 使用场景（用户描述或默认描述，从 `packaging.defaultDescription` 读取）
  7. 合规声明（调用 `ComplianceGenerator.generate()`）
  8. 定价建议（从 `packaging.pricingRules` 读取，按价值评估匹配）
- [x] 调用 `ReportGenerator.generatePackagingManual()` 生成最终 Markdown 文本
- **验收标准**：说明书包含 8 个固定章节，章节标题为 `【产品名称】`/`【合规声明】` 等；版本固定 V1.0；日期格式 YYYY-MM-DD

### 6.5 实现 `package_data_asset` Tool 注册
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-packaging/src/index.ts` 实现函数插件入口
- [x] 命名导出 `name = 'data-packaging'`、`inject = ['tools']`、`Config`、`apply`
- [x] 在 `apply` 中使用 `defineTool` 定义 `package_data_asset` Tool：
  - `parameters`：`dataPath`（必填）+ `productName`（必填）+ `description`（可选）
  - `output.schema`：描述 `PackageDataAssetResult` 结构
- [x] 在 `execute(args, exec)` 中实现包装处理流程：
  1. 加载商业规则配置
  2. 校验 `productName` 非空，为空时返回 `EMPTY_PRODUCT_NAME` 错误
  3. 校验数据文件路径合法性
  4. 读取数据文件内容和统计信息（行数、文件大小、格式）
  5. 提取前 5 行样例（`SampleExtractor.extract()`）
  6. 生成产品说明书（`ManualGenerator.generate()`）
  7. 写入 `{产品名称}_产品说明书.txt` 文件到数据文件相同目录
  8. 生成下一步建议（3 项：提交数据交易所/完成产权登记/出具合规声明）
  9. 计审计日志
  10. 返回 `PackageDataAssetResult`
- [x] 未脱敏数据执行包装时允许执行，但合规声明不勾选，提示"请先完成脱敏"
- [x] 异常映射：文件不存在→`FILE_NOT_FOUND`、产品名称为空→`EMPTY_PRODUCT_NAME`、输出目录不可写→`WRITE_ERROR`
- **验收标准**：Tool 注册成功；输出文件名为 `{产品名称}_产品说明书.txt`；说明书包含 8 个固定章节；下一步建议包含 3 项

### 6.6 编写 `data-packaging` 单元测试与集成测试
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-packaging/tests/` 编写测试：
  - `sampleExtractor.test.ts`：覆盖前 5 行提取
  - `complianceGenerator.test.ts`：覆盖 4 项合规声明生成
  - `manualGenerator.test.ts`：覆盖 8 个章节完整性
  - `packagingTool.test.ts`：覆盖完整包装流程，包括异常场景（文件不存在/产品名称为空/描述缺失/输出目录不可写）
- **验收标准**：所有测试通过，覆盖 spec 5.4.1 所有业务规则和 5.4.3 异常场景

## 7. 开发 data-asset-orchestration 全流程编排 Skill（P3）

### 7.1 初始化 `data-asset-orchestration` 包结构
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-asset-orchestration/` 创建包目录结构：`src/`、`tests/`、`package.json`、`tsconfig.json`、`README.md`
- [x] 编写 `package.json`：包名 `@deepseek-ai/dsh-data-asset-orchestration`，`peerDependencies` 包含 `@deepseek-ai/cordis`、`@deepseek-ai/dsh-skill`、`@deepseek-ai/dsh-tools`
- **验收标准**：包结构完整，依赖关系正确

### 7.2 实现 `DependencyPropagator` 前置依赖传递器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-asset-orchestration/src/dependencyPropagator.ts` 实现 `DependencyPropagator` 类
- [x] 实现 `propagate(maskingResult, cleaningResult)` 方法：
  - 清洗阶段输入 = 脱敏阶段输出文件（`{原文件名}_masked.{原扩展名}`）
  - 盘点阶段输入 = 清洗后数据所在目录
  - 包装阶段输入 = 清洗脱敏后数据文件（`{原文件名}_masked_cleaned.{原扩展名}`）
- [x] 依赖传递为技术约束（前置依赖传递），非业务规则
- **验收标准**：对 `data.csv` 执行全流程，清洗输入为 `data_masked.csv`，包装输入为 `data_masked_cleaned.csv`

### 7.3 实现 `SequentialExecutor` 固定顺序执行器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-asset-orchestration/src/sequentialExecutor.ts` 实现 `SequentialExecutor` 类
- [x] 实现 `execute(filePath, strategy, productName)` 方法，按固定顺序依次调用四个 Tool：
  1. 调用 `ctx.tools.call('mask_sensitive_data', { filePath, strategy })` 执行脱敏
  2. 以脱敏输出文件为输入，调用 `ctx.tools.call('clean_data', { filePath: maskedPath, removeDuplicates: true, standardizeFormat: true })` 执行清洗
  3. 以清洗后数据所在目录为输入，调用 `ctx.tools.call('inventory_data', { directory })` 执行盘点
  4. 以清洗脱敏后数据文件为输入，调用 `ctx.tools.call('package_data_asset', { dataPath: cleanedPath, productName })` 执行包装
- [x] 通过 Tool 名称（字符串）调用四个插件，不直接依赖具体实现
- [x] 禁止跳过任何阶段直接进入后续阶段
- [x] 固定顺序为技术约束，硬编码在 `SequentialExecutor` 中
- **验收标准**：日志中依次出现四个插件的加载记录，顺序为脱敏、清洗、盘点、包装；任一阶段未完成时禁止执行后续阶段

### 7.4 实现 `ReportAggregator` 报告汇总器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-asset-orchestration/src/reportAggregator.ts` 实现 `ReportAggregator` 类
- [x] 实现 `aggregate(maskingReport, cleaningReport, inventoryReport, packagingManual)` 方法：
  - 汇总四个阶段的报告为统一输出
  - 返回 `OrchestrationResult`，包含四份完整报告内容
- [x] 实现 `aggregatePartial(completedReports, failedStage, error)` 方法：
  - 阶段失败时，汇总已完成阶段的报告和失败阶段的错误信息
  - 返回 `OrchestrationResult`，`completedStages` 标识已完成阶段数，`failedStage` 标识失败阶段
- **验收标准**：全流程成功时返回四份完整报告；阶段失败时返回已完成报告 + 失败阶段错误

### 7.5 实现 `data-asset-orchestration` Skill 注册
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-asset-orchestration/src/index.ts` 实现函数插件入口
- [x] 命名导出 `name = 'data-asset-orchestration'`、`inject = ['skills', 'tools']`、`Config`、`apply`
- [x] 在 `apply` 中使用 `ctx.skills.register()` 注册 `data-asset-orchestration` Skill：
  - `name`: `data-asset-orchestration`（kebab-case）
  - `description`: "数据资产化全流程编排"
  - `content`: Markdown 指令体（按 design.md 2.2.2.5 结构）：
    ```
    # 数据资产化全流程编排
    ## 触发条件
    当用户要求"对某份数据执行数据资产化处理"或"完整处理这份数据"时使用此 Skill。
    ## 执行步骤
    1. 调用 mask_sensitive_data(filePath, strategy) 执行脱敏
    2. 以脱敏输出文件为输入，调用 clean_data(maskedPath, true, true) 执行清洗
    3. 以清洗后数据所在目录为输入，调用 inventory_data(directory) 执行盘点
    4. 以清洗脱敏后数据文件为输入，调用 package_data_asset(cleanedPath, productName) 执行包装
    ## 输出
    汇总返回脱敏报告、清洗报告、盘点报告、产品说明书四份完整文档。
    ## 失败处理
    任一阶段失败时停止后续阶段，返回已完成阶段的报告和失败阶段的错误信息。
    ```
  - `invocation.modelInvocable`: true
  - `invocation.userInvocable`: true
- [x] Skill content 为纯文本指令，不包含可执行代码
- [x] 通过 `ctx.skills.register()` 注册，返回 disposer（HMR-safety）
- [x] dispose 后必须从 registry 移除
- **验收标准**：Skill 注册成功，可通过 `ctx.skills.list()` 发现；name 匹配 kebab-case；dispose 后从 registry 移除

### 7.6 实现全流程编排执行入口
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-asset-orchestration/src/orchestrationExecutor.ts` 实现 `OrchestrationExecutor` 类
- [x] 实现 `run(filePath, strategy, productName)` 方法，按 design.md 2.1.3.3 状态机执行：
  1. 触发全流程 → `ExecutingMasking`
  2. 脱敏成功 → `MaskingSuccess` → `ExecutingCleaning`（输入=脱敏输出）
  3. 脱敏失败/超时 → `AggregatingPartial` → 返回脱敏错误
  4. 清洗成功 → `CleaningSuccess` → `ExecutingInventory`（输入=清洗后目录）
  5. 清洗失败 → `AggregatingPartial` → 返回清洗错误
  6. 盘点成功 → `InventorySuccess` → `ExecutingPackaging`（输入=清洗脱敏后数据）
  7. 盘点失败 → `AggregatingPartial` → 返回盘点错误
  8. 包装成功 → `PackagingSuccess` → `AggregatingAll` → 返回完整四份报告
  9. 包装失败 → `AggregatingPartial` → 返回包装错误
- [x] 调用 `SequentialExecutor.execute()` 执行四阶段
- [x] 调用 `ReportAggregator.aggregate()` 或 `aggregatePartial()` 汇总报告
- [x] 阶段超时处理：单阶段超时 `singleFileTimeoutMs`（30000ms），全流程超时 `fullFlowTimeoutMs`（180000ms）
- **验收标准**：全流程成功时返回四份完整报告；任一阶段失败时中断后续阶段，返回已完成报告 + 失败阶段错误；超时触发中断

### 7.7 编写 `data-asset-orchestration` 单元测试与集成测试
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-asset-orchestration/tests/` 编写测试：
  - `dependencyPropagator.test.ts`：覆盖前置依赖传递正确性
  - `sequentialExecutor.test.ts`：覆盖固定顺序执行 + 禁止跳过阶段
  - `reportAggregator.test.ts`：覆盖完整汇总 + 部分汇总
  - `orchestrationSkill.test.ts`：覆盖 Skill 注册 + HMR-safety（dispose 后移除）
  - `orchestrationExecutor.test.ts`：覆盖全流程成功 + 中间阶段失败 + 输入文件不合法 + 配置文件加载失败 + 部分阶段超时
- **验收标准**：所有测试通过，覆盖 spec 5.5.1 所有业务规则和 5.5.3 异常场景

## 8. 集成 cordis.yml 配置与端到端验证

### 8.1 更新 `examples/headless-agent/cordis.yml` 集成配置
- [x] 在 `DeepSeek-Harness/examples/headless-agent/cordis.yml` 追加本系统配置片段（按 design.md 2.3.2.6）：
  - `data-asset-shared`：配置 `businessRulesPath`/`maxFileSizeMb`/`maxMemoryMb`/`singleFileTimeoutMs`/`fullFlowTimeoutMs`/`maxAnomalyDisplay`/`sampleLineCount`
  - `data-masking`、`data-cleaning`、`data-inventory`、`data-packaging`、`data-asset-orchestration`
- [x] 加载顺序约束：`fs-local` 和 `tool-fs` 必须先于本系统所有插件加载；`data-asset-shared` 必须先于四个处理插件加载；四个处理插件必须先于 `data-asset-orchestration` 加载
- [x] 在 `DeepSeek-Harness/examples/package.json` 声明新增包的依赖
- [x] 在 `DeepSeek-Harness/tsconfig.json` 添加新增包的 references
- **验收标准**：`pnpm install` 后无报错；`pnpm run typecheck` 通过；cordis.yml 加载顺序符合约束

### 8.2 编写端到端测试与快照测试
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-asset-orchestration/tests/e2e/` 编写端到端测试：
  - 准备测试数据文件（包含敏感字段的 CSV/JSON/TXT/XLSX）
  - 验证单插件调用：脱敏/清洗/盘点/包装各自独立可用
  - 验证全流程编排：对 `test.csv` 执行完整数据资产化处理，依次生成 `test_masked.csv`/`test_masked_cleaned.csv`/`test_masked_cleaned_产品说明书.txt`
  - 验证四份报告汇总输出完整
  - 验证原始文件内容不变
  - 验证脱敏后输出不包含敏感字段原始值
- [x] 添加 keyless 快照测试：通过 `cordis.yml` 启动真实 Loader，驱动全流程，断言输出和干净退出
- [x] 验证性能指标：
  - 单文件 10MB 以内处理 ≤ 30 秒
  - 批量盘点 100 个文件 ≤ 60 秒
  - 全流程总耗时 ≤ 3 分钟
  - 内存占用 ≤ 512MB
- **验收标准**：端到端测试通过；快照测试通过；性能指标满足 spec 4.1 约束

## 9. 文档更新与代码审查

### 9.1 编写各包 README 文档
- [x] 为 6 个新包各编写 `README.md`，按 DeepSeek Harness 规范：
  - 包描述、Model Experience、配置项、已知限制
  - `data-asset-shared`：内部接口文档
  - `data-masking`/`data-cleaning`/`data-inventory`/`data-packaging`：Tool 接口、参数、返回值、异常映射
  - `data-asset-orchestration`：Skill 触发条件、执行步骤、失败处理
- [x] 更新 `DeepSeek-Harness/packages/data-asset/README.md`（如需要）描述包组结构
- **验收标准**：每个包有完整 README，符合 dsh-prose-standard 规范

### 9.2 代码审查与设计一致性核对
- [x] 审查所有代码：商业规则全部从 `config/business-rules.json` 读取，代码中不硬编码任何业务判断逻辑
- [x] 审查命名规范：所有 TypeScript 函数/方法/变量使用 camelCase
- [x] 审查插件导出：所有函数插件命名导出 `name`/`inject`/`Config`/`apply`，无默认导出
- [x] 审查路径安全：所有文件操作使用 `PathValidator` 校验，禁止路径穿越
- [x] 审查原始数据不可变：所有处理阶段写入新文件，禁止覆盖原始输入
- [x] 审查异常隔离：单个文件处理失败不影响其他文件
- [x] 审查处理报告完整性：每个阶段无论成功/失败都输出报告
- [x] 审查日志规范：`[插件名] 消息内容` 格式
- [x] 设计回顾：与 spec.md 和 design.md 的一致性核对
- **验收标准**：所有审查项通过；与 spec.md 所有验收条件一致；与 design.md 接口签名一致

### 9.3 运行完整测试套件与构建验证
- [x] 运行 `pnpm run clean` 清理构建产物
- [x] 运行 `pnpm install` 确保依赖安装
- [x] 运行 `pnpm run typecheck` 确保类型检查通过
- [x] 运行 `pnpm run lint` 确保代码规范
- [x] 运行 `pnpm run test` 确保所有单元测试通过
- [x] 运行 `pnpm run test:coverage` 确保覆盖率达标
- [x] 运行 `pnpm run build` 确保构建成功
- [x] 运行 `pnpm run hygiene` 确保包卫生检查通过
- [x] 运行 `pnpm run doc-sync` 确保文档同步
- **验收标准**：所有检查命令通过，无错误无警告

---

# v2.0 新增功能编码任务规划

> **v2.0 任务执行约束（在 v1.0 约束基础上追加）**
> - 新增包采用 `@liuhange/dsh-<pkg-name>` scoped 命名格式，包路径为 `DeepSeek-Harness/packages/data-asset/<pkg-name>/`，与现有 `@deepseek-ai/dsh-*` 包共存于同一 monorepo，通过 pnpm workspace 协议互相引用。
> - 扩展现有包（高级脱敏算法扩展 `data-masking`、增量处理模式扩展 `data-asset-orchestration`）时，**不破坏现有 API**，新增参数均为可选，现有行为与 v1.0 完全一致。
> - 所有新增商业判断逻辑（评分权重/阈值、血缘开关、脱敏算法选择、可视化模板、敏感度规则、Cron 表达式）必须从 `config/business-rules.json` 对应节点读取，代码零硬编码业务判断。
> - TypeScript 严格模式：`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`，无 `any` 类型。
> - 每个新增模块语句覆盖率 ≥ 95%。
> - FPE 密钥和哈希盐值通过环境变量注入（`${ENV_VAR}` 语法），差分隐私使用密码学安全随机数生成器（禁止 `Math.random`），状态文件权限仅限当前用户（`chmod 0o600`）。
> - 不修改任何 UI 和现有 Harness 代码，仅新增功能代码和扩展现有 data-asset 包。

## 10. 扩展 business-rules.json 配置文件（v2.0 六个新节点）

### 10.1 追加六个新增功能配置节点
- [x] 在 `DeepSeek-Harness/config/business-rules.json` 追加以下六个可选节点（缺失时使用默认值或禁用对应功能，向后兼容 v1.0）：
  - `qualityScoring`：四维度权重/阈值/缺失值标记/格式规则/值域规则/跨字段约束/时效阈值（按 design.md 3.1.4.2 结构）
  - `lineage`：血缘开关 `enabled`/存储路径 `storagePath`/hash 算法 `hashAlgorithm`（按 design.md 3.2.4.2 结构）
  - `advancedMasking`：默认算法/字段级算法映射/FPE 密钥/k-匿名 k 值与准标识符/差分隐私 ε 与总预算/哈希算法与盐值（按 design.md 3.3.4.2 结构）
  - `visualization`：图表配置/布局/配色方案/交互行为/模板版本（按 design.md 3.4.4.2 结构）
  - `sensitivityClassification`：字段名规则/字段值规则/分级映射/默认分级（按 design.md 3.5.4.2 结构）
  - `incrementalScheduling`：Cron 表达式/增量模式开关/hash 算法/检测目录/状态文件路径/并发锁超时（按 design.md 3.6.4.2 结构）
- [x] 更新 `lastUpdated` 字段为 "2026-08-21"
- [x] FPE 密钥和哈希盐值使用 `${ENV_VAR}` 语法占位（如 `"key": "${FPE_KEY}"`、`"salt": "${HASH_SALT}"`），禁止硬编码明文
- [x] 所有正则表达式以字符串形式存储，运行时编译为 RegExp
- [x] 验证 JSON 格式合法，可通过 `JSON.parse` 解析
- [x] 验证 v1.0 配置（无六个新节点）仍可正常加载，所有新功能降级或禁用
- **验收标准**：配置文件包含 13 个顶层节点（v1.0 的 7 个 + v2.0 的 6 个），JSON 格式合法；移除任一新节点时对应功能降级且不影响其他功能

### 10.2 扩展 data-asset-shared 类型定义以支持 v2.0 配置
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-asset-shared/src/types.ts` 追加 v2.0 配置类型定义：
  - `QualityScoringConfig`、`LineageConfig`、`AdvancedMaskingConfig`、`VisualizationConfig`、`SensitivityClassificationConfig`、`IncrementalSchedulingConfig`
  - 扩展 `BusinessRulesConfig` 接口，新增六个可选节点（`qualityScoring?`、`lineage?`、`advancedMasking?`、`visualization?`、`sensitivityClassification?`、`incrementalScheduling?`）
- [x] 扩展 `BusinessRulesLoader` 的节点完整性校验，六个新节点均为可选，缺失时不触发 `DEFAULT_PARTIAL` 降级（仅对应功能禁用）
- [x] 扩展 `defaultBusinessRules.ts`，追加六个新节点的默认配置常量（结构与配置文件一致，作为降级用）
- **依赖**：10.1
- **验收标准**：TypeScript 类型检查通过；v1.0 配置加载时六个新节点为 undefined，不报错；v2.0 配置加载时类型正确

## 11. 开发 data-quality-scoring 数据质量评分插件（新包）

### 11.1 初始化 `data-quality-scoring` 包结构
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-quality-scoring/` 创建包目录结构：`src/`、`tests/`、`package.json`、`tsconfig.json`、`README.md`
- [x] 编写 `package.json`：包名 `@liuhange/dsh-data-quality-scoring`，`"type": "module"`，`peerDependencies` 包含 `@deepseek-ai/cordis`、`@deepseek-ai/dsh-tools`、`@deepseek-ai/dsh-data-asset-shared`、`@deepseek-ai/schemastery`
- [x] 编写 `tsconfig.json`：extends `tsconfig.base.json`，`rootDir: src`，`outDir: lib/types`，`strict: true`，`noUncheckedIndexedAccess: true`，`exactOptionalPropertyTypes: true`，references 包含 `data-asset-shared`
- [x] 在 `src/invariant.ts` 定义包不变量（包名、Tool 名 `score_data_quality`、报告首行 `【数据质量评分报告】`）
- **验收标准**：包结构完整，`pnpm install` 后无报错，`pnpm run typecheck` 通过

### 11.2 定义质量评分类型与默认规则
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-quality-scoring/src/types.ts` 定义类型：
  - `ScoreDataQualityParams`（`filePath`/`outputPathDir?`）
  - `ScoreDataQualityResult`（`jsonReportPath`/`markdownReportPath`/`report`/`totalScore`/`dimensions`/`status`/`configStatus`）
  - `QualityDimensions`（completeness/accuracy/consistency/timeliness 四维度）
  - `DimensionScore`（`score`/`weight`/`weightNormalized`/`subScores?`/`issues`/`suggestion?`）
  - `QualityIssue`（`dimension`/`description`/`location`/`severity`）
  - `QualityDimension`、`IssueSeverity`、`ScoringContext`、`DimensionScoringResult`、`QualityScoringResult`
- [x] 在 `src/defaultScoringRules.ts` 定义内置默认评分规则常量（权重各 0.25、阈值 60、缺失值标记 `["null","undefined","N/A","","NULL"]`），结构与 `QualityScoringConfig` 一致
- **依赖**：11.1、10.2
- **验收标准**：类型定义完整，默认规则结构与配置文件一致

### 11.3 实现 `CompletenessScorer` 完整性维度评分器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-quality-scoring/src/completenessScorer.ts` 实现 `CompletenessScorer` 类
- [x] 实现 `score(context: ScoringContext): DimensionScoringResult` 方法：
  - 从 `config.completeness.missingMarkers` 读取缺失值标记（null/undefined/空字符串及配置定义的标记）
  - 遍历每行每字段，值 ∈ missingMarkers 则计为缺失
  - `completenessScore = Math.floor((非缺失值总数 / 字段值总数) × 100)`
  - 收集缺失值问题明细（行号、字段名、severity='medium'）
- [x] 空数据时得分=0
- **依赖**：11.2
- **验收标准**：100 条数据中 20 条为 null → 完整性得分=80；空数据得分=0

### 11.4 实现 `AccuracyScorer` 准确性维度评分器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-quality-scoring/src/accuracyScorer.ts` 实现 `AccuracyScorer` 类
- [x] 实现 `score(context: ScoringContext): DimensionScoringResult` 方法：
  - 从 `config.accuracy.formatRules` 读取格式规则（字段名/正则/权重），计算格式合规率
  - 从 `config.accuracy.domainRules` 读取值域规则（字段名/min/max/allowedValues/权重），计算值域合规率
  - `accuracyScore = Math.floor((formatCompliance × formatWeight + domainCompliance × domainWeight) × 100)`
  - 收集格式/值域不合规问题明细
- [x] 字段不存在时跳过该规则，记录到 issues
- **依赖**：11.2
- **验收标准**：格式合规率 90%、值域合规率 80%、权重各 0.5 → 准确性得分=85

### 11.5 实现 `ConsistencyScorer` 一致性维度评分器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-quality-scoring/src/consistencyScorer.ts` 实现 `ConsistencyScorer` 类
- [x] 实现 `score(context: ScoringContext): DimensionScoringResult` 方法：
  - 从 `config.consistency.crossFieldRules` 读取跨字段约束（name/fields/constraint）
  - 遍历约束规则，对每条记录检查约束（before/after/equal/notEqual/greaterThan/lessThan）
  - 引用不存在的字段时跳过该规则并记录到 issues（"约束规则引用字段{字段名}不存在，已跳过"）
  - `consistencyScore = Math.floor((满足约束的记录数 / 受约束记录数) × 100)`
- **依赖**：11.2
- **验收标准**：100 条数据中 95 条满足跨字段约束 → 一致性得分=95；引用不存在字段时跳过并记录

### 11.6 实现 `TimelinessScorer` 时效性维度评分器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-quality-scoring/src/timelinessScorer.ts` 实现 `TimelinessScorer` 类
- [x] 实现 `score(context: ScoringContext): DimensionScoringResult` 方法：
  - 从 `config.timeliness.timestampField` 读取时间戳字段名
  - 从 `config.timeliness.freshnessThresholdHours` 读取过期阈值
  - 计算每个记录时间戳与当前时间的差值，超过阈值计为过期
  - `过期比例 = 过期记录数 / 总记录数`，`timelinessScore = Math.floor((1 - 过期比例) × 100)`，过期比例≥1 时得分=0
  - 收集过期数据问题明细
- [x] 无时间戳字段时得分=0，记录到 issues
- **依赖**：11.2
- **验收标准**：50% 数据超过阈值 → 时效性得分≤50；无时间戳字段时得分=0

### 11.7 实现 `WeightedScoreCalculator` 加权总分计算器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-quality-scoring/src/weightedScoreCalculator.ts` 实现 `WeightedScoreCalculator` 类
- [x] 实现 `calculate(dimensions: QualityDimensions, weights: QualityScoringConfig['weights']): { totalScore: number; weightsNormalized: boolean; normalizedWeights: QualityScoringConfig['weights'] }` 方法：
  - 计算 `weightSum = weights 四项之和`
  - 若 `weightSum ≠ 1`：各项 /= weightSum 归一化，`weightsNormalized = true`
  - `totalScore = Math.floor(Σ(dimension.score × dimension.weight))`
- **依赖**：11.2
- **验收标准**：权重和=1.2 时自动归一化为 1.0，`weightsNormalized=true`；权重各 0.25、各维度得分均为 80 → 总分=80

### 11.8 实现 `IssueCollector` 问题明细收集器与 `SuggestionGenerator` 改进建议生成器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-quality-scoring/src/issueCollector.ts` 实现 `IssueCollector` 类
  - 实现 `collect(dimensionResults: DimensionScoringResult[]): QualityIssue[]` 方法：汇总各维度问题明细
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-quality-scoring/src/suggestionGenerator.ts` 实现 `SuggestionGenerator` 类
  - 实现 `generate(dimensions: QualityDimensions, thresholds: QualityScoringConfig['thresholds']): string[]` 方法：
    - 对每个维度，若得分低于配置阈值，生成针对该维度的具体改进建议
    - 从配置读取阈值，不硬编码建议文本模板中的阈值数值
- **依赖**：11.2
- **验收标准**：完整性得分低于阈值 60 → 生成完整性维度改进建议；各维度均高于阈值 → 无建议

### 11.9 实现 `QualityReportGenerator` 双格式报告生成器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-quality-scoring/src/qualityReportGenerator.ts` 实现 `QualityReportGenerator` 类
- [x] 实现 `writeJson(filePath: string, result: QualityScoringResult): Promise<void>` 方法：写入 `quality_report.json`，含 `dimensions`/`totalScore`/`issues`/`suggestions`/`configStatus`/`weightsNormalized`/`scoredAt` 字段
- [x] 实现 `writeMarkdown(filePath: string, result: QualityScoringResult): Promise<void>` 方法：写入 `quality_report.md`，首行 `【数据质量评分报告】`，含维度得分表、权重展示（含是否归一化）、问题明细、改进建议、配置状态章节
- **依赖**：11.2
- **验收标准**：JSON 报告含 7 个必需字段；Markdown 报告首行为 `【数据质量评分报告】`，包含维度得分表/权重展示/问题明细/改进建议/配置状态五个章节

### 11.10 实现 `score_data_quality` Tool 注册
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-quality-scoring/src/index.ts` 实现函数插件入口
- [x] 命名导出 `name = 'data-quality-scoring'`、`inject = ['tools']`、`Config`（Schemastery schema）、`apply`
- [x] 在 `apply` 中使用 `defineTool` 定义 `score_data_quality` Tool：
  - `parameters`：`filePath`（必填）+ `outputPathDir`（可选，默认数据文件所在目录）
  - `output.schema`：描述 `ScoreDataQualityResult` 结构
  - `output.render`：纯函数，返回 UI 卡片
  - `presentCall`：`generic` 卡片类型
- [x] 在 `execute(args, exec)` 中实现评分流程（按 design.md 3.1.3.1 伪代码）：
  1. 加载商业规则配置（`BusinessRulesLoader.load()`），读取 `qualityScoring` 节点，缺失时降级到 `DefaultScoringRules`
  2. 校验路径合法性（`PathValidator.validate()`）
  3. 读取数据文件（`FileFormatAdapter.read()`），解析为记录数组
  4. 数据为空时各维度得分置 0，总分 0，标注"数据为空，无法评分"
  5. 计算四维度得分（`CompletenessScorer`/`AccuracyScorer`/`ConsistencyScorer`/`TimelinessScorer`）
  6. 计算加权总分（`WeightedScoreCalculator`，含权重归一化）
  7. 收集问题明细（`IssueCollector`）
  8. 生成改进建议（`SuggestionGenerator`）
  9. 写入 `quality_report.json` 和 `quality_report.md` 双格式报告（`QualityReportGenerator`）
  10. 计审计日志（`AuditLogger.log()`）
  11. 返回 `ScoreDataQualityResult`
- [x] 异常映射：文件不存在→`FILE_NOT_FOUND`、路径穿越→`PATH_TRAVERSAL`、配置缺失→降级默认规则
- [x] 通过 `ctx.tools.register()` 注册 Tool，返回 disposer
- **依赖**：11.3、11.4、11.5、11.6、11.7、11.8、11.9
- **验收标准**：Tool 注册成功，可通过 `ctx.tools.call('score_data_quality', {...})` 调用；同时生成 `quality_report.json` 和 `quality_report.md`；Markdown 报告首行为 `【数据质量评分报告】`

### 11.11 编写 `data-quality-scoring` 单元测试与集成测试
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-quality-scoring/tests/` 编写单元测试：
  - `completenessScorer.test.ts`：覆盖缺失值识别/占比计算/空数据/全缺失（测试数据 `test_data_complete.csv`/`test_data_with_nulls.csv`）
  - `accuracyScorer.test.ts`：覆盖格式合规/值域合规/加权/字段不存在（`test_data_format_violation.csv`）
  - `consistencyScorer.test.ts`：覆盖约束满足/字段缺失跳过/before/after 等约束（`test_data_cross_field.csv`）
  - `timelinessScorer.test.ts`：覆盖过期比例/阈值边界/无时间戳字段（`test_data_stale.csv`）
  - `weightedScoreCalculator.test.ts`：覆盖权重归一化/和=1/和≠1/总分计算（`test_data_weight_unnormalized.json`）
  - `issueCollector.test.ts`：覆盖问题收集/严重程度分级/位置记录
  - `suggestionGenerator.test.ts`：覆盖阈值边界/多维度建议/无建议场景
  - `qualityReportGenerator.test.ts`：覆盖 JSON/Markdown 双格式/首行标题/章节完整
  - `index.test.ts`：覆盖 Tool 注册/路径校验/配置降级/文件不存在/空数据/正常流程（`test_data_empty.csv`）
- [x] 所有测试语句覆盖率 ≥ 95%
- [x] 集成测试：验证配置缺失时降级到默认规则且 `configStatus=DEFAULT_MISSING`；验证 JSON 与 Markdown 报告内容一致
- **依赖**：11.10
- **验收标准**：所有测试通过，覆盖率 ≥ 95%，覆盖 spec 5.6.1 所有业务规则和 5.6.3 异常场景

## 12. 开发 data-lineage 数据血缘追踪插件（新包）

### 12.1 初始化 `data-lineage` 包结构
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-lineage/` 创建包目录结构：`src/`、`tests/`、`package.json`、`tsconfig.json`、`README.md`
- [x] 编写 `package.json`：包名 `@liuhange/dsh-data-lineage`，`"type": "module"`，`peerDependencies` 包含 `@deepseek-ai/cordis`、`@deepseek-ai/dsh-tools`、`@deepseek-ai/dsh-data-asset-shared`、`@deepseek-ai/schemastery`
- [x] 编写 `tsconfig.json`：extends `tsconfig.base.json`，`strict: true`，`noUncheckedIndexedAccess: true`，`exactOptionalPropertyTypes: true`，references 包含 `data-asset-shared`
- [x] 在 `src/invariant.ts` 定义包不变量（包名、Tool 名 `trace_data_lineage`、默认存储路径 `lineage/`）
- **验收标准**：包结构完整，`pnpm install` 后无报错，`pnpm run typecheck` 通过

### 12.2 定义血缘类型与默认配置
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-lineage/src/types.ts` 定义类型：
  - `TraceDataLineageParams`（`lineageFilePath`/`outputFormat?`）
  - `TraceDataLineageResult`（`jsonPath?`/`mermaidPath?`/`markdownPath?`/`report`/`stepCount`/`chainIntact`/`status`）
  - `LineageStep`（`stepName`/`timestamp`/`input`/`output`/`transformRule`/`parameters`）
  - `LineageFileRef`（`filePath`/`hash: string | null`）
  - `LineageChain`（`steps`/`chainIntact`/`brokenAt?`/`generatedAt`）
  - `LineageHook` 接口（`recordBefore`/`recordAfter`/`isEnabled`/`flush`）
  - `LineageConfig`（`enabled`/`storagePath`/`hashAlgorithm`）
- [x] 在 `src/defaultLineageConfig.ts` 定义内置默认血缘配置常量（`enabled: false`、`storagePath: 'lineage'`、`hashAlgorithm: 'SHA-256'`）
- **依赖**：12.1、10.2
- **验收标准**：类型定义完整，默认配置结构与配置文件一致

### 12.3 实现 `HashCalculator` 文件 hash 计算器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-lineage/src/hashCalculator.ts` 实现 `HashCalculator` 类
- [x] 实现 `calculate(filePath: string, algorithm: 'SHA-256' | 'SHA-512' = 'SHA-256'): string | null` 方法：
  - 使用 Node.js `crypto` 模块创建 hash，`fs.readFileSync` 读取文件内容
  - 返回十六进制字符串（SHA-256 为 64 位，SHA-512 为 128 位）
  - 文件读取异常时返回 null，标注"hash计算失败"
- [x] 同一文件内容不变时两次计算的 hash 值相同
- **依赖**：12.2
- **验收标准**：同一文件两次计算 hash 相同；文件不存在时返回 null

### 12.4 实现 `LineageRecorder` 血缘记录器与 `LineageChainBuilder` 链式构建器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-lineage/src/lineageRecorder.ts` 实现 `LineageRecorder` 类
  - 实现 `record(stepName: string, inputPath: string, outputPath: string, transformRule: string, parameters: Record<string, unknown>): LineageStep` 方法：记录单条血缘记录，含 6 个字段（stepName/timestamp/input/output/transformRule/parameters），timestamp 为 ISO8601 格式
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-lineage/src/lineageChainBuilder.ts` 实现 `LineageChainBuilder` 类
  - 实现 `append(step: LineageStep): void` 方法：校验相邻步骤 `input.hash = 上步 output.hash`，不符时标注 `chainBroken = true` 并记录断裂点
  - 实现 `flush(): LineageChain` 方法：返回完整血缘链（`steps`/`chainIntact`/`brokenAt?`/`generatedAt`）
  - 空链时 `chainIntact = true`，`steps = []`
- **依赖**：12.3
- **验收标准**：单步骤记录含 6 个完整字段；链式关联校验正确；断裂检测正确；空链 `chainIntact=true`

### 12.5 实现 `MermaidGenerator` Mermaid 可视化生成器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-lineage/src/mermaidGenerator.ts` 实现 `MermaidGenerator` 类
- [x] 实现 `generate(chain: LineageChain): string` 方法（按 design.md 3.2.3.2 伪代码）：
  - 输出 `flowchart LR` 开头
  - 每个步骤生成节点 `S{i}[{stepName}\n{transformRule}]`
  - 相邻步骤生成边 `S{i-1} -->|{transformRule}| S{i}`
  - 单步骤时仅生成单节点无边
- **依赖**：12.4
- **验收标准**：输出为合法 Mermaid flowchart 语法；单步骤生成单节点；多步骤生成节点和边

### 12.6 实现 `LineageReportGenerator` 三格式报告生成器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-lineage/src/lineageReportGenerator.ts` 实现 `LineageReportGenerator` 类
- [x] 实现 `writeJson(filePath: string, chain: LineageChain): Promise<void>` 方法：写入 `lineage.json`，含 `steps` 数组/`chainIntact`/`generatedAt` 字段
- [x] 实现 `writeMermaid(filePath: string, chain: LineageChain): Promise<void>` 方法：写入 `lineage.mmd`（调用 `MermaidGenerator.generate()`）
- [x] 实现 `writeMarkdown(filePath: string, chain: LineageChain): Promise<void>` 方法：写入 `lineage_report.md`，含血缘概览、步骤明细表格（步骤名/时间/输入/输出/规则/参数）、链式追溯路径三个章节
- [x] 实现 `writeAll(basePath: string, chain: LineageChain): Promise<{ jsonPath: string; mermaidPath: string; markdownPath: string }>` 方法：同时生成三格式
- **依赖**：12.5
- **验收标准**：三格式文件同时生成；`lineage.json` 为合法 JSON 含 `steps` 数组；`lineage.mmd` 为 Mermaid flowchart 语法；`lineage_report.md` 含三个章节

### 12.7 实现 `LineageHook` 编排流程自动嵌入钩子
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-lineage/src/lineageHook.ts` 实现 `LineageHook` 类
- [x] 实现 `recordBefore(toolName: string, inputPath: string, params: Record<string, unknown>): void` 方法（按 design.md 3.2.3.1 伪代码）：
  - 若 `config.lineage.enabled = false`：直接 return（零开销）
  - 计算输入文件 hash（`HashCalculator.calculate()`）
  - 缓存 `pendingStep = { stepName, timestamp, input: { filePath, hash }, parameters }`
- [x] 实现 `recordAfter(toolName: string, outputPath: string, transformRule: string): void` 方法：
  - 若 `enabled = false`：直接 return
  - 计算输出文件 hash
  - 补全 `pendingStep.output` 和 `pendingStep.transformRule`
  - 调用 `LineageChainBuilder.append(pendingStep)`
- [x] 实现 `isEnabled(): boolean` 方法：返回 `config.lineage.enabled`
- [x] 实现 `flush(): LineageChain` 方法：调用 `LineageChainBuilder.flush()` 输出完整血缘链
- [x] `enabled = false` 时所有方法为空操作，无 hash 计算，零开销
- **依赖**：12.4、12.6
- **验收标准**：`enabled=true` 时记录血缘步骤；`enabled=false` 时零开销，不生成任何血缘文件，不计算 hash

### 12.8 实现 `trace_data_lineage` Tool 注册与编排嵌入
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-lineage/src/index.ts` 实现函数插件入口
- [x] 命名导出 `name = 'data-lineage'`、`inject = ['tools']`、`Config`、`apply`
- [x] 在 `apply` 中使用 `defineTool` 定义 `trace_data_lineage` Tool：
  - `parameters`：`lineageFilePath`（必填）+ `outputFormat`（可选，enum json/mermaid/markdown/all，默认 all）
  - `output.schema`：描述 `TraceDataLineageResult` 结构
- [x] 在 `execute(args, exec)` 中实现血缘导出流程：
  1. 加载商业规则配置，读取 `lineage` 节点，缺失时降级到默认配置
  2. 校验路径合法性
  3. 读取 `lineage.json` 文件
  4. 按 `outputFormat` 调用 `LineageReportGenerator` 生成对应格式
  5. 返回 `TraceDataLineageResult`（含 `stepCount`/`chainIntact`）
- [x] 通过 `ctx.tools.register()` 注册 Tool，返回 disposer
- [x] 通过 `ctx.inject()` 声明可选依赖，使编排 Skill 能发现并注入 `LineageHook`（**不修改现有 SequentialExecutor 源码**，编排 Skill 的 content 更新为含血缘记录指令，在调用每个 Tool 前后显式调用 hook）
- **依赖**：12.7
- **验收标准**：Tool 注册成功；`outputFormat=all` 时生成三格式文件；`chainIntact` 正确反映链完整性；`enabled=false` 时编排行为与 v1.0 完全一致

### 12.9 编写 `data-lineage` 单元测试与集成测试
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-lineage/tests/` 编写单元测试：
  - `hashCalculator.test.ts`：覆盖 SHA-256 计算/同一文件相同 hash/读取失败返回 null
  - `lineageRecorder.test.ts`：覆盖单步骤记录/6 字段完整/时间戳 ISO8601 格式
  - `lineageChainBuilder.test.ts`：覆盖链式关联校验/断裂检测/空链（`test_lineage_single_step.json`/`test_lineage_full_chain.json`/`test_lineage_broken_chain.json`/`test_lineage_null_hash.json`）
  - `mermaidGenerator.test.ts`：覆盖 flowchart 语法/节点边生成/单步骤/多步骤
  - `lineageReportGenerator.test.ts`：覆盖 JSON/Mermaid/Markdown 三格式/章节完整
  - `lineageHook.test.ts`：覆盖 `enabled=true` 记录/`enabled=false` 零开销/recordBefore/recordAfter
  - `index.test.ts`：覆盖 Tool 注册/路径校验/导出格式选择/链完整性报告
- [x] 所有测试语句覆盖率 ≥ 95%
- [x] 集成测试：验证启用血缘后全流程编排自动生成三文件；验证禁用血缘时编排耗时与未启用一致（零开销）；验证血缘链可从最终产品追溯到原始输入文件；验证与 v1.0 编排向后兼容
- **依赖**：12.8
- **验收标准**：所有测试通过，覆盖率 ≥ 95%，覆盖 spec 5.7.1 所有业务规则和 5.7.3 异常场景

## 13. 扩展 data-masking 高级脱敏算法（扩展现有包）

> **扩展约束**：本章节扩展现有 `@deepseek-ai/dsh-data-masking` 包，**不破坏现有 `mask_sensitive_data` API**，新增 `algorithm` 和 `fieldName` 两个可选参数，未传 `algorithm` 时完全走 v1.0 逻辑，现有 `strategy=FULL/PARTIAL/GENERALIZE` 行为与 v1.0 完全一致。

### 13.1 扩展 data-masking 类型定义与默认配置
- [x] **修改** `DeepSeek-Harness/packages/data-asset/data-masking/src/types.ts`，新增高级算法类型：
  - `AdvancedMaskingAlgorithm`（`'FPE' | 'k-anonymity' | 'differential-privacy' | 'hash'`）
  - `MaskSensitiveDataParamsV2`（扩展 v1.0，新增 `algorithm?`/`fieldName?`）
  - `MaskSensitiveDataResultV2`（扩展 v1.0，新增 `algorithmUsed?`/`algorithmDetails?`）
  - `AdvancedMaskingResult`、`AlgorithmDetails`、`BudgetTrackerState`、`FieldAlgorithmConfig`
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-masking/src/defaultAdvancedMaskingConfig.ts`：内置默认高级脱敏配置常量（`defaultAlgorithm: 'hash'`、空 `fieldAlgorithms`、`kValue: 2`、`epsilon: 1.0`、`totalBudget: 5.0`、`hashAlgorithm: 'SHA-256'`）
- **依赖**：10.2
- **验收标准**：类型定义完整；v1.0 类型不变，v2.0 类型为可选扩展

### 13.2 实现 `FpeAlgorithm` 格式保持加密算法
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-masking/src/algorithms/fpeAlgorithm.ts` 实现 `FpeAlgorithm` 类
- [x] 实现 `encrypt(plaintext: string, key: string): string` 方法（按 design.md 3.3.3.2 伪代码）：
  - 采用 FF1 算法（NIST SP 800-38G），保持明文格式不变（长度、字符集）
  - 确定字符集基数（如纯数字 radix=10），使用 AES-ECB 作为 PRF 派生轮密钥
  - 验证：`ciphertext.length == plaintext.length` 且字符集一致
- [x] 实现 `decrypt(ciphertext: string, key: string): string` 方法：还原明文，`decrypt(encrypt(p, k), k) === p`
- [x] 密钥未配置（空字符串）时抛出错误"错误：FPE密钥未配置"
- [x] 密钥从配置或环境变量注入，禁止硬编码
- **依赖**：13.1
- **验收标准**：16 位数字信用卡号加密后仍为 16 位数字字符串；`decrypt(encrypt(p, k), k) === p`；密钥缺失时拒绝执行

### 13.3 实现 `KAnonymityAlgorithm` k-匿名化算法
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-masking/src/algorithms/kAnonymityAlgorithm.ts` 实现 `KAnonymityAlgorithm` 类
- [x] 实现 `anonymize(records: Record<string, unknown>[], kValue: number, quasiIdentifiers: string[]): { anonymizedRecords: Record<string, unknown>[]; actualMinEquivalenceClass: number; suppressedCount: number }` 方法（按 design.md 3.3.3.3 伪代码）：
  - 按准标识符分组，对 size < kValue 的组进行层级泛化（如邮编 `100001 → 1000** → 100***`）
  - 重复泛化直到所有组 ≥ kValue 或无法进一步泛化
  - 仍存在 < kValue 的组时抑制（删除）该组记录
  - 返回 `actualMinEquivalenceClass`（实际最小等价类大小）和 `suppressedCount`（抑制记录数）
- [x] `actualMinEquivalenceClass < kValue` 时在结果中标注警告"k值过大，已尽力泛化，实际最小等价类为{actualMinEquivalenceClass}"
- [x] `kValue` 和 `quasiIdentifiers` 从配置读取，禁止硬编码
- **依赖**：13.1
- **验收标准**：k=5 时每个准标识符组合至少出现 5 次；50 条记录 k=100 时警告并返回实际最小等价类

### 13.4 实现 `DifferentialPrivacyAlgorithm` 差分隐私算法与 `BudgetTracker` 预算追踪器
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-masking/src/budgetTracker.ts` 实现 `BudgetTracker` 类
  - 实现 `consume(epsilon: number): void` 方法：累加 ε 消耗
  - 实现 `canConsume(epsilon: number, totalBudget: number): boolean` 方法：检查剩余预算是否足够
  - 实现 `getState(): BudgetTrackerState` 方法：返回 `totalBudget`/`consumed`/`remaining`/`queryCount`
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-masking/src/algorithms/differentialPrivacyAlgorithm.ts` 实现 `DifferentialPrivacyAlgorithm` 类
- [x] 实现 `addNoise(trueValue: number, epsilon: number, sensitivity: number, budgetTracker: BudgetTracker, totalBudget: number): number` 方法（按 design.md 3.3.3.4 伪代码）：
  - 预算检查：`budgetTracker.canConsume(epsilon, totalBudget)` 为 false 时抛出"隐私预算已耗尽，拒绝查询"
  - 计算拉普拉斯噪声尺度 `scale = sensitivity / epsilon`
  - 使用 `crypto.randomBytes` 作为随机源生成拉普拉斯噪声（**禁止 `Math.random`**）
  - 追踪预算消耗 `budgetTracker.consume(epsilon)`
  - 返回 `trueValue + noise`
- **依赖**：13.1
- **验收标准**：ε=1.0 时返回值=真实计数+拉普拉斯噪声；总预算 ε=5.0 已消耗 5.0 时新查询被拒绝；使用密码学安全随机数

### 13.5 实现 `HashAlgorithm` 哈希脱敏算法
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-masking/src/algorithms/hashAlgorithm.ts` 实现 `HashAlgorithm` 类
- [x] 实现 `hash(plaintext: string, hashAlgorithm: 'SHA-256' | 'SHA-512', salt?: string): { digest: string; salted: boolean; digestLength: number }` 方法（按 design.md 3.3.3.5 伪代码）：
  - `input = salt ? salt + plaintext : plaintext`（带盐防彩虹表）
  - `SHA-256`：返回 64 位十六进制字符串
  - `SHA-512`：返回 128 位十六进制字符串
  - 不支持的算法回退到 `SHA-256`，在结果中标注"不支持的哈希算法，已使用默认SHA-256"
  - 使用 Node.js `crypto` 模块，单向不可逆，禁止存储明文到哈希的映射
- **依赖**：13.1
- **验收标准**：SHA-256 对"13800138000"输出 64 位十六进制；`salt="abc"` 时输出=SHA256("abc123")；不支持算法回退 SHA-256

### 13.6 实现 `AdvancedMaskingExecutor` 高级算法分发器
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-masking/src/advancedMaskingExecutor.ts` 实现 `AdvancedMaskingExecutor` 类
- [x] 实现 `execute(data: string | Record<string, unknown>[], params: MaskSensitiveDataParamsV2, config: AdvancedMaskingConfig): AdvancedMaskingResult` 方法（按 design.md 3.3.3.1 伪代码）：
  - 读取 `config.advancedMasking.fieldAlgorithms[params.fieldName]`，未配置时使用 `config.advancedMasking.defaultAlgorithm`
  - 按 `fieldConfig.algorithm` 分发到 `FpeAlgorithm`/`KAnonymityAlgorithm`/`DifferentialPrivacyAlgorithm`/`HashAlgorithm`
  - 返回 `AdvancedMaskingResult`（含 `maskedData`/`algorithm`/`details`）
- [x] 无效 `algorithm` 参数回退到 v1.0 strategy 逻辑，报告中标注"无效算法，使用策略脱敏"
- **依赖**：13.2、13.3、13.4、13.5
- **验收标准**：`algorithm=FPE` 走 FPE；`algorithm=hash` 走哈希；字段级配置覆盖默认算法；无效算法回退 v1.0

### 13.7 扩展 `mask_sensitive_data` Tool 支持高级算法（向后兼容）
- [x] **修改** `DeepSeek-Harness/packages/data-asset/data-masking/src/index.ts`，扩展 `mask_sensitive_data` Tool 的 `parameters`：
  - 新增可选参数 `algorithm`（enum FPE/k-anonymity/differential-privacy/hash）
  - 新增可选参数 `fieldName`（string）
  - 现有 `strategy` 参数保持不变（v1.0 兼容）
- [x] 在 `execute(args, exec)` 中扩展逻辑：
  - 若 `args.algorithm` 未传：完全走 v1.0 逻辑（`MaskingStrategyExecutor`），现有 `strategy=FULL/PARTIAL/GENERALIZE` 行为不变
  - 若 `args.algorithm` 传入：读取 `advancedMasking` 配置，调用 `AdvancedMaskingExecutor.execute()`
  - `advancedMasking` 配置缺失时拒绝高级算法，提示"高级脱敏配置未配置"
- [x] 扩展 `output.schema` 新增 `algorithmUsed?`/`algorithmDetails?` 字段
- [x] **不修改** `SensitiveFieldScanner` 和 `MaskingStrategyExecutor`（现有行为不变）
- [x] 编排 Skill 调用 `mask_sensitive_data` 时不传 `algorithm`，保持向后兼容
- **依赖**：13.6
- **验收标准**：仅传 `strategy=PARTIAL` 时行为与 v1.0 完全一致（回归测试）；传 `algorithm=FPE` 时走高级算法；现有 API 无破坏

### 13.8 编写高级脱敏算法单元测试与集成测试
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-masking/tests/` 编写单元测试：
  - `fpeAlgorithm.test.ts`：覆盖格式保持/可逆性/密钥缺失拒绝/16位数字保持（`test_credit_card_16digit.txt`）
  - `kAnonymityAlgorithm.test.ts`：覆盖 k-匿名性质/泛化层级/k值过大警告/抑制（`test_k_anonymity.csv`/`test_small_dataset_k_large.csv`）
  - `differentialPrivacyAlgorithm.test.ts`：覆盖拉普拉斯噪声/预算追踪/预算耗尽拒绝/安全随机（`test_differential_privacy.json`）
  - `hashAlgorithm.test.ts`：覆盖 SHA-256/SHA-512/带盐/无盐/不支持算法回退（`test_hash_sha256.txt`/`test_hash_salted.txt`）
  - `budgetTracker.test.ts`：覆盖累计消耗/剩余计算/超预算拒绝
  - `advancedMaskingExecutor.test.ts`：覆盖算法分发/字段级配置/默认算法/v1.0兼容
  - `index.test.ts`：覆盖 `algorithm` 未传走 v1.0/`algorithm` 传走高级/密钥缺失/配置缺失
- [x] 所有测试语句覆盖率 ≥ 95%
- [x] 集成测试（回归测试）：验证仅传 `strategy` 时行为与 v1.0 完全一致；验证传 `algorithm=FPE` 时输出格式与输入一致且可解密还原；验证差分隐私多次调用后预算耗尽被拒绝；验证 FPE 密钥从环境变量注入成功；验证编排调用不传 `algorithm` 走 v1.0 路径（`test_v1_compatible.csv`）
- **依赖**：13.7
- **验收标准**：所有测试通过，覆盖率 ≥ 95%，覆盖 spec 5.8.1 所有业务规则和 5.8.3 异常场景；v1.0 回归测试全部通过

## 14. 开发 data-visualization 可视化报表插件（新包）

### 14.1 初始化 `data-visualization` 包结构
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-visualization/` 创建包目录结构：`src/`、`tests/`、`package.json`、`tsconfig.json`、`README.md`
- [x] 编写 `package.json`：包名 `@liuhange/dsh-data-visualization`，`"type": "module"`，`peerDependencies` 包含 `@deepseek-ai/cordis`、`@deepseek-ai/dsh-tools`、`@deepseek-ai/dsh-data-asset-shared`、`@deepseek-ai/schemastery`
- [x] 编写 `tsconfig.json`：extends `tsconfig.base.json`，`strict: true`，`noUncheckedIndexedAccess: true`，`exactOptionalPropertyTypes: true`，references 包含 `data-asset-shared`
- [x] 在 `src/invariant.ts` 定义包不变量（包名、Tool 名 `generate_visualization`、输出文件名 `visualization_report.html`）
- **验收标准**：包结构完整，`pnpm install` 后无报错，`pnpm run typecheck` 通过

### 14.2 定义可视化类型与默认模板配置
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-visualization/src/types.ts` 定义类型：
  - `GenerateVisualizationParams`（`reportPaths`/`outputPath`）
  - `GenerateVisualizationResult`（`htmlPath`/`chartCount`/`chartsRendered`/`status`/`configStatus`）
  - `ChartType`（`'bar' | 'comparison' | 'pie' | 'radar' | 'flowchart'`）
  - `ChartRenderResult`（`type`/`title`/`svgContent`/`dataAvailable`/`errorMessage?`）
  - `HtmlAssembleInput`、`ReportDataLoadResult`、`VisualizationConfig`
- [x] 在 `src/defaultVisualizationConfig.ts` 定义内置默认模板配置常量（按 design.md 3.4.4.2 结构：五种图表/2列网格/默认配色 `#4A90D9`/`#F5A623`/交互全启用）
- **依赖**：14.1、10.2
- **验收标准**：类型定义完整，默认模板结构与配置文件一致

### 14.3 实现 `ReportDataLoader` 报告数据加载器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-visualization/src/reportDataLoader.ts` 实现 `ReportDataLoader` 类
- [x] 实现 `load(filePath: string): Promise<ReportDataLoadResult>` 方法：
  - 读取 JSON 文件并解析
  - 文件不存在时返回 `{ data: null, error: '文件不存在' }`
  - JSON 解析失败时返回 `{ data: null, error: '数据格式错误' }`
  - 正常时返回 `{ data: parsed }`
- [x] 容错设计：单个 JSON 加载失败不影响其他 JSON 加载
- **依赖**：14.2
- **验收标准**：合法 JSON 正常加载；文件不存在返回 null + 错误信息；非法 JSON 返回 null + "数据格式错误"

### 14.4 实现五种图表渲染器
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-visualization/src/chartRenderers/barChartRenderer.ts`：实现 `render(data: unknown, config: VisualizationConfig): ChartRenderResult`，输入脱敏统计（身份证/手机/银行卡/邮箱数量），输出柱状图内联 SVG，柱高按数量比例
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-visualization/src/chartRenderers/comparisonChartRenderer.ts`：输入清洗前后行数，输出对比柱状图 SVG
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-visualization/src/chartRenderers/pieChartRenderer.ts`：输入各星级文件数，输出饼图扇形 SVG，计算占比
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-visualization/src/chartRenderers/radarChartRenderer.ts`：输入四维度得分，输出雷达图多边形 SVG
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-visualization/src/chartRenderers/flowchartRenderer.ts`：输入血缘 steps，输出流程图节点和连线 SVG
- [x] 所有渲染器：数据为 null 时生成"数据不可用"或"数据格式错误"占位符 SVG；配色从 `config.colorScheme` 读取，禁止硬编码颜色
- **依赖**：14.2
- **验收标准**：五种图表均生成内联 SVG；数据为 null 时显示占位符；配色来自配置

### 14.5 实现 `InteractionScript` 交互脚本与 `HtmlAssembler` HTML 组装器
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-visualization/src/interactionScript.ts`：实现 `generate(interactions: VisualizationConfig['interactions']): string` 方法，生成展开/折叠详情、切换图表类型的内联 JavaScript 代码
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-visualization/src/htmlAssembler.ts`：实现 `assemble(input: HtmlAssembleInput): string` 方法（按 design.md 3.4.3.1 伪代码）：
  - 组装自包含 HTML，所有 CSS 内联于 `<style>`，所有 JS 内联于 `<script>`，无外部 link/script 引用
  - 含 `<meta charset="UTF-8">` 声明
  - 数据内联到 JS 变量（`const maskingData = {...}`），禁止硬编码数据
  - 按 `config.layout` 网格布局排列图表
  - 按 `config.colorScheme` 应用配色
- **依赖**：14.4
- **验收标准**：生成的 HTML 无外部资源引用（断网可独立打开）；含 `<meta charset="UTF-8">`；CSS/JS 全部内联；数据内联到 JS 变量

### 14.6 实现 `TemplateLoader` 模板加载器
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-visualization/src/templateLoader.ts` 实现 `TemplateLoader` 类
- [x] 实现 `load(config: VisualizationConfig | undefined): VisualizationConfig` 方法：
  - 配置存在时返回配置
  - 配置缺失时返回 `defaultVisualizationConfig`，标注"使用默认模板"
- **依赖**：14.2
- **验收标准**：配置存在时使用配置；配置缺失时使用默认模板

### 14.7 实现 `generate_visualization` Tool 注册
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-visualization/src/index.ts` 实现函数插件入口
- [x] 命名导出 `name = 'data-visualization'`、`inject = ['tools']`、`Config`、`apply`
- [x] 在 `apply` 中使用 `defineTool` 定义 `generate_visualization` Tool：
  - `parameters`：`reportPaths`（必填，object，含 masking/cleaning/inventory/quality/lineage 可选路径）+ `outputPath`（必填）
  - `output.schema`：描述 `GenerateVisualizationResult` 结构
- [x] 在 `execute(args, exec)` 中实现可视化生成流程（按 design.md 3.4.3.1 伪代码）：
  1. 加载商业规则配置，读取 `visualization` 节点，缺失时降级到默认模板（`TemplateLoader.load()`）
  2. 校验输出路径合法性（`PathValidator.validate()`）
  3. 加载各 JSON 数据（`ReportDataLoader.load()`，容错，失败返回 null）
  4. 渲染五种图表（各 ChartRenderer，数据 null 时生成占位符）
  5. 生成交互脚本（`InteractionScript.generate()`）
  6. 组装自包含 HTML（`HtmlAssembler.assemble()`）
  7. 写入 `visualization_report.html` 文件
  8. 返回 `GenerateVisualizationResult`（含 `chartCount`/`chartsRendered`）
- [x] 异常映射：输出目录不可写→`WRITE_ERROR`、路径穿越→`PATH_TRAVERSAL`、模板配置缺失→降级默认模板
- [x] 通过 `ctx.tools.register()` 注册 Tool，返回 disposer
- **依赖**：14.5、14.6
- **验收标准**：Tool 注册成功；生成的 HTML 断网可独立打开；含五种图表类型；部分 JSON 缺失时对应图表显示占位符，其他图表正常

### 14.8 编写 `data-visualization` 单元测试与集成测试
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-visualization/tests/` 编写单元测试：
  - `reportDataLoader.test.ts`：覆盖 JSON 读取/文件不存在返回 null/非法 JSON 返回 null（`test_invalid_json.txt`）
  - `barChartRenderer.test.ts`：覆盖柱状图 SVG 生成/数据为空占位符/比例计算（`test_masking_report.json`）
  - `comparisonChartRenderer.test.ts`：覆盖对比图生成/前后数据量（`test_cleaning_report.json`）
  - `pieChartRenderer.test.ts`：覆盖饼图扇形/占比计算/空数据（`test_inventory_report.json`）
  - `radarChartRenderer.test.ts`：覆盖雷达图多边形/四维度/得分边界（`test_quality_report.json`）
  - `flowchartRenderer.test.ts`：覆盖流程图节点连线/血缘 steps（`test_lineage.json`）
  - `htmlAssembler.test.ts`：覆盖自包含验证（无外部引用）/CSS/JS 内联/meta charset
  - `interactionScript.test.ts`：覆盖展开折叠逻辑/切换逻辑
  - `index.test.ts`：覆盖 Tool 注册/路径校验/模板降级/部分数据缺失/正常流程（`test_partial_reports.json`）
- [x] 所有测试语句覆盖率 ≥ 95%
- [x] 集成测试：验证生成的 HTML 断网可独立打开；验证含五种图表类型渲染代码；验证交互功能（展开/折叠、切换图表类型）；验证部分 JSON 缺失时对应图表显示占位符；验证模板配置修改后报表使用新配色（配置化）
- **依赖**：14.7
- **验收标准**：所有测试通过，覆盖率 ≥ 95%，覆盖 spec 5.9.1 所有业务规则和 5.9.3 异常场景

## 15. 开发 data-sensitivity-classification 数据敏感度自动分级插件（新包）

### 15.1 初始化 `data-sensitivity-classification` 包结构
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-sensitivity-classification/` 创建包目录结构：`src/`、`tests/`、`package.json`、`tsconfig.json`、`README.md`
- [x] 编写 `package.json`：包名 `@liuhange/dsh-data-sensitivity-classification`，`"type": "module"`，`peerDependencies` 包含 `@deepseek-ai/cordis`、`@deepseek-ai/dsh-tools`、`@deepseek-ai/dsh-data-asset-shared`、`@deepseek-ai/schemastery`
- [x] 编写 `tsconfig.json`：extends `tsconfig.base.json`，`strict: true`，`noUncheckedIndexedAccess: true`，`exactOptionalPropertyTypes: true`，references 包含 `data-asset-shared`
- [x] 在 `src/invariant.ts` 定义包不变量（包名、Tool 名 `classify_sensitivity`、报告首行 `【数据敏感度分级报告】`）
- **验收标准**：包结构完整，`pnpm install` 后无报错，`pnpm run typecheck` 通过

### 15.2 定义敏感度分级类型与默认规则
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-sensitivity-classification/src/types.ts` 定义类型：
  - `ClassifySensitivityParams`（`filePath`/`outputPathDir?`/`sampleSize?`）
  - `ClassifySensitivityResult`（`jsonReportPath`/`markdownReportPath`/`report`/`fields`/`status`/`configStatus`）
  - `FieldClassification`（`fieldName`/`sensitivityLevel`/`identifiedBy`/`recommendedStrategy`）
  - `SensitivityLevel`（`'Public' | 'Internal' | 'Confidential' | 'Secret'`）
  - `RecommendedStrategy`（`'none' | 'partial' | 'full' | 'encrypt'`）
  - `MatchResult`、`ClassificationReportJson`、`InvalidRule`、`SensitivityClassificationConfig`
- [x] 在 `src/defaultClassificationRules.ts` 定义内置默认分级规则常量（按 design.md 3.5.4.2 结构：字段名规则 id_card/phone/email/public、字段值规则 id_card_value/phone_value、分级映射、默认 Internal）
- **依赖**：15.1、10.2
- **验收标准**：类型定义完整，默认规则结构与配置文件一致

### 15.3 实现 `FieldNameMatcher` 字段名模式匹配器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-sensitivity-classification/src/fieldNameMatcher.ts` 实现 `FieldNameMatcher` 类
- [x] 实现 `match(fieldName: string, rules: SensitivityClassificationConfig['fieldNameRules']): { result: MatchResult; invalidRules: InvalidRule[] }` 方法（按 design.md 3.5.3.2 伪代码）：
  - 遍历规则，对每条规则 `new RegExp(rule.pattern)` 编译正则
  - 正则编译失败时跳过该规则，记录到 `invalidRules`（"规则{rule.name}正则编译失败，已跳过"）
  - 匹配成功时返回 `{ matched: true, name, pattern, level }`
  - 全部未匹配时返回 `{ matched: false }`
- [x] 正则规则全部从配置读取，代码中不硬编码任何规则
- **依赖**：15.2
- **验收标准**：字段名 `id_card` 匹配规则→返回 Secret；正则语法错误时跳过并记录无效规则；无匹配返回 `{ matched: false }`

### 15.4 实现 `FieldValueMatcher` 字段值样本模式匹配器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-sensitivity-classification/src/fieldValueMatcher.ts` 实现 `FieldValueMatcher` 类
- [x] 实现 `match(sampleValues: unknown[], rules: SensitivityClassificationConfig['fieldValueRules']): { result: MatchResult; invalidRules: InvalidRule[] }` 方法（按 design.md 3.5.3.2 伪代码）：
  - 遍历规则，编译正则（失败时跳过并记录）
  - 任一样本值匹配即认为该字段匹配此规则：`sampleValues.some(v => regex.test(String(v)))`
  - 全空样本时返回 `{ matched: false }`，标注"仅字段名匹配"
- **依赖**：15.2
- **验收标准**：字段名未匹配但值匹配身份证号正则→返回 Confidential；全空样本返回 `{ matched: false }`

### 15.5 实现 `SensitivityClassifier` 敏感度分级器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-sensitivity-classification/src/sensitivityClassifier.ts` 实现 `SensitivityClassifier` 类
- [x] 实现 `classify(fields: string[], fieldSamples: Record<string, unknown[]>, config: SensitivityClassificationConfig): { classifications: FieldClassification[]; invalidRules: InvalidRule[] }` 方法（按 design.md 3.5.3.1 伪代码）：
  - 对每个字段：
    1. 先调用 `FieldNameMatcher.match()` 匹配字段名规则
    2. 字段名未匹配时调用 `FieldValueMatcher.match()` 匹配字段值样本
    3. 均未匹配时使用 `config.defaultLevel`（Internal），`identifiedBy = { ruleName: 'default', matchType: 'default' }`
  - 返回各字段分级结果和无效规则列表
- **依赖**：15.3、15.4
- **验收标准**：字段名优先匹配；字段名未匹配时回退字段值；均未匹配默认 Internal

### 15.6 实现 `StrategyRecommender` 脱敏策略推荐器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-sensitivity-classification/src/strategyRecommender.ts` 实现 `StrategyRecommender` 类
- [x] 实现 `recommend(level: SensitivityLevel, levelMapping: SensitivityClassificationConfig['levelMapping']): RecommendedStrategy` 方法（按 design.md 3.5.3.3 伪代码）：
  - `Public → none`（不脱敏）
  - `Internal → partial`（部分脱敏）
  - `Confidential → full`（完全脱敏）
  - `Secret → encrypt`（加密脱敏：FPE 或哈希）
  - 映射关系从 `config.levelMapping` 读取，禁止硬编码
- **依赖**：15.2
- **验收标准**：Public→none、Internal→partial、Confidential→full、Secret→encrypt；映射来自配置

### 15.7 实现 `ClassificationReportGenerator` 双格式报告生成器
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-sensitivity-classification/src/classificationReportGenerator.ts` 实现 `ClassificationReportGenerator` 类
- [x] 实现 `writeJson(filePath: string, data: ClassificationReportJson): Promise<void>` 方法：写入 `classification_report.json`，含 `fields`（字段分级数组，每项含 `fieldName`/`sensitivityLevel`/`identifiedBy`/`recommendedStrategy`）/`configStatus`/`classifiedAt` 字段
- [x] 实现 `writeMarkdown(filePath: string, data: ClassificationReportJson, invalidRules: InvalidRule[]): Promise<void>` 方法：写入 `classification_report.md`，首行 `【数据敏感度分级报告】`，含字段分级表格（字段名/敏感度等级/识别依据/推荐策略）、无效规则列表、配置状态章节
- **依赖**：15.2
- **验收标准**：JSON 报告含 `fields`/`configStatus` 字段；Markdown 报告首行为 `【数据敏感度分级报告】`，含字段分级表格

### 15.8 实现 `classify_sensitivity` Tool 注册
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-sensitivity-classification/src/index.ts` 实现函数插件入口
- [x] 命名导出 `name = 'data-sensitivity-classification'`、`inject = ['tools']`、`Config`、`apply`
- [x] 在 `apply` 中使用 `defineTool` 定义 `classify_sensitivity` Tool：
  - `parameters`：`filePath`（必填）+ `outputPathDir`（可选）+ `sampleSize`（可选，默认 100）
  - `output.schema`：描述 `ClassifySensitivityResult` 结构
- [x] 在 `execute(args, exec)` 中实现分级流程（按 design.md 3.5.3.1 伪代码）：
  1. 加载商业规则配置，读取 `sensitivityClassification` 节点，缺失时降级到默认规则
  2. 校验路径合法性
  3. 读取数据文件（`FileFormatAdapter.read()`），提取所有字段名和前 `sampleSize` 个非空样本值
  4. 对每个字段分级（`SensitivityClassifier.classify()`）
  5. 推荐脱敏策略（`StrategyRecommender.recommend()`）
  6. 写入 `classification_report.json` 和 `classification_report.md` 双格式报告
  7. 计审计日志
  8. 返回 `ClassifySensitivityResult`
- [x] 异常映射：文件不存在→`FILE_NOT_FOUND`、路径穿越→`PATH_TRAVERSAL`、配置缺失→降级默认规则、正则编译失败→跳过该规则并记录
- [x] 通过 `ctx.tools.register()` 注册 Tool，返回 disposer
- **依赖**：15.5、15.6、15.7
- **验收标准**：Tool 注册成功；同时生成 `classification_report.json` 和 `classification_report.md`；Markdown 报告首行为 `【数据敏感度分级报告】`；未匹配字段默认 Internal

### 15.9 编写 `data-sensitivity-classification` 单元测试与集成测试
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-sensitivity-classification/tests/` 编写单元测试：
  - `fieldNameMatcher.test.ts`：覆盖正则匹配/多规则/编译失败跳过/无匹配（`test_fields_with_id_card.csv`）
  - `fieldValueMatcher.test.ts`：覆盖样本值匹配/任一匹配/全空样本/编译失败（`test_fields_with_phone_value.csv`/`test_fields_empty_values.csv`）
  - `sensitivityClassifier.test.ts`：覆盖字段名优先/字段值回退/默认 Internal/全字段（`test_fields_no_match.csv`/`test_fields_public.csv`）
  - `strategyRecommender.test.ts`：覆盖四等级映射/Public→none/Secret→encrypt
  - `classificationReportGenerator.test.ts`：覆盖 JSON/Markdown 双格式/首行标题/字段表格
  - `index.test.ts`：覆盖 Tool 注册/路径校验/配置降级/文件不存在/正则编译失败/正常流程（`test_invalid_regex_config.json`/`test_custom_rules.json`）
- [x] 所有测试语句覆盖率 ≥ 95%
- [x] 集成测试：验证配置缺失时降级到默认规则且 `configStatus=DEFAULT_MISSING`；验证 JSON 与 Markdown 报告同时生成；验证用户自定义规则可扩展（新增规则到配置后参与识别）；验证与编排流程兼容
- **依赖**：15.8
- **验收标准**：所有测试通过，覆盖率 ≥ 95%，覆盖 spec 5.10.1 所有业务规则和 5.10.3 异常场景

## 16. 扩展 data-asset-orchestration 增量处理模式（扩展现有包）

> **扩展约束**：本章节扩展现有 `@deepseek-ai/dsh-data-asset-orchestration` 包，**不破坏现有全量处理 API**，`incrementalMode` 默认 false，未启用时编排行为与 v1.0 全量处理完全一致。

### 16.1 扩展增量处理类型定义与默认配置
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-asset-orchestration/src/incremental/types.ts`，定义增量类型：
  - `IncrementalProcessParams`（`watchDirectory`/`incrementalMode`/`stateFilePath?`）
  - `IncrementalProcessResult`（`processedFiles`/`skippedFiles`/`addedFiles`/`modifiedFiles`/`deletedFiles`/`failedFiles`/`stateUpdated`/`report`/`status`/`configStatus`）
  - `IncrementalState`（`lastProcessedAt`/`fileHashes`/`processingSummary`）
  - `ProcessingSummaryEntry`、`IncrementalDetectionResult`、`ConcurrencyLockState`、`IncrementalSchedulingConfig`
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-asset-orchestration/src/incremental/defaultIncrementalConfig.ts`：内置默认增量配置常量（`incrementalMode: false`、`hashAlgorithm: 'SHA-256'`、`stateFilePath: 'state/incremental-state.json'`、`lockTimeout: 3600`）
- **依赖**：10.2
- **验收标准**：类型定义完整，默认配置结构与配置文件一致

### 16.2 实现 `IncrementalDetector` 增量检测器
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-asset-orchestration/src/incremental/incrementalDetector.ts` 实现 `IncrementalDetector` 类
- [x] 实现 `detect(watchDirectory: string, previousState: IncrementalState | null, config: IncrementalSchedulingConfig): Promise<IncrementalDetectionResult>` 方法（按 design.md 3.6.3.1 伪代码）：
  - 扫描 `watchDirectory` 下所有数据文件（.csv/.xlsx/.json/.txt）
  - 对每个文件计算 hash（`hashAlgorithm` 从配置读取，支持 SHA-256/MD5）
  - 与 `previousState.fileHashes` 对比：
    - `addedFiles`：当前文件中不在 previousHashes 的文件
    - `deletedFiles`：previousHashes 中不在当前文件的文件
    - `modifiedFiles`：hash ≠ previousHashes[file] 的文件
    - `unchangedFiles`：hash == previousHashes[file] 的文件
  - `previousState` 为 null 时所有文件为 addedFiles
- **依赖**：16.1
- **验收标准**：新增文件识别为 addedFiles；修改文件（hash 变化）识别为 modifiedFiles；删除文件识别为 deletedFiles；未变更文件识别为 unchangedFiles；空目录无变更

### 16.3 实现 `StateManager` 增量状态持久化管理器
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-asset-orchestration/src/incremental/stateManager.ts` 实现 `StateManager` 类
- [x] 实现 `load(stateFilePath: string): Promise<IncrementalState | null>` 方法：
  - 文件不存在时返回 null（首次运行）
  - JSON 解析失败时抛出错误（状态损坏）
  - 正常时返回解析后的状态
- [x] 实现 `saveAtomic(stateFilePath: string, state: IncrementalState): Promise<void>` 方法（按 design.md 3.6.3.3 伪代码）：
  - 先写临时文件 `{stateFilePath}.tmp`
  - 设置文件权限仅限当前用户（`fs.chmod(tempPath, 0o600)`）
  - 原子重命名 `fs.rename(tempPath, stateFilePath)`
- [x] 状态文件存储在配置指定路径，默认 `state/incremental-state.json`，禁止写入系统目录
- **依赖**：16.1
- **验收标准**：首次运行返回 null；状态损坏时抛出错误；原子写入后状态可恢复；文件权限仅限当前用户

### 16.4 实现 `ConcurrencyLock` 并发冲突锁
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-asset-orchestration/src/incremental/concurrencyLock.ts` 实现 `ConcurrencyLock` 类
- [x] 实现 `acquire(lockTimeout: number): boolean` 方法：检查上次处理是否完成，未完成时返回 false（跳过本次调度）
- [x] 实现 `release(): void` 方法：释放锁
- [x] 实现 `getState(): ConcurrencyLockState` 方法：返回锁状态
- [x] 锁超时由配置 `lockTimeout` 控制，默认 3600 秒
- **依赖**：16.1
- **验收标准**：获取锁成功返回 true；上次未完成时返回 false；释放后可再次获取；超时后自动释放

### 16.5 实现 `IncrementalProcessor` 增量处理协调器
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-asset-orchestration/src/incremental/incrementalProcessor.ts` 实现 `IncrementalProcessor` 类
- [x] 实现 `process(params: IncrementalProcessParams, config: IncrementalSchedulingConfig): Promise<IncrementalProcessResult>` 方法（按 design.md 3.6.3.2 伪代码）：
  1. 并发锁检查（`ConcurrencyLock.acquire()`），未获取时记录日志"上次处理未完成，跳过本次调度"并返回 skipped
  2. 读取上次状态（`StateManager.load()`），容错：
     - 状态损坏 → 回退全量处理，报告警告"状态损坏，回退全量"
     - 首次运行（null）→ 全量处理，报告"首次运行，执行全量处理"
  3. 增量检测（`IncrementalDetector.detect()`）
  4. 无变更时返回 `{ processedFiles: [], skippedFiles: unchangedFiles.length }`
  5. 对 `addedFiles + modifiedFiles` 执行完整处理流程（`SequentialExecutor.execute()`），失败时记录到 `failedFiles`（失败隔离，不影响其他文件）
  6. 对 `deletedFiles` 清理产物（`file_masked.csv`/`file_cleaned.csv` 等）
  7. 原子更新状态（`StateManager.saveAtomic()`）
  8. 释放锁（`ConcurrencyLock.release()`）
  9. 返回 `IncrementalProcessResult`
- **依赖**：16.2、16.3、16.4
- **验收标准**：首次运行全量处理；状态损坏回退全量；无变更跳过处理；单文件失败不影响其他文件；状态原子更新

### 16.6 实现 `CronScheduler` Cron 调度适配器
- [x] **新增** `DeepSeek-Harness/packages/data-asset/data-asset-orchestration/src/incremental/cronScheduler.ts` 实现 `CronScheduler` 类
- [x] 实现 `setup(config: IncrementalSchedulingConfig): { schedulingConfig: unknown; platform: string }` 方法（按 design.md 3.6.3.4 伪代码）：
  - 解析 Cron 表达式（5 段式：minute hour day month weekday），无效时抛出"错误：无效的Cron表达式"
  - 适配宿主环境调度能力：
    - Linux/macOS：生成 crontab 条目，调用 `node` 执行增量处理入口
    - Windows：生成 PowerShell 计划任务脚本（`run_scheduled.ps1`），通过 Windows 任务计划程序调度
  - **本组件不实现独立守护进程**，依赖宿主环境调度
- [x] 实现 `isValidCron(expression: string): boolean` 方法：校验 Cron 表达式语法
- [x] Cron 表达式从配置读取，禁止硬编码调度周期
- **依赖**：16.1
- **验收标准**：合法 Cron 表达式通过校验；无效表达式抛出错误；Linux 生成 crontab 条目；Windows 生成 PowerShell 脚本

### 16.7 扩展 `data-asset-orchestration` Skill 支持增量模式（向后兼容）
- [x] **修改** `DeepSeek-Harness/packages/data-asset/data-asset-orchestration/src/index.ts`，扩展 Skill content（按 design.md 3.6.2.1 结构）：
  - 全量模式触发条件与 v1.0 一致："对某份数据执行数据资产化处理"
  - 新增增量模式触发条件："增量处理"或 Cron 调度触发
  - 全量执行步骤：脱敏→清洗→盘点→包装（v1.0 不变）
  - 增量执行步骤：读取状态→hash 对比→对变更文件执行完整流程→合并结果→更新状态
- [x] 在 `apply` 中扩展逻辑：
  - `incrementalMode = false`（默认）：走 v1.0 全量处理逻辑（`SequentialExecutor`），行为完全一致
  - `incrementalMode = true`：调用 `IncrementalProcessor.process()` 执行增量处理
- [x] **不修改** `SequentialExecutor`/`DependencyPropagator`/`ReportAggregator`/`OrchestrationExecutor`（现有全量处理行为不变）
- [x] 读取 `incrementalScheduling` 配置节点，缺失时默认全量模式（`incrementalMode: false`）
- **依赖**：16.5、16.6
- **验收标准**：`incrementalMode=false` 时编排行为与 v1.0 完全一致（回归测试）；`incrementalMode=true` 时执行增量处理；现有 Skill 全量模式无破坏

### 16.8 编写增量处理模式单元测试与集成测试
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-asset-orchestration/tests/incremental/` 编写单元测试：
  - `incrementalDetector.test.ts`：覆盖新增/修改/删除识别/hash 对比/无变更/空目录（`test_incremental_added/`/`test_incremental_modified/`/`test_incremental_deleted/`/`test_incremental_no_changes/`/`test_incremental_mixed/`）
  - `stateManager.test.ts`：覆盖原子写入/状态恢复/损坏检测/权限设置（`test_incremental_corrupted_state.json`）
  - `incrementalProcessor.test.ts`：覆盖协调流程/首次全量/状态损坏回退/失败隔离（`test_incremental_initial/`）
  - `cronScheduler.test.ts`：覆盖 Cron 解析/无效表达式拒绝/宿主适配
  - `concurrencyLock.test.ts`：覆盖获取/释放/超时/冲突跳过（`test_incremental_concurrent/`）
  - `index.test.ts`：覆盖全量模式 v1.0 兼容/增量模式启用/配置降级
- [x] 所有测试语句覆盖率 ≥ 95%
- [x] 集成测试（回归测试）：验证 `incrementalMode=false` 时编排行为与 v1.0 完全一致；验证首次运行执行全量处理并创建初始状态文件；验证第二次运行仅处理变更文件；验证状态文件原子写入（模拟写入中断后状态可恢复）；验证状态损坏时回退全量处理；验证并发冲突时跳过新调度；验证 Cron 表达式无效时拒绝调度；验证单文件处理失败不影响其他变更文件
- **依赖**：16.7
- **验收标准**：所有测试通过，覆盖率 ≥ 95%，覆盖 spec 5.11.1 所有业务规则和 5.11.3 异常场景；v1.0 回归测试全部通过

## 17. v2.0 整体集成与兼容性验证

### 17.1 更新 cordis.yml 集成 v2.0 新增插件
- [x] 在 `DeepSeek-Harness/examples/headless-agent/cordis.yml` 追加 v2.0 新增插件配置片段（按 design.md 3.7.2）：
  - `data-quality-scoring`：`@liuhange/dsh-data-quality-scoring`，config 含 `enableQualityScoring`/`reportOutputDir`
  - `data-lineage`：`@liuhange/dsh-data-lineage`，config 含 `autoEmbedInOrchestration`
  - `data-visualization`：`@liuhange/dsh-data-visualization`，config 含 `enableVisualization`/`defaultOutputDir`
  - `data-sensitivity-classification`：`@liuhange/dsh-data-sensitivity-classification`，config 含 `enableSensitivityClassification`/`sampleSize`
- [x] 加载顺序约束（按 design.md 3.7.2）：
  1. `data-asset-shared`（基础）最先加载
  2. `data-sensitivity-classification` 在 `data-masking` 之前（可选前置分级）
  3. `data-lineage` 在 `data-asset-orchestration` 之前（提供 hook 注入点）
  4. 四个处理插件平级加载
  5. `data-asset-orchestration` 在四个处理插件之后
  6. `data-quality-scoring` 和 `data-visualization` 在编排之后（可选后置阶段）
- [x] 在 `DeepSeek-Harness/examples/package.json` 声明四个新增包的依赖
- [x] 在 `DeepSeek-Harness/tsconfig.json` 添加四个新增包的 references
- [x] 高级脱敏算法和增量处理模式无需新增插件条目（扩展现有包，通过 business-rules.json 配置启用）
- **依赖**：11.10、12.8、13.7、14.7、15.8、16.7
- **验收标准**：`pnpm install` 后无报错；`pnpm run typecheck` 通过；cordis.yml 加载顺序符合约束

### 17.2 编写 v2.0 端到端测试与回归测试
- [x] 在 `DeepSeek-Harness/packages/data-asset/data-asset-orchestration/tests/e2e/v2/` 编写端到端测试：
  - **全功能协同测试**：启用全部六个新功能执行全流程，验证质量评分/血缘/高级脱敏/可视化/敏感度分级/增量处理协同工作
  - **回归测试**：v1.0 全部测试用例保持通过，验证六个新增功能不破坏现有行为
  - **配置降级测试**：逐个移除新增配置节点（qualityScoring/lineage/advancedMasking/visualization/sensitivityClassification/incrementalScheduling），验证对应功能降级且不影响其他功能
  - **向后兼容测试**：
    - v1.0 business-rules.json（无六个新节点）加载时所有新功能禁用或降级，行为与 v1.0 一致
    - `mask_sensitive_data` 仅传 `strategy` 时行为与 v1.0 完全一致
    - `data-asset-orchestration` 全量模式与 v1.0 一致
    - `lineage.enabled=false` 时无 hash 计算、无血缘文件，编排耗时与 v1.0 一致
    - `incrementalMode=false` 时走全量逻辑，无状态读写开销
- [x] 验证性能指标（spec 4.1）：
  - 质量评分 10MB 文件 ≤ 45 秒
  - 血缘记录每个 Tool 调用额外耗时 ≤ 1 秒，禁用时零开销
  - 可视化报表生成 ≤ 30 秒
  - 敏感度分级单文件 ≤ 20 秒
  - 增量检测 100 个文件 ≤ 10 秒
  - FPE 加密 10 万条记录 ≤ 60 秒
- [x] 验证安全约束（spec 4.3）：
  - FPE 密钥和哈希盐值通过环境变量注入，未硬编码
  - 差分隐私使用 `crypto.randomBytes`，未使用 `Math.random`
  - 增量状态文件权限仅限当前用户（`0o600`）
  - 哈希脱敏不可逆，未存储明文到哈希映射
- **依赖**：17.1
- **验收标准**：端到端测试通过；回归测试全部通过；配置降级测试通过；性能指标满足 spec 4.1 约束；安全约束满足 spec 4.3

## 18. v2.0 文档更新与代码审查

### 18.1 编写 v2.0 新增包 README 文档
- [x] 为 4 个新包各编写 `README.md`，按 DeepSeek Harness 规范：
  - `data-quality-scoring`：Tool 接口 `score_data_quality`、参数（filePath/outputPathDir）、返回值、四维度评分算法说明、配置节点 `qualityScoring`、异常映射
  - `data-lineage`：Tool 接口 `trace_data_lineage`、参数（lineageFilePath/outputFormat）、返回值、血缘记录格式、Mermaid 可视化说明、编排嵌入机制、配置节点 `lineage`、零开销保证
  - `data-visualization`：Tool 接口 `generate_visualization`、参数（reportPaths/outputPath）、返回值、五种图表类型、自包含 HTML 说明、交互能力、配置节点 `visualization`
  - `data-sensitivity-classification`：Tool 接口 `classify_sensitivity`、参数（filePath/outputPathDir/sampleSize）、返回值、四级敏感度说明、识别规则、推荐策略映射、配置节点 `sensitivityClassification`
- [x] 更新 `data-masking` README：追加高级脱敏算法说明（FPE/k-匿名/差分隐私/哈希）、新增可选参数 `algorithm`/`fieldName`、v1.0 兼容性说明、配置节点 `advancedMasking`
- [x] 更新 `data-asset-orchestration` README：追加增量处理模式说明、新增触发条件、Cron 调度适配、配置节点 `incrementalScheduling`、v1.0 兼容性说明
- [x] 更新 `DeepSeek-Harness/packages/data-asset/README.md`：描述 v2.0 包组结构（10 个包：6 个 v1.0 + 4 个 v2.0 新增）
- **依赖**：17.2
- **验收标准**：每个包有完整 README，符合 dsh-prose-standard 规范；v1.0 兼容性说明清晰

### 18.2 v2.0 代码审查与设计一致性核对
- [x] 审查所有 v2.0 代码：商业规则全部从 `config/business-rules.json` 对应节点读取，代码中不硬编码任何业务判断逻辑（评分权重/阈值、血缘开关、脱敏算法选择、可视化模板、敏感度规则、Cron 表达式）
- [x] 审查命名规范：所有新增 TypeScript 函数/方法/变量使用 camelCase（如 `scoreDataQuality`、`traceDataLineage`、`classifySensitivity`、`generateVisualization`、`detectIncrementalChanges`、`fpeEncrypt`、`kAnonymize`、`addDifferentialPrivacyNoise`、`hashMask`）
- [x] 审查插件导出：所有新增函数插件命名导出 `name`/`inject`/`Config`/`apply`，无默认导出
- [x] 审查路径安全：所有文件操作使用 `PathValidator` 校验，禁止路径穿越
- [x] 审查原始数据不可变：所有处理阶段写入新文件，禁止覆盖原始输入
- [x] 审查异常隔离：单个文件/单个图表/单个字段处理失败不影响其他
- [x] 审查处理报告完整性：每个阶段无论成功/失败都输出报告
- [x] 审查日志规范：`[插件名] 消息内容` 格式
- [x] 审查 TypeScript 严格模式：`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`，无 `any` 类型
- [x] 审查安全约束：FPE 密钥和盐值环境变量注入、差分隐私 `crypto.randomBytes`、状态文件 `0o600` 权限、哈希不可逆
- [x] 审查向后兼容：v1.0 API 无破坏、v1.0 配置向后兼容、血缘零开销、增量零开销
- [x] 设计回顾：与 spec.md 5.6-5.11 章节和 design.md 3.1-3.7 章节的一致性核对
- **依赖**：17.2
- **验收标准**：所有审查项通过；与 spec.md 5.6-5.11 所有验收条件一致；与 design.md 3.1-3.7 接口签名一致

### 18.3 运行 v2.0 完整测试套件与构建验证
- [x] 运行 `pnpm run clean` 清理构建产物
- [x] 运行 `pnpm install` 确保依赖安装（含 4 个新包）
- [x] 运行 `pnpm run typecheck` 确保类型检查通过（含 `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes`）
- [x] 运行 `pnpm run lint` 确保代码规范
- [x] 运行 `pnpm run test` 确保所有单元测试通过（v1.0 + v2.0）
- [x] 运行 `pnpm run test:coverage` 确保覆盖率达标（所有新增模块语句覆盖率 ≥ 95%）
- [x] 运行 `pnpm run build` 确保构建成功
- [x] 运行 `pnpm run hygiene` 确保包卫生检查通过
- [x] 运行 `pnpm run doc-sync` 确保文档同步
- [x] 验证 v1.0 回归测试全部通过
- **依赖**：18.2
- **验收标准**：所有检查命令通过，无错误无警告；v1.0 回归测试全部通过；新增模块覆盖率 ≥ 95%