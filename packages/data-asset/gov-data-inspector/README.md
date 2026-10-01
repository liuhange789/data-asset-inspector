# @liuhange/dsh-gov-data-inspector

## 基本信息

| 项目 | 值 |
|------|-----|
| 插件名 | dsh-gov-data-inspector |
| 包名 | @liuhange/dsh-gov-data-inspector |
| 版本 | 3.2.0 |
| 工具 | inspect_gov_data |

## 功能说明

政务数据专项巡检，含办事指南质量检查（必填要素完整性、语义错误检测、服务便利度评估）和公共数据资产分类（基于GB/T 47949-2026结构化/半结构化/非结构化分类）。

## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-gov-data-inspector
```

## 用法

```javascript
import { apply } from '@liuhange/dsh-gov-data-inspector';
apply(ctx); // 注册工具: inspect_gov_data
```

## 政策依据

| 文件名称 | 文号 | 核心条款摘要 |
|---------|------|------------|
| 资产管理 数据资产分类与代码 | GB/T 47949-2026 | 数据资产分为结构化、半结构化、非结构化三小类，16项具体细类 |
| 资产管理 数据资产登记指南 | GB/T 47950-2026 | 明确初始、变更和注销登记流程 |

## License

MIT
## 无凭据降级模式

当官方数据源（国家/省级）凭据未配置或不可达时，插件自动进入**降级模式**而非中止运行。

### 降级触发条件

- 国家和省级数据源均未配置 API Key / Endpoint
- 国家和省级数据源均不可达（网络超时、HTTP 错误等）

### 降级表现

| 检测模式 | 完整模式表现 | 降级模式表现 |
|---------|------------|------------|
| classification | 正常分类 | **正常分类**（不依赖知识库） |
| guide | 语义检测基于官方知识库 | 语义检测降级为本地规则检测 |
| full | 全量检测 | 分类正常 + 语义/逻辑降级 |

### 降级标记

降级模式下，巡检报告包含以下额外字段：

```json
{
  "degradedMode": true,
  "degradedReason": "官方数据源全部不可用，已降级为本地规则检测模式"
}
```

### 端点协议宽松化

数据源端点支持以下三种协议：
- `https://` — HTTPS 远程端点
- `http://` — HTTP 远程端点（不再强制 HTTPS）
- 本地文件路径 — 直接读取本地 JSON 文件

## 异常输入处理

插件对以下异常输入场景提供明确的友好错误提示，不会崩溃或产生未捕获异常：

| 异常场景 | 错误码 | 错误提示 |
|---------|--------|---------|
| 格式错误的 JSON | `GOV_DATA_INPUT_INVALID` | JSON 格式错误，请检查文件内容 |
| 空数据（空文件/空数组） | `GOV_DATA_INPUT_INVALID` | 无数据，请确认输入文件内容 |
| 超长数据（超 100 万字段） | `GOV_DATA_SCALE_EXCEEDED` | 数据量超出处理上限 |
| 无效 URL / 不可达路径 | `GOV_DATA_URL_UNREACHABLE` | 数据源不可达，请检查路径或 URL |
| 非 UTF-8 编码文件 | `GOV_DATA_ENCODING_ERROR` | 文件编码非 UTF-8 |
| 部分字段缺失 | 正常处理 | 报告中列出缺失字段清单 |

### itemTypeOverride 参数

当自动匹配无法识别事项类型时，用户可通过 `itemTypeOverride` 参数手动指定：

```javascript
execute({
  dataSource: './data.json',
  inspectionMode: 'guide',
  itemTypeOverride: '现场勘查类'
})
```

### 未匹配事项类型警告

当事项无法匹配到任何检测规则时，报告中会包含 `UNMATCHED_ITEM_TYPE` 警告：

```json
{
  "warnings": [
    {
      "type": "UNMATCHED_ITEM_TYPE",
      "guideId": "建设工程规划核实",
      "message": "该事项未匹配到检测规则，语义检测被跳过"
    }
  ]
}
```

匹配逻辑支持四通道：手动指定 → 名称关键词 → 编码前缀 → 流程字段关键词。
## 配置包机制

本插件采用**通用检测引擎 + 可替换配置包**架构。插件本体不含任何地区特定的政策标准，所有地区差异通过配置包注入。新增地区配置包无需修改插件代码。

### 架构原理

```
┌─────────────────────────┐     ┌──────────────────────────┐
│  通用检测引擎（插件）    │◄────│  地区配置包（可替换）     │
│  - 格式校验              │     │  - 政策依据              │
│  - 语义检测              │     │  - 必填字段              │
│  - 逻辑检测              │     │  - 格式规则              │
│  - 评分计算              │     │  - 标准词表              │
│  - 分类判定              │     │  - 数据源凭证            │
└─────────────────────────┘     └──────────────────────────┘
```

### 配置包加载优先级

插件按以下三级优先级加载配置包：

