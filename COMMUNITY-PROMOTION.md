# 开源一套 TypeScript 政务数据治理矩阵：从 0 依赖到三城验收误报率 0%

## 引言

在政务数据治理中，数据脱敏、清洗和巡检往往依赖碎片化的工具，难以串联。今天我们开源了 `@liuhange/dsh-data-asset-orchestration` 系列（共 32 个包），用微内核架构实现端到端的自动化数据资产治理。

## 核心亮点

### 1. 零依赖

全部 32 个包均使用纯 TypeScript 编写，编译产物零运行时依赖。企业级安全可控，不存在依赖地狱，`npm install` 秒装，供应链审计无死角。

### 2. 政府级严苛验收

核心巡检插件 `@liuhange/dsh-gov-data-inspector`（v3.6.5）在番禺区、开封市、苏州市三座城市的真实政务网站标杆测试中，历经多轮迭代：

- **漏项检出率**：100%
- **语义错误检出率**：100%
- **逻辑矛盾检出率**：100%
- **格式问题检出率**：100%
- **误报率**：0%（苏州7条样本 + 第三方7条样本，核心误报均为0）
- **单元测试**：429 个测试全通过
- **法规知识库**：49 条规则注册，policyBasis 追溯链路 100%

### 3. 微内核编排

32 个包独立发版、按需加载。编排主包执行链路：

```
mask_sensitive_data → clean_data → inventory_data → package_data_asset
```

四步一键完成，首个步骤失败立即停止，返回已完成报告与错误信息，不产生部分脏产物。

### 4. 法规驱动架构

巡检引擎不硬编码任何规则词表，所有检测规则从 `regulation-knowledge-base.json` 动态加载。每条错误均可追溯到具体法规条款（国标/国办发/省标），policyBasis 追溯率 100%。

## 架构总览

```
┌─────────────────────────────────────────────────────────┐
│                   DSH 数据资产治理矩阵                      │
├─────────────┬─────────────┬─────────────┬───────────────┤
│  核心引擎    │  核心编排    │  治理工具链  │  行业检测插件   │
│             │             │             │               │
│ gov-data-   │ orchestration│ masking    │ fin-aml       │
│ inspector   │ shared      │ cleaning   │ research      │
│ (v3.6.5)    │ inventory   │ lineage    │ ai-dataset    │
│ 429 tests   │ quality     │ packaging  │ construction  │
│ 误报率0%    │ valuation   │ sensitivity│ geo-data      │
│             │ compliance  │ visualization│ pipeline     │
├─────────────┴─────────────┴─────────────┴───────────────┤
│              登记注册工具链 + 政务配置包 + 生态工具          │
└─────────────────────────────────────────────────────────┘
```

## 如何安装

```bash
# 核心引擎 + 编排
npm install @liuhange/dsh-gov-data-inspector @liuhange/dsh-data-asset-orchestration

# 按需安装治理工具
npm install @liuhange/dsh-data-masking @liuhange/dsh-data-cleaning @liuhange/dsh-data-packaging
```

## 源码与全系列导航

- **GitHub 仓库**：[data-asset-inspector](https://github.com/liuhange789/data-asset-inspector)
- **全系列包导航**：[PACKAGES.md](https://github.com/liuhange789/data-asset-inspector/blob/main/PACKAGES.md)
- **核心引擎 NPM**：[@liuhange/dsh-gov-data-inspector](https://www.npmjs.com/package/@liuhange/dsh-gov-data-inspector)
- **编排主包 NPM**：[@liuhange/dsh-data-asset-orchestration](https://www.npmjs.com/package/@liuhange/dsh-data-asset-orchestration)

## 技术栈

- TypeScript（strict 模式，`exactOptionalPropertyTypes: true`）
- 零运行时依赖
- Vitest 测试框架
- 法规知识库 JSON 驱动
- 微内核 + 独立插件架构

---

> 如果这个项目对你有帮助，欢迎 Star ⭐ 支持。也欢迎在掘金/V2EX/Reddit 上讨论交流。