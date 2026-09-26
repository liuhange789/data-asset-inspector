# 插件可发现性诊断报告模板

## 诊断概要

- 生成时间: {generatedAt}
- 诊断耗时: {durationMs}ms
- 包数量: {packageCount}

## 探测窗口

- 窗口大小: {windowSize}
- 是否缓存: {isCached}
- 被截断包: {truncatedPackages}

## 逐包评分表

| 包名 | 总分 | keywords | README | Topics | 市场 | 别名 | 仓库名 |
|------|------|----------|--------|--------|------|------|--------|
| {packageRows} |

## 根因清单

{rootCauses}

## 修复建议

{fixSuggestions}