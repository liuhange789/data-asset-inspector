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
