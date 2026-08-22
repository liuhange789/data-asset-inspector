# 贡献指南

感谢您对数据资产体检仪（Data Asset Inspector）项目的关注！本文档说明了如何参与项目开发。

---

## 开发环境要求

| 工具 | 最低版本 | 说明 |
|------|----------|------|
| Node.js | 18+ | 推荐 22+ |
| pnpm | 8+ | 包管理器 |
| TypeScript | 5.5+ | 随项目安装 |
| Git | 2.30+ | 版本控制 |

---

## 项目结构

```
data-asset-inspector/
├── config/
│   └── business-rules.json      # 商业规则配置（所有业务判断的单一真相源）
├── docs/                         # 产品文档
├── packages/
│   └── data-asset/
│       ├── data-asset-shared/           # 共享基础包（类型+工具类+默认配置）
│       ├── data-masking/                # 数据脱敏（含高级算法）
│       ├── data-cleaning/               # 数据清洗
│       ├── data-inventory/              # 数据盘点
│       ├── data-packaging/              # 数据包装
│       ├── data-quality-scoring/        # 质量评分
│       ├── data-sensitivity-classification/  # 敏感度分级
│       ├── data-lineage/                # 血缘追踪
│       ├── data-visualization/          # 可视化报表
│       ├── data-asset-orchestration/    # 全流程编排
│       ├── cordis.yml                   # 插件加载配置
│       └── README.md                    # 包根 README
├── CHANGELOG.md
├── CONTRIBUTING.md
├── QUICKSTART.md
├── RELEASE_NOTES.md
└── PROJECT_CLOSURE.md
```

---

## 本地调试

### 1. 克隆仓库

```bash
git clone https://github.com/liuhange789/data-asset-inspector.git
cd data-asset-inspector
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 构建

```bash
# 编译所有包（TypeScript 类型声明 + tsdown 运行时打包）
pnpm build

# 仅类型检查
pnpm typecheck
```

### 4. 运行测试

```bash
# 运行全部测试
pnpm test

# 运行单个包测试
pnpm test --filter data-quality-scoring

# 查看覆盖率
pnpm test:coverage
```

---

## 提交流程

### 1. 分支命名

| 类型 | 前缀 | 示例 |
|------|------|------|
| 新功能 | `feature/` | `feature/quality-dashboard` |
| 修复 | `fix/` | `fix/scoring-weight-bug` |
| 文档 | `docs/` | `docs/update-quickstart` |
| 重构 | `refactor/` | `refactor/masking-executor` |

```bash
git checkout -b feature/your-feature-name
```

### 2. Commit 规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <description>

types:
  feat     新功能
  fix      修复
  docs     文档
  refactor 重构
  test     测试
  chore    构建/工具
```

示例：
```
feat(quality-scoring): 新增时效性评分维度
fix(masking): 修复FPE算法在空字符串时的崩溃
docs(lineage): 更新血缘追踪README
```

### 3. 代码质量门禁

提交前必须通过以下检查：

```bash
# TypeScript 类型检查（0 错误）
pnpm typecheck

# 全部测试通过
pnpm test

# 覆盖率不低于 80%
pnpm test:coverage
```

### 4. 创建 Pull Request

- PR 标题遵循 Conventional Commits 格式
- PR 描述包含：变更内容、变更原因、测试方式
- 确保 CI 全部通过

---

## 开发规范

### 代码风格

- **命名**：TypeScript 函数/方法/变量使用 `camelCase`，类/接口/类型使用 `PascalCase`
- **严格模式**：`strict: true`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`
- **无未使用变量**：`noUnusedLocals: true`、`noUnusedParameters: true`
- **ESM**：所有包使用 `"type": "module"`，导出 ESM 格式
- **无注释**：除非用户明确要求，不添加代码注释

### 商业规则

- 所有业务判断从 `config/business-rules.json` 读取，**禁止硬编码业务逻辑**
- 新增配置节点必须是可选的，不配置时使用默认值
- 默认值定义在 `data-asset-shared/src/defaultBusinessRules.ts`

### 包结构

每个包必须包含：

```
package/
├── src/
│   ├── index.ts          # 入口（导出 apply/inject/name 或类）
│   ├── invariant.ts      # 运行时不变量
│   └── types.ts          # 类型定义（仅类型，无运行时代码）
├── tests/
│   └── *.spec.ts         # 测试文件
├── package.json
├── tsconfig.json
└── README.md
```

### 测试要求

- 每个包必须有单元测试
- 语句覆盖率 ≥ 80%
- 测试文件位于 `tests/` 目录，命名 `*.spec.ts`
- 使用 Vitest 测试框架

---

## 发布流程（维护者）

1. 更新版本号（所有包统一版本）
2. 运行 `pnpm build` 构建所有包
3. 运行 `pnpm test` 确保全部通过
4. 执行 `npm publish --access public` 发布每个包
5. 创建 Git tag：`git tag -a v<x.y.z> -m "发布说明"`
6. 推送：`git push origin main --tags`
7. 创建 GitHub Release

---

## License

MIT — 贡献的代码同样遵循 MIT 许可证。