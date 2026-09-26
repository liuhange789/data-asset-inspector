# @liuhange/dsh-data-asset-valuation

## 功能说明

数据资产估值：成本法、收益法、折现现金流、贬值折旧

## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-data-asset-valuation
```

## 用法

```javascript
const { ValuationTool } = require('@liuhange/dsh-data-asset-valuation');
const tool = new ValuationTool();
const result = await tool.run({ assetId: 'asset-001' });
```

## License

MIT
