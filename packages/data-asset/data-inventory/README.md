# @deepseek-ai/dsh-data-inventory

Data inventory plugin for DeepSeek Harness. Directory scanning, value assessment, asset list generation.

## Tool: inventory_data

- **Parameters**: `directory` (required)
- **Output**: Inventory report with Markdown asset table (filename/size/type/value/description)

## Business Rules

Value assessment rules (keywords, scores, labels) are read from `config/business-rules.json`.

## Known Limitations and Deferred Work

- Directory scanning is non-recursive; only top-level data files are inventoried