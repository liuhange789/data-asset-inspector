# @deepseek-ai/dsh-data-cleaning

Data cleaning plugin for DeepSeek Harness. Deduplication, format standardization, anomaly detection.

## Tool: clean_data

- **Parameters**: `filePath` (required), `removeDuplicates` (default true), `standardizeFormat` (default true)
- **Output**: Cleaning report with dedup stats and anomaly details
- **Output file**: `{originalName}_cleaned.{ext}`

## Known Limitations and Deferred Work

- Anomaly detection rules are basic (short content, null values); extensible via config