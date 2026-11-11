# Changelog

## 3.1.6

- fix: 工具名去重（消除多包同 Context 装载时的注册冲突）
  - `attest_data_quality` 重命名为 `attest_research_provenance`（原名与 @liuhange/dsh-data-asset-attestation 冲突）
  - `submit_review_override` 重命名为 `research_submit_review_override`（原名与另外 4 个包冲突）
  - 入参、输出结构、业务判定与配置键均未改动

## 3.1.0

- feat: 初始化科研数据溯源审计插件
  - 新增 attest_data_quality 工具：数据血缘完整性检测、可复现性检测、六维质量评估、溯源审计报告生成
  - 新增 submit_review_override 工具：人工复核覆盖与 append-only 记录
  - 新增 LineageCompletenessChecker/Scorer、ReproducibilityChecker/Scorer、NormalityScorer、SecurityScorer
  - 新增 PolicyBasisBuilder（双法规政策依据）、RemediationSuggestionGenerator、ProvenanceReportGenerator
  - 新增 quality-dimension-config.json 与 remediation-suggestion-config.json 配置文件