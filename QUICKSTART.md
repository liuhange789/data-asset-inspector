# 5分钟快速体验

> 从零开始，5分钟内完成数据资产体检仪的安装、配置和运行。

---

## 前置条件

- Node.js 18+
- npm 或 pnpm
- DeepSeek Harness 框架（提供 `@deepseek-ai/cordis` 和 `@deepseek-ai/dsh-tools`）

---

## 第一步：安装

```bash
# 安装核心包
npm install @liuhange/dsh-data-asset-shared@2.0.1 \
            @liuhange/dsh-data-masking@2.0.1 \
            @liuhange/dsh-data-asset-orchestration@2.0.1

# 安装 v2.0 新功能包（按需选择）
npm install @liuhange/dsh-data-quality-scoring@2.0.1 \
            @liuhange/dsh-data-sensitivity-classification@2.0.1 \
            @liuhange/dsh-data-lineage@2.0.1 \
            @liuhange/dsh-data-visualization@2.0.1
```

---

## 第二步：最小配置

### 2.1 商业规则配置（`config/business-rules.json`）

只需在现有配置中添加 v2.0 可选节点：

```jsonc
{
  // ... v1.0 基础配置（valueAssessment, sensitivePatterns, maskingLevels 等）...

  // 质量评分：四维度加权
  "qualityScoring": {
    "weights": { "completeness": 0.25, "accuracy": 0.25, "consistency": 0.25, "timeliness": 0.25 },
    "thresholds": { "completeness": 60, "accuracy": 60, "consistency": 60, "timeliness": 60 },
    "completeness": { "missingMarkers": ["null", "undefined", "N/A", "", "NULL", "NaN"] },
    "timeliness": { "timestampField": "updatedAt", "freshnessThresholdHours": 720 }
  },

  // 敏感度分级：字段名 + 字段值双重匹配
  "sensitivityClassification": {
    "fieldNameRules": [
      { "name": "idCard", "pattern": "id_?card|身份证|identity", "level": "Secret" },
      { "name": "phone",  "pattern": "phone|手机|mobile|tel",     "level": "Confidential" },
      { "name": "email",  "pattern": "email|邮箱|mail",           "level": "Confidential" },
      { "name": "public", "pattern": "status|type|category",      "level": "Public" }
    ],
    "defaultLevel": "Internal"
  }
}
```

### 2.2 插件加载配置（`cordis.yml`）

```yaml
plugins:
  # v1.0 核心插件
  - ./data-masking
  - ./data-cleaning
  - ./data-inventory
  - ./data-packaging

  # v2.0 新功能插件
  - ./data-quality-scoring
  - ./data-sensitivity-classification
  - ./data-lineage
  - ./data-visualization

  # 编排 Skill
  - ./data-asset-orchestration
```

---

## 第三步：运行

```bash
# 通过 DeepSeek Harness CLI 运行
npx dsh web --patch ./packages/data-asset/cordis.yml

# 或直接调用编排 Skill
npx dsh run data-asset-orchestration --input ./data --output ./output
```

---

## 第四步：查看输出

运行完成后，在 `./output/` 目录查看结果：

| 输出文件 | 内容 |
|----------|------|
| `quality-report.json` | 质量评分报告（四维度分数 + 综合分 + 改进建议） |
| `sensitivity-report.json` | 敏感度分级报告（字段分级 + 推荐策略） |
| `lineage-report.md` | 血缘追踪报告（Mermaid 流程图） |
| `visualization-report.html` | 可视化报表（自包含 HTML，可离线打开） |
| `masking-report.json` | 脱敏报告（脱敏字段统计） |
| `inventory-report.json` | 资产清单（价值评估 + 定价建议） |

---

## 代码调用示例

```typescript
import { BusinessRulesLoader } from '@liuhange/dsh-data-asset-shared';

// 加载商业规则
const loader = new BusinessRulesLoader();
const { config } = loader.load('./config/business-rules.json');

// 使用 v2.0 配置
console.log('质量评分权重:', config.qualityScoring?.weights);
console.log('敏感度分级规则:', config.sensitivityClassification?.fieldNameRules);
```

---

## 增量模式（可选）

在 `business-rules.json` 中开启增量处理：

```jsonc
{
  "incrementalScheduling": {
    "incrementalMode": true,       // 开启增量模式
    "cronExpression": "0 2 * * *", // 每天凌晨2点执行
    "watchDirectory": "input",
    "stateFilePath": "state/incremental-state.json"
  }
}
```

开启后，只处理变化的文件，大幅提升处理效率。

---

## 下一步

- 阅读 [RELEASE_NOTES.md](./RELEASE_NOTES.md) 了解完整功能详情
- 阅读 [CHANGELOG.md](./CHANGELOG.md) 查看版本变更记录
- 阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解如何参与贡献