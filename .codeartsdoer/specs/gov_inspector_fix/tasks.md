# gov-data-inspector 插件缺陷修复实现任务列表

> 修复目标：@liuhange/dsh-gov-data-inspector 政务数据巡检插件交付缺陷修复与异常健壮性增强。
> 约束：仅修改 gov-data-inspector 插件代码及相关配置；修复不得引入新破坏；所有报告必须包含 policyBasis 字段；零硬编码。
> 任务依赖：P0（打包配置）独立可先行；P1（检查顺序+降级）→ P2（事项匹配）→ P3（异常输入）存在代码层依赖，建议串行；全局交付与验证依赖全部修复完成。

## 1. 修复插件打包配置（P0：dsh.bundle.patch 配置错误）

> 目标：24 个 @liuhange/dsh-* 包的 dsh.bundle.patch 由布尔值 true 改为合法文件路径字符串，并补齐 cordis.patch.yml 补丁文件，使 DSH 插件管理器安装零警告。

### 1.1 批量修正 24 个包的 dsh.bundle.patch 字段
- [ ] 遍历 `packages/data-asset/` 下全部 24 个子包的 `package.json`，将 `dsh.bundle.patch` 字段值由 `true` 替换为 `"./cordis.patch.yml"` 字符串路径
- [ ] 逐包核对修改结果，确保 24 个包无遗漏（含 gov-data-inspector、ai-dataset-inspector、city-data-classifier、data-asset-attestation、data-asset-compliance-check、data-asset-inventory-scan、data-asset-orchestration、data-asset-quality-score、data-asset-registration-helper、data-asset-shared、data-asset-valuation、data-circulation-assessor、data-cleaning、data-inventory、data-lineage、data-masking、data-packaging、data-quality-scoring、data-sensitivity-classification、data-visualization、generate-registration-docs、match-registration-agency、registration-precheck、visibility-doctor）

### 1.2 为 24 个包新建 cordis.patch.yml 补丁声明文件
- [ ] 在每个包根目录新建 `cordis.patch.yml`，内容符合 DSH 插件配置层规范（声明 Cordis 框架运行时补丁）
- [ ] 校验 24 个 `cordis.patch.yml` 文件均存在且 YAML 语法合法，dsh.bundle.patch 指向路径与文件实际位置一致

### 1.3 验证 DSH 插件安装零警告
- [ ] 执行 `dsh plugin --profile web add @liuhange/dsh-gov-data-inspector`，确认安装成功、无配置相关警告、插件出现在 `dsh plugin list` 列表中
- [ ] 构造补丁文件缺失与格式非法两个异常场景，确认安装阶段即报错并给出明确提示（"补丁文件缺失"/"补丁配置格式错误"）

### 1.4 递增 patch 版本号并发布 npm
- [ ] 对全部 24 个包执行 patch 版本号 bump（patch 段较修复前递增 1）
- [ ] 执行 `pnpm publish -r`（或等价命令）将 24 个修复版本包发布到 npm 注册表，确认 npm 上各包版本号已更新

## 2. 重排检查执行顺序并实现无凭据降级模式（P1：知识库检查顺序 + 无凭据降级）

> 目标：将检查顺序重排为「输入校验 → 数据格式检查 → 知识库凭据检查 → 检测执行」；无凭据时进入降级模式而非中止，分类模式独立运行，语义/逻辑降级为本地规则；端点协议宽松化支持 HTTP/本地路径。

### 2.1 新增端点协议解析器 EndpointResolver
- [ ] 在 `packages/data-asset/gov-data-inspector/src/endpointResolver.ts` 新增 `resolve(endpoint: string): { kind: 'https' | 'http' | 'file'; target: string } | null`，区分 HTTPS/HTTP/本地文件路径三类端点，不可解析返回 null
- [ ] 单元测试覆盖：HTTPS URL、HTTP URL、本地绝对路径、本地相对路径、非法字符串五类输入

### 2.2 移除数据源 https:// 硬约束
- [ ] 修改 `packages/data-asset/gov-data-inspector/src/nationalDataSource.ts` 与 `provincialDataSource.ts`，移除 `endpoint.startsWith('https://')` 硬约束，改用 EndpointResolver 分发：URL 走 fetch 请求（10 秒超时）、本地路径走 fs 读取、无凭据或不可达返回 FAILED_RESULT
- [ ] 单元测试覆盖：HTTP 端点正常加载、本地文件路径正常加载、HTTPS 端点不因协议被拒

