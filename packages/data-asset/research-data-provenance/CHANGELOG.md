# Changelog

## 3.1.0

- feat: 初始化科研数据溯源审计插件
  - 新增 attest_data_quality 工具：数据血缘完整性检测、可复现性检测、六维质量评估、溯源审计报告生成
  - 新增 submit_review_override 工具：人工复核覆盖与 append-only 记录
  - 新增 LineageCompletenessChecker/Scorer、ReproducibilityChecker/Scorer、NormalityScorer、SecurityScorer
  - 新增 PolicyBasisBuilder（双法规政策依据）、RemediationSuggestionGenerator、ProvenanceReportGenerator
  - 新增 quality-dimension-config.json 与 remediation-suggestion-config.json 配置文件