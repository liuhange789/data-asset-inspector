export declare const PLUGIN_NAME = "@liuhange/dsh-underground-pipeline-inspector";
export declare const CONFIG_PATHS: {
    readonly inspection: "config/pipeline-inspection-config.json";
    readonly attribute: "config/pipeline-attribute-config.json";
    readonly qualityElement: "config/quality-element-config.json";
};
export declare const SHARED_CONFIG_PATHS: {
    readonly inspection: "@liuhange/dsh-underground-pipeline-inspector/config/pipeline-inspection-config.json";
    readonly attribute: "@liuhange/dsh-underground-pipeline-inspector/config/pipeline-attribute-config.json";
    readonly qualityElement: "@liuhange/dsh-underground-pipeline-inspector/config/quality-element-config.json";
};
export declare const ENV_VARS: {
    readonly inspection: "UNDERGROUND_PIPELINE_INSPECTION_CONFIG_PATH";
    readonly attribute: "UNDERGROUND_PIPELINE_ATTRIBUTE_CONFIG_PATH";
    readonly qualityElement: "UNDERGROUND_PIPELINE_QUALITY_ELEMENT_CONFIG_PATH";
};
export declare const OVERRIDE_RECORD_FILE = "logs/override-records.log";
export declare const LEGAL_DISCLAIMER = "\u672C\u62A5\u544A\u7531\u8F85\u52A9\u5DE5\u5177\u751F\u6210\uFF0C\u4E0D\u66FF\u4EE3\u6D4B\u7ED8\u5355\u4F4D\u7684\u6CD5\u5B9A\u8D28\u91CF\u68C0\u9A8C\u4E0E\u9A8C\u6536\u4E49\u52A1\uFF0C\u4EBA\u5DE5\u590D\u6838\u8BB0\u5F55\u4EC5\u9650\u672C\u5730\u4FDD\u5B58";
export declare const STANDARDS: {
    readonly GBT_35644: {
        readonly fullName: "地下管线数据获取规程";
        readonly number: "GB/T 35644-2017";
    };
    readonly GBT_29806: {
        readonly fullName: "信息技术 地下管线数据交换技术要求";
        readonly number: "GB/T 29806-2013";
    };
    readonly CJJ_61: {
        readonly fullName: "城市地下管线探测技术规程";
        readonly number: "CJJ 61-2017";
    };
    readonly CJJ_68: {
        readonly fullName: "城镇排水管渠运行维护及安全技术规程";
        readonly number: "CJJ 68-2016";
    };
    readonly GBT_24356: {
        readonly fullName: "测绘成果质量检查与验收";
        readonly number: "GB/T 24356-2023";
    };
    readonly GD_GUIDELINE: {
        readonly fullName: "广东省地下管线数据检查导则";
        readonly number: "GD-PIPE-2020";
    };
};
export type StandardKey = keyof typeof STANDARDS;
export declare const ERROR_CODES: {
    readonly CONFIG_INVALID: "CONFIG_INVALID";
    readonly OBJECT_NOT_FOUND: "OBJECT_NOT_FOUND";
    readonly REASON_REQUIRED: "REASON_REQUIRED";
    readonly OVERWRITE_RECORD_IMMUTABLE: "OVERWRITE_RECORD_IMMUTABLE";
    readonly INVALID_OVERRIDE_CONCLUSION: "INVALID_OVERRIDE_CONCLUSION";
    readonly INPUT_INVALID: "INPUT_INVALID";
    readonly FILE_NOT_FOUND: "FILE_NOT_FOUND";
    readonly PATH_INVALID: "PATH_INVALID";
    readonly DATASET_EMPTY: "DATASET_EMPTY";
    readonly UNKNOWN_ERROR: "UNKNOWN_ERROR";
};
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
export declare const OVERRIDE_CONCLUSIONS: readonly ["合格", "不合格", "误判", "需复检"];
export type OverrideConclusion = (typeof OVERRIDE_CONCLUSIONS)[number];
export declare const INSPECTION_RATIO_STATEMENT = "\u672C\u6B21\u68C0\u6D4B\u91C7\u7528\u5168\u68C0\u6BD4\u4F8B\uFF0C\u5BF9\u5DE5\u4F5C\u533A\u5185\u5168\u90E8\u7BA1\u7EBF\u70B9\u3001\u7BA1\u6BB5\u3001\u6784\u7B51\u7269\u9010\u4E00\u68C0\u67E5";
export declare const QUALITY_GRADES: readonly ["优级", "良级", "合格", "不合格"];
export type QualityGrade = (typeof QUALITY_GRADES)[number];
//# sourceMappingURL=invariant.d.ts.map