### 2.3 重排 execute 内检查步骤顺序
- [ ] 重构 `packages/data-asset/gov-data-inspector/src/index.ts` 的 `execute` 函数，将数据加载与格式检查（readFileSync + JSON.parse + 非空校验）前移至知识库凭据检查（KnowledgeBaseLoader.load）之前，形成显式有序阶段：输入校验 → 数据格式检查 → 知识库凭据检查 → 检测执行
- [ ] 验证：提交坏 JSON 且无凭据时返回 GOV_DATA_INPUT_INVALID（数据格式错误），而非 GOV_DATA_KB_MISSING

### 2.4 新增降级模式控制器 DegradedModeController
- [ ] 在 `packages/data-asset/gov-data-inspector/src/degradedModeController.ts` 新增 `activate(reason: string): { degradedMode: true; degradedReason: string; localKb: KnowledgeBase }`，构造空知识库结构与降级标记，保证分类模式可独立运行
- [ ] 单元测试覆盖：activate 返回 degradedMode 为 true、degradedReason 与入参一致、localKb 为合法空知识库结构

### 2.5 改造 KnowledgeBaseLoader.load 为降级返回
- [ ] 修改 `packages/data-asset/gov-data-inspector/src/knowledgeBaseLoader.ts` 的 `load` 方法，allFailed（国家与省级数据源均 failed）时不抛 GOV_DATA_KB_MISSING，改为返回 `{ kb: 空知识库, degraded: true, degradedReason }`；凭据可用时 `degraded: false`
- [ ] 修改 `index.ts` 中对 load 的调用与异常捕获逻辑，凭据缺失/不可达时调用 DegradedModeController.activate 切换降级模式，而非返回错误中止
- [ ] 单元测试覆盖：双源可用 degraded=false、仅国家可用 degraded=true、仅省级可用 degraded=true、双源不可用 degraded=true 且不抛错

### 2.6 透传降级标志至检测编排与语义引擎
- [ ] 修改 `packages/data-asset/gov-data-inspector/src/inspectionOrchestrator.ts` 的 `orchestrate`，新增 `options?: { degradedMode?: boolean; itemTypeOverride?: string; warnings?: UnmatchedWarning[] }` 入参，透传降级标志至各子引擎
- [ ] 修改 `packages/data-asset/gov-data-inspector/src/semanticRuleEngine.ts` 的 `detect`，新增 `options?: { degradedMode?: boolean; itemTypeOverride?: string }` 入参；降级时基于本地规则配置执行语义检测而非远端知识库比对，kb 不可用且未降级时返回空详情而非抛错
- [ ] 修改 `index.ts` 巡检报告构造逻辑，降级时注入 `degradedMode: true` 与 `degradedReason` 字段；inspectionMode=classification 时分类模式独立运行并返回有效分类结果
- [ ] 验证：无凭据且 inspectionMode=classification 返回有效分类结果；无凭据且 inspectionMode=guide/full 语义/逻辑检测基于本地规则执行且结果标注降级；有凭据时 degradedMode 不为 true 且检测精度不回退（语义 92.3%、逻辑 100%、漏项 100%、格式 100%、误报 0%）

## 3. 扩展事项类型匹配并消除语义检测盲区（P2：matchItemType 静默跳过）

> 目标：matchItemType 扩展为四通道匹配（手动覆盖 → 名称关键词 → 编码前缀 → 流程字段关键词）；未匹配时生成 UNMATCHED_ITEM_TYPE 警告而非静默跳过；新增 itemTypeOverride 工具参数。

### 3.1 新增流程字段关键词匹配通道
- [ ] 在 `packages/data-asset/gov-data-inspector/src/semanticRuleEngine.ts` 新增流程字段匹配逻辑，读取办事指南流程相关字段（如"办理流程""工作流程"）文本，对其执行 itemTypeMatching.keywords 关键词匹配
- [ ] 扩展 `matchItemType` 返回类型为 `{ itemType: string | null; matchSource: 'manual' | 'name' | 'code' | 'flow' | null }`，匹配优先级：手动指定 → 名称关键词 → 编码前缀 → 流程字段关键词，全通道未命中返回 `{ itemType: null, matchSource: null }`
- [ ] 单元测试覆盖：名称命中、编码命中、流程字段命中（如名称为"建设工程规划核实"但流程字段含"现场勘查"判为现场勘查类）、全通道未命中四类场景

