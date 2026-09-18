# 数据资产体检仪·周边插件产品矩阵 (Data Asset Inspector Plugin Suite)

[![Listed on dsh-plugin.org](https://dsh-plugin.org/badges/listed.svg)](https://dsh-plugin.org/plugins/liuhange789/data-asset-inspector)
[![npm version](https://img.shields.io/npm/v/@liuhange/dsh-data-asset-shared.svg)](https://www.npmjs.com/package/@liuhange/dsh-data-asset-shared)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

基于 DeepSeek Harness (DSH) 的数据资产入表全流程插件矩阵，覆盖"盘点→质量→估值→合规→登记"完整业务链路。每个插件嵌入政策依据引用，确保"有理有据、可审计、可追溯"。

## 插件列表

| 插件 | 包名 | 功能 | 版本 |
|------|------|------|------|
| 共享基础 | @liuhange/dsh-data-asset-shared | 类型定义、配置加载、政策依据引用 | 3.1.1 |
| 数据资产盘点扫描 | @liuhange/dsh-data-asset-inventory-scan | 目录扫描、元数据提取、资产编目 | 3.1.1 |
| 数据资产质量评分 | @liuhange/dsh-data-asset-quality-score | 六维质量评分（完整性/准确性/一致性/时效性/唯一性/有效性） | 3.1.1 |
| 数据资产估值 | @liuhange/dsh-data-asset-valuation | 成本法/收益法/市场法估值、资本化追溯禁止 | 3.1.1 |
| 数据资产合规审查 | @liuhange/dsh-data-asset-compliance-check | 合规检查、全过程管理试点依据嵌入 | 3.1.1 |
| 数据资产登记助手 | @liuhange/dsh-data-asset-registration-helper | 三重审核、七步流程、登记材料生成 | 3.1.1 |

## 安装方式

### 方式一：DSH CLI 安装（推荐）

```bash
# 启动 DeepSeek Harness
npx @deepseek-ai/dsh web

# 安装插件（逐个安装）
dsh plugin --profile web add @liuhange/dsh-data-asset-shared
dsh plugin --profile web add @liuhange/dsh-data-asset-inventory-scan
dsh plugin --profile web add @liuhange/dsh-data-asset-quality-score
dsh plugin --profile web add @liuhange/dsh-data-asset-valuation
dsh plugin --profile web add @liuhange/dsh-data-asset-compliance-check
dsh plugin --profile web add @liuhange/dsh-data-asset-registration-helper
```

### 方式二：npm/pnpm 直接安装

```bash
npm install @liuhange/dsh-data-asset-shared
npm install @liuhange/dsh-data-asset-inventory-scan
npm install @liuhange/dsh-data-asset-quality-score
npm install @liuhange/dsh-data-asset-valuation
npm install @liuhange/dsh-data-asset-compliance-check
npm install @liuhange/dsh-data-asset-registration-helper
```

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/liuhange789/data-asset-inspector.git
cd data-asset-inspector

# 安装依赖
pnpm install

# 构建全部插件
pnpm build

# 运行测试
pnpm test

# 启动 DSH
npx @deepseek-ai/dsh web
```

## 插件架构

每个插件遵循 DeepSeek Harness 插件规范，导出 `apply(ctx)` 模块：

```typescript
// 所有插件均导出以下接口
export const name: string;        // 插件名称
export function inject(ctx: Context): void;  // 依赖注入
export function apply(ctx: Context): void;   // 插件主逻辑
```

### 业务链路

```
数据资产盘点扫描 → 数据资产质量评分 → 数据资产估值 → 数据资产合规审查 → 数据资产登记助手
  (inventory-scan)    (quality-score)      (valuation)    (compliance-check)    (registration-helper)
```

## 政策依据

每个插件输出报告均含"政策依据"字段，格式：`依据：《文件名称》（文号）——核心条款摘要`

| 政策文件 | 文号 | 适用插件 |
|----------|------|----------|
| 数据安全法 | — | 盘点扫描、合规审查 |
| 个人信息保护法 | — | 盘点扫描、合规审查 |
| 企业数据资源相关会计处理暂行规定 | 财会〔2025〕33号 | 估值、登记助手 |
| 企业数据资源会计处理应用案例 | 财会〔2025〕33号 | 估值、登记助手 |
| 加强数据资产管理的通知 | 财资〔2024〕167号 | 估值、合规审查、登记助手 |
| 数据资产全过程管理试点工作方案 | — | 合规审查、登记助手 |

## 商业规则配置

所有业务规则存储在 JSON 配置文件，修改规则无需改代码：

- `config/business-rules.json` — 业务规则（评分阈值、估值参数、合规标准等）
- `config/policy-references.json` — 政策依据引用表

配置文件通过 `@liuhange/dsh-data-asset-shared` 的 `loadJsonConfig()` 加载，支持三级 fallback：
1. 环境变量指定路径
2. 本地 `config/` 目录
3. shared 包内置 `config/` 目录

## 技术栈

- TypeScript 5.7 + Node.js 22+
- DeepSeek Harness (DSH) / Cordis 4.0
- Vitest 3.0 测试框架
- pnpm workspace 单仓多包

## License

MIT
