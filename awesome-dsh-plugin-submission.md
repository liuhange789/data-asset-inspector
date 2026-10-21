# awesome-dsh-plugin 收录条目

> 每天最多审查3个包，过关收录。以下为分批提交计划。

## 第1批（今天提交）

| 包名 | 描述 | 安装命令 | 合规 |
|------|------|----------|------|
| `@liuhange/dsh-gov-data-inspector` | 政务办事指南巡检插件 — 检测漏项/语义/逻辑/格式错误 | `dsh plugin --profile web add @liuhange/dsh-gov-data-inspector` | ✅ insert=2 main=lib/index.js |
| `@liuhange/dsh-data-asset-shared` | 数据资产化共享基础包 — 共享类型/常量/工具函数 | `dsh plugin --profile web add @liuhange/dsh-data-asset-shared` | ✅ insert=2 main=lib/index.js |
| `@liuhange/dsh-data-asset-orchestration` | 数据资产编排主包 — 串联脱敏→清洗→盘点→封装 | `dsh plugin --profile web add @liuhange/dsh-data-asset-orchestration` | ✅ insert=2 main=lib/index.js |

## 第2批（明天提交）

| 包名 | 描述 | 安装命令 |
|------|------|----------|
| `@liuhange/dsh-ai-dataset-inspector` | AI训练数据集质检插件 | `dsh plugin --profile web add @liuhange/dsh-ai-dataset-inspector` |
| `@liuhange/dsh-city-data-classifier` | 城市数据AI分类插件 | `dsh plugin --profile web add @liuhange/dsh-city-data-classifier` |
| `@liuhange/dsh-construction-data-inventory` | 建筑工程数据资产盘点插件 | `dsh plugin --profile web add @liuhange/dsh-construction-data-inventory` |

## 第3批（后天提交）

| 包名 | 描述 | 安装命令 |
|------|------|----------|
| `@liuhange/dsh-data-asset-attestation` | 数据资产认证报告插件 | `dsh plugin --profile web add @liuhange/dsh-data-asset-attestation` |
| `@liuhange/dsh-data-asset-compliance-check` | 数据资产合规检查插件 | `dsh plugin --profile web add @liuhange/dsh-data-asset-compliance-check` |
| `@liuhange/dsh-data-asset-quality-score` | 数据资产质量评分插件 | `dsh plugin --profile web add @liuhange/dsh-data-asset-quality-score` |

## 后续批次（每天3个，依此类推）

剩余包将按每天3个的节奏陆续提交，每个包提交前确保：
1. cordis.patch.yml 有可挂载的 insert 行
2. package.json 有 main + files 含 cordis.patch.yml
3. 描述与实际功能一致
4. 所需依赖在 peerDependencies 中写清

## 仓库信息

- **npm scope**: `@liuhange`
- **源码仓库**: [data-asset-inspector](https://github.com/liuhange789/data-asset-inspector)
- **许可证**: MIT
