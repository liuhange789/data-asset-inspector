# @liuhange/dsh-city-data-classifier

## 基本信息

| 项目 | 值 |
|------|-----|
| 插件名 | dsh-city-data-classifier |
| 包名 | @liuhange/dsh-city-data-classifier |
| 版本 | 3.1.0 |
| 工具 | classify_city_data, confirm_city_classification |

## 功能说明

AI自动推荐城市/组织数据的国标分类（GB/T 47949-2026）和敏感度分级，生成登记台账。支持人工复核确认AI推荐结果，输出含资产代码、敏感度等级和登记条目的分类报告。

## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-city-data-classifier
```

## 用法

```javascript
import { apply } from '@liuhange/dsh-city-data-classifier';
apply(ctx); // 注册工具: classify_city_data, confirm_city_classification
```

## 政策依据

| 文件名称 | 文号 | 核心条款摘要 |
|---------|------|------------|
| 资产管理 数据资产分类与代码 | GB/T 47949-2026 | 数据资产分为结构化、半结构化、非结构化三小类，16项具体细类 |
| 资产管理 数据资产登记指南 | GB/T 47950-2026 | 明确初始、变更和注销登记流程 |
| 基于AI的城市数据分类分级框架 | ITU-T Y.4550（立项阶段） | AI赋能城市数据分类分级 |

## License

MIT
