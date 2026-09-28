# @liuhange/dsh-gov-data-inspector

## 基本信息

| 项目 | 值 |
|------|-----|
| 插件名 | dsh-gov-data-inspector |
| 包名 | @liuhange/dsh-gov-data-inspector |
| 版本 | 3.1.0 |
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
