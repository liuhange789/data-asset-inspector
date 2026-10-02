# @liuhange/dsh-fin-aml-checker

金融反洗钱合规检测插件。依据《反洗钱法》与央行令，检测大额及可疑交易阈值、豁免过滤、时效性、KYC客户身份识别、CFT反恐融资，生成监管报送就绪报告。

## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-fin-aml-checker
```

## 用法

```javascript
import { apply } from '@liuhange/dsh-fin-aml-checker';
apply(ctx); // 注册工具: inspect_aml_data
```

## 法规依据

| 文件名称 | 文号 | 核心条款摘要 |
|---------|------|------------|
| 反洗钱法 | 主席令第4号 | 金融机构大额及可疑交易报告义务 |
| 金融机构反洗钱规定 | 央行令〔2022〕第1号 | 大额交易阈值20万/5万，可疑交易12项标准 |

## License

MIT

## 兼容性

- DSH Runtime: ^4.0.0
- Node.js: 22+
- TypeScript: 5.7