### 3.2 新增未匹配警告构造器 UnmatchedWarningBuilder
- [ ] 在 `packages/data-asset/gov-data-inspector/src/unmatchedWarningBuilder.ts` 新增 `build(guideId: string): UnmatchedWarning`，返回 `{ type: 'UNMATCHED_ITEM_TYPE', guideId, message: '该事项未匹配到检测规则，语义检测被跳过' }`
- [ ] 修改 `semanticRuleEngine.ts` 的 `detect`，matchItemType 全通道返回 null 时调用 UnmatchedWarningBuilder.build 生成警告并返回 `{ details: [], unmatched: true }`，禁止静默返回空数组
- [ ] 修改 `inspectionOrchestrator.ts` 汇总未匹配警告至 `options.warnings`，最终汇入 InspectionReport.warnings 数组
- [ ] 单元测试覆盖：未匹配时报告含 UNMATCHED_ITEM_TYPE 警告及明确跳过说明；"建设工程规划核实"现场勘查类语义错误被检出并报告

### 3.3 新增 itemTypeOverride 工具参数
- [ ] 修改 `packages/data-asset/gov-data-inspector/src/index.ts` 工具参数声明，在 `parameters.properties` 新增 `itemTypeOverride`（选填字符串，手动指定事项类型）；execute 内读取并透传至 SemanticRuleEngine.detect 的 options.itemTypeOverride
- [ ] 修改 `matchItemType` 支持 `options.itemTypeOverride`，已提供时直接使用手动指定类型并标注 `matchSource: 'manual'`，忽略自动匹配结果
- [ ] 单元测试覆盖：用户手动指定事项类型为现场勘查类时按现场勘查类规则执行语义检测；手动指定与自动匹配冲突时以手动指定为准且报告标注使用用户指定类型

## 4. 增强异常输入健壮性（P3：异常输入测试）

> 目标：新增编码识别、超长数据校验、URL 可达性检查三个异常处理组件；覆盖 6 个异常场景测试，确保任何异常输入不导致插件崩溃或未捕获异常。

### 4.1 新增编码识别器 EncodingDetector
- [ ] 在 `packages/data-asset/gov-data-inspector/src/encodingDetector.ts` 新增 `detect(filePath: string): { content: string | null; encodingError?: string }`，文件读取阶段检测编码（GBK、Latin-1 等非 UTF-8），非 UTF-8 时返回明确编码错误提示或优雅处理
- [ ] 单元测试覆盖：UTF-8 文件正常读取、GBK 文件返回编码错误提示、Latin-1 文件不产生乱码崩溃

### 4.2 新增超长数据规模校验器 DataScaleGuard
- [ ] 在 `packages/data-asset/gov-data-inspector/src/dataScaleGuard.ts` 新增 `check(data: unknown[]): { exceeded: boolean; fieldCount: number }`，校验字段总数是否超 100 万上限（上限值从配置读取而非硬编码）
- [ ] 修改 `index.ts` 数据加载后调用 DataScaleGuard.check，超限时 3 秒内返回 GOV_DATA_INPUT_INVALID + "数据量超出处理上限"提示，禁止长时间阻塞或内存溢出
- [ ] 单元测试覆盖：正常规模数据通过、超 100 万字段数据返回 exceeded=true 且 3 秒内响应

### 4.3 新增 URL 可达性检查器 UrlReachabilityChecker
- [ ] 在 `packages/data-asset/gov-data-inspector/src/urlReachabilityChecker.ts` 新增 `check(dataSource: string): { reachable: boolean; error?: string }`，dataSource 为 URL 时校验可达性，不可达返回友好提示
- [ ] 修改 `index.ts` 输入校验阶段集成 UrlReachabilityChecker，无效 URL 返回 GOV_DATA_INPUT_INVALID + "数据源不可达，请检查路径或 URL"
- [ ] 单元测试覆盖：合法 URL 可达、格式错误 URL 不可达、不可达 URL 返回明确提示且无未捕获异常

### 4.4 集成异常处理至 execute 入口
- [ ] 修改 `packages/data-asset/gov-data-inspector/src/index.ts` 的 `execute`，在数据加载阶段集成 EncodingDetector 替代裸 readFileSync；在输入校验阶段集成 UrlReachabilityChecker；在数据加载后集成 DataScaleGuard
- [ ] 统一异常映射：坏 JSON → GOV_DATA_INPUT_INVALID + "JSON 格式错误，请检查文件内容"；空数据 → "无数据，请确认输入文件内容"；超长 → "数据量超出处理上限"；无效 URL → "数据源不可达，请检查路径或 URL"；非 UTF-8 → "文件编码非 UTF-8"
- [ ] 验证：上述任意异常输入均返回明确友好错误信息，进程不崩溃、无未捕获异常

