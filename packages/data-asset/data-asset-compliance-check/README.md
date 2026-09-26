# @liuhange/dsh-data-asset-compliance-check

## 功能说明

数据资产合规检查：从来源、处理、使用三个维度执行合规审计

## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-data-asset-compliance-check
```

## 用法

```javascript
const { ComplianceCheckTool } = require('@liuhange/dsh-data-asset-compliance-check');
const tool = new ComplianceCheckTool();
const result = await tool.run({ assetId: 'asset-001' });
```

## License

MIT
