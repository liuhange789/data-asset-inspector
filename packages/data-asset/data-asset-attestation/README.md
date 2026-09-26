# @liuhange/dsh-data-asset-attestation

## 基本信息

| 项目 | 值 |
|------|-----|
| 插件名 | dsh-data-asset-attestation |
| 包名 | @liuhange/dsh-data-asset-attestation |
| 版本 | 3.1.0 |
| 工具 | attest_data_quality |

## 功能说明

生成鉴证级数据质量报告，含时间戳、证据链哈希和鉴证声明。基于六维质量评分结果，自动定位异常项并生成鉴证声明，输出可用于数据资产入表、融资增信等场景的鉴证报告底稿。

## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-data-asset-attestation
```

## 用法

```javascript
import { apply } from '@liuhange/dsh-data-asset-attestation';
apply(ctx); // 注册工具: attest_data_quality
```

## 政策依据

| 文件名称 | 文号 | 核心条款摘要 |
|---------|------|------------|
| 数据质量鉴证评价方法 | T/CIIA 060-2025 | 为数据资产入表、数据价值评估、数据融资增信、数据合规审计、数据产品定价等场景提供评价依据 |
| 企业数据资源相关会计处理暂行规定 | 财会〔2023〕11号 | 外购数据资源的成本包括数据权属鉴证、质量评估、登记结算、安全管理等费用 |

## License

MIT