### 4.5 新增 6 个异常输入测试用例
- [ ] 在 `packages/data-asset/gov-data-inspector/src/__tests__/` 新增异常输入测试套件，覆盖：① 坏 JSON 文件 ② 空数据（空文件/空数组/空对象）③ 超长数据（超 100 万字段）④ 无效 URL 数据源 ⑤ 部分必填字段缺失 ⑥ 非 UTF-8 编码文件
- [ ] 每个用例断言：返回明确友好错误码与提示、无崩溃、无未捕获异常；部分字段缺失用例额外断言报告中列出缺失字段清单

## 5. 全局交付保障

> 目标：完整测试套件通过、修复报告输出、README 更新、npm 发布与 GitHub release、policyBasis 必备校验、修复不引入新破坏。

### 5.1 运行完整测试套件
- [ ] 执行 `npm test`（或 `pnpm test`）运行完整测试套件，确认原有 46 个测试加新增异常输入测试全部通过，无失败、无跳过
- [ ] 任一修复项完成后执行回归测试，确认原有通过的测试仍全部通过（修复一个缺陷不得引入新破坏）

### 5.2 校验 policyBasis 必备字段
- [ ] 验证任意巡检模式（guide/classification/full）输出报告均包含非空 policyBasis 字段，降级模式报告同样包含 policyBasis
- [ ] 若存在缺失 policyBasis 的报告路径，补充 `packages/data-asset/gov-data-inspector/src/policyBasis.ts` 调用确保所有报告分支均注入政策依据

### 5.3 输出修复报告
- [ ] 生成修复报告文档，逐项对应修复项 1-4（P0 打包配置、P1 检查顺序+降级、P2 事项匹配、P3 异常输入）的验收标准说明达成情况，标注达成/未达成状态

### 5.4 更新 README
- [ ] 更新 `packages/data-asset/gov-data-inspector/README.md`，新增"无凭据降级模式"说明章节（降级触发条件、降级表现、degradedMode/degradedReason 字段含义）
- [ ] 新增"异常输入处理"说明章节（6 类异常场景的错误码与提示、itemTypeOverride 参数用法、端点协议宽松化说明）

### 5.5 发布 npm 并创建 GitHub Release
- [ ] 确认 24 个包 patch 版本号已 bump 且已发布到 npm（与任务 1.4 协同），npm 上存在修复版本包
- [ ] 在 GitHub 上创建对应 release，关联修复版本号与修复报告

## 6. 验证与审查

> 目标：最终验证确保交付质量，关键代码 Review、设计与实现一致性核对、变更范围最终确认。

### 6.1 代码审查
- [ ] 审查新增文件（endpointResolver.ts、degradedModeController.ts、unmatchedWarningBuilder.ts、encodingDetector.ts、dataScaleGuard.ts、urlReachabilityChecker.ts）的类型安全约束：新增字段标注可选、matchSource 联合类型穷举、UnmatchedWarning.type 为字面量类型、禁用 any
- [ ] 审查零硬编码约束：所有业务判定规则（超长数据上限、匹配关键词、端点协议等）均从外部配置或官方数据源读取，源码中无硬编码业务阈值或关键词

### 6.2 设计与实现一致性核对
- [ ] 核对 design.md 接口清单（inspect_gov_data、InspectionOrchestrator.orchestrate、KnowledgeBaseLoader.load、SemanticRuleEngine.detect、matchItemType、NationalDataSource.fetch、ProvincialDataSource.fetch、EndpointResolver.resolve、DegradedModeController.activate、UnmatchedWarningBuilder.build、EncodingDetector.detect、DataScaleGuard.check）的签名与实现一致
- [ ] 核对检查执行顺序状态机（输入校验 → 数据格式检查 → 知识库凭据检查 → 检测执行）与 index.ts 实际步骤顺序一致；核对降级模式决策活动图与 DegradedModeController/KnowledgeBaseLoader 实现一致；核对事项类型匹配决策流与 matchItemType 实现一致

### 6.3 变更范围最终确认
- [ ] 确认变更仅限于 gov-data-inspector 插件代码及相关配置（24 个包的 package.json 与 cordis.patch.yml），未修改任何 UI 界面与现有新版前端代码，未修改非 gov-data-inspector 插件的核心检测逻辑
- [ ] 确认向后兼容：InspectionReport 新增 degradedMode/degradedReason/warnings 为可选字段，有凭据用户输出格式不变；OrchestrateConfig 不变，降级标志通过 options 透传；itemTypeMatching 配置结构不变