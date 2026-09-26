# @liuhange/dsh-visibility-doctor

> dsh 插件曝光度诊断与采用率提升 CLI 工具


## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-visibility-doctor
```

## 安装

```bash
pnpm add -g @liuhange/dsh-visibility-doctor
```

## CLI 用法

### diagnose — 可发现性诊断

```bash
visibility-doctor diagnose \
  --workspace /path/to/data-asset-inspector \
  --repo liuhange789/data-asset-inspector \
  --format both
```

### analyze — 根因分析

```bash
visibility-doctor analyze \
  --diagnose-report ./reports/diagnose-report-latest.json \
  --issue dshplugin/dsh-plugin-hub#52 \
  --repo liuhange789/data-asset-inspector
```

### boost — 曝光度提升

```bash
visibility-doctor boost \
  --workspace /path/to/data-asset-inspector \
  --repo liuhange789/data-asset-inspector \
  --dry-run
```

### verify — 采用率验证

```bash
visibility-doctor verify \
  --workspace /path/to/data-asset-inspector \
  --repo liuhange789/data-asset-inspector \
  --baseline 15 --target 100
```

## 可编程 API

```typescript
import { diagnose, analyzeRootCause, boostExposure, verifyAdoption } from '@liuhange/dsh-visibility-doctor';

const result = await diagnose({
  workspacePath: '/path/to/data-asset-inspector',
  packageNames: ['@liuhange/dsh-data-asset-shared', ...],
  repoFullName: 'liuhange789/data-asset-inspector',
});
```

## 配置项

| 环境变量 | 说明 | 默认值 |
|----------|------|--------|
| `GITHUB_TOKEN` | GitHub API Token（提升速率限制） | 无（匿名调用） |
| `DSH_PROBE_WINDOW_SIZE` | 探测窗口大小 | 10 |

## 报告输出

报告默认输出至 `./reports/` 目录：
- `diagnose-report-{timestamp}.json` / `.md`
- `analyze-report-{timestamp}.json` / `.md`
- `boost-report-{timestamp}.json` / `.md`
- `verify-report-{timestamp}.json` / `.md`

## License

MIT