# @liuhange/dsh-ai-dataset-inspector

## 基本信息

| 项目 | 值 |
|------|-----|
| 插件名 | dsh-ai-dataset-inspector |
| 包名 | @liuhange/dsh-ai-dataset-inspector |
| 版本 | 3.1.0 |
| 工具 | inspect_ai_dataset |

## 功能说明

检查AI训练数据集质量，涵盖标注一致性（Kappa系数）、标签均衡性（类别分布比）、数据泄露检测（训练/验证集重叠）等维度。支持引用data-masking结果检测PII残留。

## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-ai-dataset-inspector
```

## 用法

```javascript
import { apply } from '@liuhange/dsh-ai-dataset-inspector';
apply(ctx); // 注册工具: inspect_ai_dataset
```

## 政策依据

| 文件名称 | 文号 | 核心条款摘要 |
|---------|------|------------|
| 关于推进行业高质量数据集建设行动的实施方案 | 国数发〔2026〕39号 | 部署强基扩容、标注攻坚、提质增效、应用赋能、管理服务、价值释放六大行动 |
| 高质量数据集建设指南 | T/TC609 005-2025 | 覆盖数据需求、规划、采集、预处理、标注、模型验证全生命周期 |

## License

MIT
