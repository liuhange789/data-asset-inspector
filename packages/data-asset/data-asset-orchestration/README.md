# @deepseek-ai/dsh-data-asset-orchestration

Data asset orchestration skill for DeepSeek Harness. Sequentially executes masking → cleaning → inventory → packaging.

## Skill: data-asset-orchestration

- **Trigger**: User requests "数据资产化处理" or "完整处理这份数据"
- **Execution order**: mask_sensitive_data → clean_data → inventory_data → package_data_asset
- **Output**: Aggregated 4 reports (masking, cleaning, inventory, packaging manual)
- **Failure handling**: Stops on first failure, returns completed reports + error

## Known Limitations and Deferred Work

- Timeout handling uses fixed thresholds (30s per stage, 180s total)
- Inter-plugin communication via ctx.tools.call string names