1. **文件路径**（`GOV_CONFIG_PACK_PATH` 环境变量）— 加载指定 JSON 文件
2. **npm 包**（`GOV_CONFIG_PACK_PACKAGE` 环境变量）— 加载已安装的 npm 配置包
3. **缺省配置包** — 插件内置的通用配置包，作为兜底

每级加载成功后执行 Schema 校验，校验失败则记录告警并尝试下一级。三级全部失败时抛出 `GOV_CONFIG_PACK_UNAVAILABLE` 错误。

### 环境变量

| 环境变量 | 说明 | 示例 |
|---------|------|------|
| `GOV_CONFIG_PACK_PATH` | 配置包 JSON 文件的绝对或相对路径 | `/path/to/config-pack.json` |
| `GOV_CONFIG_PACK_PACKAGE` | 已安装的 npm 配置包包名 | `@liuhange/gov-config-gd` |

两个环境变量均为可选。同时设置时，`GOV_CONFIG_PACK_PATH` 优先于 `GOV_CONFIG_PACK_PACKAGE`。均未设置时使用缺省配置包。

### 巡检报告来源标注

加载配置包后，巡检报告包含以下来源标注字段：

```json
{
  "configPackId": "gd-gov-2026",
  "region": "广东省",
  "configPackVersion": "2026.1.0"
}
```

使用缺省配置包时，`configPackId` 为 `default`，`region` 为 `通用`。

## 如何新增地区配置包

### 配置包字段清单

配置包 JSON 文件包含以下 14 个必填字段与 5 个可选字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `configPackId` | string | 是 | 配置包标识，格式 `^[a-z]{2}-[a-z]+-\d{4}$` |
| `region` | string | 是 | 地区名称 |
| `configPackVersion` | string | 是 | 语义化版本号 |
| `policyBasis` | array | 是 | 政策依据文档列表 |
| `requiredFields` | string[] | 是 | 办事指南必填字段列表 |
| `formatRules` | array | 是 | 格式校验规则（含正则） |
| `localStandardTerms` | object | 是 | 本地标准词表（materials + conditions） |
| `logicErrorRules` | array | 是 | 逻辑错误检测规则 |
| `scoringWeights` | object | 是 | 评分权重（completeness + accuracy + traceability，和为 1） |
| `itemTypeMatching` | object | 是 | 事项类型匹配规则 |
| `severityMapping` | object | 是 | 严重等级映射 |
| `gbtMapping` | object | 是 | GB/T 47949 分类映射 |
| `dataSourceCredentials` | object | 是 | 数据源凭证配置 |
| `dataSourcePriority` | string[] | 是 | 数据源优先级 |
| `convenienceWeights` | object | 否 | 便利度权重 |
| `materialConciseThreshold` | number | 否 | 材料精简阈值 |
| `missingFieldStandardClause` | string | 否 | 缺失字段标准条款引用 |
| `degradedSimilarityThreshold` | number | 否 | 降级相似度阈值 |
| `inputLengthThreshold` | number | 否 | 输入长度阈值 |

### 字段名兼容映射

配置包支持新旧字段名兼容。当旧名字段存在而新名字段缺失时，自动映射：

| 新字段名 | 旧字段名（兼容） |
|---------|---------------|
| `requiredFields` | `guideRequiredElements` |
| `scoringWeights` | `scoreWeights` |
| `gbtMapping` | `gbt47949Mapping` |

新名与旧名同时存在时，新名优先。

### 创建步骤

1. **创建配置包 JSON 文件**：按上述字段清单编写 `config-pack.json`，填入目标地区的政策依据、标准词表等

2. **Schema 校验**：使用 `@liuhange/gov-config-schema` 包离线校验配置包内容

3. **创建 npm 包**：`package.json` 中 `name` 使用 scoped 命名 `@liuhange/gov-config-{地区缩写}`，`exports` 指向 `config-pack.json`

4. **发布**：`npm publish --access public`

5. **使用**：安装配置包后设置环境变量 `GOV_CONFIG_PACK_PACKAGE=@liuhange/gov-config-{地区缩写}`

### 已有地区配置包

| 包名 | 地区 | 版本 |
|------|------|------|
| `@liuhange/gov-config-gd` | 广东省 | 2026.1.0 |
| `@liuhange/gov-config-zj` | 浙江省 | 2026.1.0 |
| `@liuhange/gov-config-schema` | Schema 校验工具 | 2026.1.0 |

## 配置包交付周期

配置包独立于插件发布，遵循语义化版本管理：

- **政策更新时**：配置包 minor 或 patch 版本升级（如 `2026.1.0` → `2026.1.1`），插件版本不变
- **新增地区配置包**：新建 npm 包，初始版本 `2026.1.0`
- **配置包 Schema 变更**：`@liuhange/gov-config-schema` 版本升级，插件内嵌 Schema 同步更新

配置包维护者可通过 `@liuhange/gov-config-schema` 包离线校验配置包内容，无需安装完整插件。
