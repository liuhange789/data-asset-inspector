# @liuhange/dsh-data-asset-inventory-scan

## 功能说明

数据资产盘点扫描：元数据扫描与权属标注

## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-data-asset-inventory-scan
```

## 用法

```javascript
const { InventoryScanTool } = require('@liuhange/dsh-data-asset-inventory-scan');
const tool = new InventoryScanTool();
const result = await tool.run({ source: 'database' });
```

## License

MIT
