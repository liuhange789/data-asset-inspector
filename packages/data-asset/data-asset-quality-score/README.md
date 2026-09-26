# @liuhange/dsh-data-asset-quality-score

## 功能说明

数据资产质量评分：六维评分（规范性、完整性、准确性、一致性、时效性、可访问性）

## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-data-asset-quality-score
```

## 用法

```javascript
const { QualityScoreTool } = require('@liuhange/dsh-data-asset-quality-score');
const tool = new QualityScoreTool();
const result = await tool.run({ assetId: 'asset-001' });
```

## License

MIT
