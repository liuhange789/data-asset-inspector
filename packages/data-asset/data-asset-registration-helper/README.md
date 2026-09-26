# @liuhange/dsh-data-asset-registration-helper

## 功能说明

数据资产登记助手：登记流程引导、权属纠纷处理、登记机构匹配

## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-data-asset-registration-helper
```

## 用法

```javascript
const { RegistrationHelperTool } = require('@liuhange/dsh-data-asset-registration-helper');
const tool = new RegistrationHelperTool();
const result = await tool.run({ assetId: 'asset-001' });
```

## License

MIT
