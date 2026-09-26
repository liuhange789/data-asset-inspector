# @liuhange/dsh-data-packaging

Data packaging plugin for DeepSeek Harness. Generates product manual with compliance statements.


## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-data-packaging
```

## Tool: package_data_asset

- **Parameters**: `dataPath` (required), `productName` (required), `description` (optional)
- **Output**: Product manual with 8 sections + next-step suggestions
- **Output file**: `{productName}_产品说明书.txt`

## Business Rules

Compliance statements and pricing rules are read from `config/business-rules.json`.

## Known Limitations and Deferred Work

- Product version is fixed at V1.0 from config