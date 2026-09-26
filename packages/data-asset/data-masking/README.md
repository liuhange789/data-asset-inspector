# @liuhange/dsh-data-masking

Data masking plugin for DeepSeek Harness. Identifies and masks sensitive fields (ID card, phone, bank card, email).


## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-data-masking
```

## Tool: mask_sensitive_data

- **Parameters**: `filePath` (required), `strategy` (optional: FULL | PARTIAL | GENERALIZE, default PARTIAL)
- **Output**: Masking report with field counts and output file path
- **Output file**: `{originalName}_masked.{ext}`

## Business Rules

All sensitive field patterns and masking levels are read from `config/business-rules.json`. No business logic is hardcoded.

## Known Limitations and Deferred Work

- Regex patterns are compiled at runtime from config strings
- Large file streaming masking not yet implemented