# @liuhange/dsh-data-circulation-assessor

## 基本信息

| 项目 | 值 |
|------|-----|
| 插件名 | dsh-data-circulation-assessor |
| 包名 | @liuhange/dsh-data-circulation-assessor |
| 版本 | 3.1.0 |
| 工具 | assess_circulation |

## 功能说明

评估数据的可流通性，含可信数据空间接入就绪度（身份认证、资源封装、目录维护、审计追溯）和交易合规预判（参与方、交易平台、交易标的、交易过程），输出可流通性评分和改进建议。

## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-data-circulation-assessor
```

## 用法

```javascript
import { apply } from '@liuhange/dsh-data-circulation-assessor';
apply(ctx); // 注册工具: assess_circulation
```

## 政策依据

| 文件名称 | 文号 | 核心条款摘要 |
|---------|------|------------|
| 可信数据空间发展行动计划（2024—2028年） | 国数资源〔2024〕119号 | 支持可信数据空间运营者构建接入认证体系、数据资源封装、目录维护等 |
| 数据安全技术 数据交易服务安全要求 | GB/T 37932-2025 | 规定数据交易参与方、交易平台、交易标的及交易过程的安全要求 |

## License

MIT
