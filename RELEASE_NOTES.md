# 🎉 Data Asset Inspector v2.0.0 正式发布！

> **数据资产体检仪 V2.0** —— 从"基础体检"到"全维度深度体检"，让每一份数据资产都拥有可追溯、可量化、可视化的完整健康档案。

发布日期：2026-08-22

---

## 📋 目录

- [核心亮点：体检仪六大金刚](#核心亮点体检仪六大金刚)
- [快速上手](#快速上手)
- [全部 npm 包一览](#全部-npm-包一览)
- [向后兼容声明](#向后兼容声明)
- [测试与质量](#测试与质量)
- [贡献者与致谢](#贡献者与致谢)

---

## 核心亮点：体检仪六大金刚

V2.0 在 V1.0「脱敏→清洗→盘点→包装」基础流水线之上，新增六大功能模块，构成完整的深度体检体系：

### 1️⃣ 数据质量评分（Quality Scoring）

**包名**：`@liuhange/dsh-data-quality-scoring@2.0.0`

对数据资产进行四维度量化评分，输出 0-100 分综合健康分：

| 维度 | 含义 | 检测内容 |
|------|------|----------|
| 完整性（Completeness） | 数据是否缺失 | 空值、NULL、NaN、N/A 检测 |
| 准确性（Accuracy） | 数据是否正确 | 格式校验（手机号/邮箱）、值域校验（年龄0-150） |
| 一致性（Consistency） | 数据是否矛盾 | 跨字段约束（结束日期>开始日期、价格≥0） |
| 时效性（Timeliness） | 数据是否新鲜 | 时间戳新鲜度检测（默认30天阈值） |

评分后自动生成改进建议，如"字段 `phone` 有 12 条格式异常，建议清洗标准化"。

### 2️⃣ 数据敏感度自动分级（Sensitivity Classification）

**包名**：`@liuhange/dsh-data-sensitivity-classification@2.0.0`

自动扫描字段名与字段值，将每个字段分入四级敏感度：

| 等级 | 标识 | 示例 | 推荐策略 |
|------|------|------|----------|
| 公开（Public） | 🟢 | status、type、category | 无需脱敏 |
| 内部（Internal） | 🟡 | name、address | 部分脱敏 |
| 机密（Confidential） | 🟠 | phone、email | 完全脱敏 |
| 绝密（Secret） | 🔴 | idCard、bankCard | 加密存储 |

匹配引擎支持字段名正则模式 + 字段值采样双重识别，准确率远超单一匹配。

### 3️⃣ 数据血缘追踪（Lineage Tracking）

**包名**：`@liuhange/dsh-data-lineage@2.0.0`

自动记录每次处理（脱敏/清洗/盘点）的数据流转路径，构建完整血缘链：

```
原始数据 →[脱敏]→ 脱敏数据 →[清洗]→ 清洗数据 →[盘点]→ 资产清单 →[包装]→ 数据产品
```

- 基于内容哈希（SHA-256）的数据指纹，精确追踪数据演变
- 自动生成 Mermaid 流程图，可视化全链路
- 链式完整性校验，确保血缘不断裂

### 4️⃣ 可视化报表（Visualization Reports）

**包名**：`@liuhange/dsh-data-visualization@2.0.0`

生成自包含 HTML 报表（零依赖，可离线打开），内置 5 种交互式图表：

| 图表 | 用途 |
|------|------|
| 柱状图（Bar） | 脱敏字段统计 |
| 饼图（Pie） | 数据资产分布 |
| 雷达图（Radar） | 质量四维度评分 |
| 对比图（Comparison） | 清洗前后对比 |
| 流程图（Flowchart） | 血缘追踪可视化 |

支持展开/折叠、图表切换、悬浮提示等交互功能。

### 5️⃣ 高级脱敏算法（Advanced Masking）

**包名**：`@liuhange/dsh-data-masking@2.0.0`

在 V1.0 三级脱敏（FULL/PARTIAL/GENERALIZE）基础上，新增四种学术级隐私保护算法：

| 算法 | 原理 | 适用场景 |
|------|------|----------|
| 格式保留加密（FPE） | 加密后保持原始格式 | 需要保持格式的金融数据 |
| k-匿名（k-Anonymity） | 泛化+抑制，每条记录不可区分于至少 k-1 条 | 统计分析数据集 |
| 差分隐私（Differential Privacy） | 拉普拉斯机制加噪 | 聚合统计查询 |
| 哈希脱敏（Hash） | SHA-256 + 盐值 | 数据关联匹配 |

内置隐私预算追踪器，防止差分隐私 ε 预算超支。

### 6️⃣ 增量处理模式（Incremental Processing）

**包名**：`@liuhange/dsh-data-asset-orchestration@2.0.0`

无需每次全量处理，只处理变化的文件：

- 基于文件哈希的增量检测器，精准识别变更
- 状态持久化（JSON 文件），重启后自动恢复
- Cron 定时调度，支持 `0 2 * * *` 等标准表达式
- 并发锁机制，防止多实例重复执行

---

## 快速上手

### 安装

```bash
npm install @liuhange/dsh-data-asset-shared \
            @liuhange/dsh-data-quality-scoring \
            @liuhange/dsh-data-sensitivity-classification \
            @liuhange/dsh-data-asset-orchestration
```

### 最小配置：开启质量评分 + 敏感度分级

在 `config/business-rules.json` 中添加以下配置（V2.0 新增节点，全部可选，不配置则使用默认值）：

```jsonc
{
  // 质量评分：四维度加权
  "qualityScoring": {
    "weights": {
      "completeness": 0.25,
      "accuracy": 0.25,
      "consistency": 0.25,
      "timeliness": 0.25
    },
    "thresholds": {
      "completeness": 60,
      "accuracy": 60,
      "consistency": 60,
      "timeliness": 60
    },
    "completeness": {
      "missingMarkers": ["null", "undefined", "N/A", "", "NULL", "NaN"]
    },
    "timeliness": {
      "timestampField": "updatedAt",
      "freshnessThresholdHours": 720
    }
  },

  // 敏感度分级：字段名 + 字段值双重匹配
  "sensitivityClassification": {
    "fieldNameRules": [
      { "name": "idCard",  "pattern": "id_?card|身份证|identity", "level": "Secret" },
      { "name": "phone",   "pattern": "phone|手机|mobile|tel",     "level": "Confidential" },
      { "name": "email",   "pattern": "email|邮箱|mail",           "level": "Confidential" },
      { "name": "public",  "pattern": "status|type|category",      "level": "Public" }
    ],
    "defaultLevel": "Internal"
  }
}
```

### 代码示例

```typescript
import { loadBusinessRules } from '@liuhange/dsh-data-asset-shared';
import { QualityScoringTool } from '@liuhange/dsh-data-quality-scoring';
import { SensitivityClassificationTool } from '@liuhange/dsh-data-sensitivity-classification';

// 1. 加载商业规则（自动读取 config/business-rules.json）
const rules = loadBusinessRules('./config/business-rules.json');

// 2. 质量评分
const scoringTool = new QualityScoringTool();
const scoreResult = await scoringTool.execute({
  data: './data/customers.csv',
  rules: rules.qualityScoring
});
console.log(`综合质量分: ${scoreResult.totalScore}/100`);
console.log(`改进建议: ${scoreResult.suggestions}`);

// 3. 敏感度分级
const classifyTool = new SensitivityClassificationTool();
const classifyResult = await classifyTool.execute({
  data: './data/customers.csv',
  rules: rules.sensitivityClassification
});
console.log(`字段分级结果:`);
classifyResult.fields.forEach(f => {
  console.log(`  ${f.name}: ${f.level} → 建议策略: ${f.recommendedStrategy}`);
});
```

### 输出示例

```
综合质量分: 78.5/100
改进建议:
  - 字段 "phone" 有 12 条格式异常，建议清洗标准化
  - 字段 "email" 有 3 条空值，建议补全或标记

字段分级结果:
  idCard: Secret → 建议策略: encrypt
  phone:  Confidential → 建议策略: full
  email:  Confidential → 建议策略: full
  name:   Internal → 建议策略: partial
  status: Public → 建议策略: none
```

---

## 全部 npm 包一览

| # | 包名 | 版本 | 状态 |
|---|------|------|------|
| 1 | `@liuhange/dsh-data-asset-shared` | 2.0.0 | 已发布 |
| 2 | `@liuhange/dsh-data-masking` | 2.0.0 | 已发布 |
| 3 | `@liuhange/dsh-data-cleaning` | 1.0.0 | 未变更 |
| 4 | `@liuhange/dsh-data-inventory` | 1.0.0 | 未变更 |
| 5 | `@liuhange/dsh-data-packaging` | 1.0.0 | 未变更 |
| 6 | `@liuhange/dsh-data-asset-orchestration` | 2.0.0 | 已发布 |
| 7 | `@liuhange/dsh-data-quality-scoring` | 2.0.0 | **新增** |
| 8 | `@liuhange/dsh-data-lineage` | 2.0.0 | **新增** |
| 9 | `@liuhange/dsh-data-visualization` | 2.0.0 | **新增** |
| 10 | `@liuhange/dsh-data-sensitivity-classification` | 2.0.0 | **新增** |

---

## 向后兼容声明

### V1.0 用户无缝升级

V2.0 是**完全向后兼容**的版本，V1.0 用户无需修改任何代码：

- ✅ V1.0 的 4 个 Tool 插件（脱敏、清洗、盘点、包装）接口签名不变
- ✅ V1.0 编排 Skill 接口不变，增量模式为可选启用（`incrementalMode: false` 默认关闭）
- ✅ `business-rules.json` 新增的 6 个配置节点全部可选，不配置时使用内置默认值
- ✅ V1.0 已发布包（data-cleaning、data-inventory、data-packaging）版本号不变，无需重新安装
- ✅ 升级路径：只需更新 `data-asset-shared`、`data-masking`、`data-asset-orchestration` 到 2.0.0

### 升级命令

```bash
npm install @liuhange/dsh-data-asset-shared@2.0.0 \
            @liuhange/dsh-data-masking@2.0.0 \
            @liuhange/dsh-data-asset-orchestration@2.0.0
```

---

## 测试与质量

| 指标 | 数值 |
|------|------|
| 测试文件数 | 20 |
| 测试用例数 | 298 |
| 通过率 | 100% |
| 语句覆盖率 | 86.58% |
| TypeScript 严格模式 | 全部 10 包通过 |
| `noUncheckedIndexedAccess` | 启用 |
| `exactOptionalPropertyTypes` | 启用 |

---

## 贡献者与致谢

### 贡献者

- **liuhange789** — V2.0 全部功能设计与实现

### 致谢

- **DeepSeek Harness** — 提供插件化运行框架（Tool/Skill 机制）
- **Spec-Driven Development** — 需求规格→技术设计→编码任务的全流程方法论支撑
- **开源社区** — Mermaid.js（血缘可视化）、差分隐私与 k-匿名学术论文（算法理论依据）

### 相关链接

- GitHub 仓库：https://github.com/liuhange789/data-asset-inspector
- npm 组织：https://www.npmjs.com/org/liuhange
- 变更记录：[CHANGELOG.md](./CHANGELOG.md)

---

## License

MIT