# @liuhange/dsh-data-cleaning

Data cleaning plugin for DeepSeek Harness. Deduplication, format standardization, anomaly detection.


## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-data-cleaning
```

## Tool: clean_data

- **Parameters**: `filePath` (required), `removeDuplicates` (default true), `standardizeFormat` (default true)
- **Output**: Cleaning report with dedup stats and anomaly details
- **Output file**: `{originalName}_cleaned.{ext}`

## Known Limitations and Deferred Work

- Anomaly detection rules are basic (short content, null values); extensible via config