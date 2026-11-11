export const name = '@liuhange/dsh-underground-pipeline-inspector';
export const inject = ['tools'];
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { PipelineConfigLoader } from './pipeline-config-loader.js';
import { InputValidator } from './input-validator.js';
import { CoverageChecker } from './coverage-checker.js';
import { EdgeMatchingChecker } from './edge-matching-checker.js';
import { TopologyChecker } from './topology-checker.js';
import { CoordinateChecker } from './coordinate-checker.js';
import { FlowDirectionChecker } from './flow-direction-checker.js';
import { AttributePrecisionChecker } from './attribute-precision-checker.js';
import { SpatialReferenceChecker } from './spatial-reference-checker.js';
import { QualityElementScorer } from './quality-element-scorer.js';
import { ErrorClassifier } from './error-classifier.js';
import { GrossErrorRateCalculator } from './gross-error-rate-calculator.js';
import { InspectionReportGenerator } from './inspection-report-generator.js';
import { ReviewOverrideRecorder } from './review-override-recorder.js';
import { PolicyBasisBuilder } from './policy-basis-builder.js';
import { ERROR_CODES, LEGAL_DISCLAIMER } from './invariant.js';
export function apply(ctx) {
    ctx.tools.register({
        name: 'inspect_underground_pipeline',
        description: '对地下管线数据进行质量巡检，输出检测结果、质量元素评分、错误分类统计、粗差率与政策依据',
        parameters: {
            type: 'object',
            properties: {
                datasetFilePath: { type: 'string', description: '地下管线数据集文件路径（JSON格式，含points/segments/structures）' },
                outputPathDir: { type: 'string', description: '报告输出目录（默认数据文件所在目录）' },
            },
            required: ['datasetFilePath'],
        },
        output: {
            schema: { type: 'object', additionalProperties: true },
            render: (_args, value) => [
                { type: 'text', text: JSON.stringify(value, null, 2) },
            ],
        },
        async execute(args) {
            try {
                if (!args || typeof args !== 'object') {
                    return { error: ERROR_CODES.INPUT_INVALID, message: '参数不能为空' };
                }
                const datasetFilePath = args.datasetFilePath;
                if (!datasetFilePath || typeof datasetFilePath !== 'string') {
                    return { error: ERROR_CODES.INPUT_INVALID, message: 'datasetFilePath 为必填字段' };
                }
                if (!existsSync(datasetFilePath)) {
                    return { error: ERROR_CODES.FILE_NOT_FOUND, message: `文件不存在 - ${datasetFilePath}` };
                }
                const datasetFileRaw = readFileSync(datasetFilePath, 'utf-8');
                let datasetFileData;
                try {
                    datasetFileData = JSON.parse(datasetFileRaw);
                }
                catch {
                    return { error: ERROR_CODES.CONFIG_INVALID, message: '数据集文件 JSON 解析失败' };
                }
                const configLoader = new PipelineConfigLoader();
                const configLoadResult = configLoader.load();
                const { inspectionConfig, attributeConfig, qualityElementConfig } = configLoadResult;
                const inputValidator = new InputValidator();
                const { dataset, errors: validationErrors } = inputValidator.validateDataset(datasetFileData);
                if (dataset === null) {
                    return {
                        error: ERROR_CODES.DATASET_EMPTY,
                        message: '数据集无效，无法执行巡检',
                        validationErrors,
                    };
                }
                const allCheckResults = [];
                const allWarnings = [...configLoadResult.warnings];
                const coverageChecker = new CoverageChecker();
                const { checkResults: coverageResults } = coverageChecker.check(dataset, inspectionConfig);
                allCheckResults.push(...coverageResults);
                const edgeMatchingChecker = new EdgeMatchingChecker();
                const { checkResults: edgeResults } = edgeMatchingChecker.check(dataset.points, inspectionConfig);
                allCheckResults.push(...edgeResults);
                const topologyChecker = new TopologyChecker();
                const { checkResults: topologyResults } = topologyChecker.check(dataset, inspectionConfig);
                allCheckResults.push(...topologyResults);
                const coordinateChecker = new CoordinateChecker();
                const { checkResults: coordinateResults } = coordinateChecker.check(dataset, inspectionConfig);
                allCheckResults.push(...coordinateResults);
                const flowDirectionChecker = new FlowDirectionChecker();
                const { checkResults: flowResults } = flowDirectionChecker.check(dataset, attributeConfig);
                allCheckResults.push(...flowResults);
                const attributePrecisionChecker = new AttributePrecisionChecker();
                const { checkResults: attributeResults } = attributePrecisionChecker.check(dataset, attributeConfig);
                allCheckResults.push(...attributeResults);
                const spatialReferenceChecker = new SpatialReferenceChecker();
                const { checkResults: spatialResults } = spatialReferenceChecker.check(dataset, inspectionConfig);
                allCheckResults.push(...spatialResults);
                const qualityElementScorer = new QualityElementScorer();
                const { scores: qualityElementScores, totalScore } = qualityElementScorer.score(allCheckResults, qualityElementConfig);
                const policyBasisBuilder = new PolicyBasisBuilder();
                const errorClassPolicyBasis = policyBasisBuilder.buildByKey('GBT_24356', '第7.2条');
                const errorClassifier = new ErrorClassifier();
                const errorClassStatistics = errorClassifier.classify(allCheckResults, errorClassPolicyBasis);
                const grossErrorRateCalculator = new GrossErrorRateCalculator();
                const grossErrorRate = grossErrorRateCalculator.calculate(allCheckResults, dataset.points.length, inspectionConfig);
                const overrideRecorder = new ReviewOverrideRecorder();
                const overrideList = overrideRecorder.readAll();
                const configVersions = {
                    inspectionConfigVersion: inspectionConfig.version,
                    attributeConfigVersion: attributeConfig.version,
                    qualityElementConfigVersion: qualityElementConfig.version,
                };
                if (dataset.points.length === 0 && dataset.segments.length === 0) {
                    allWarnings.push('巡检范围内无管线数据');
                }
                const reportGenerator = new InspectionReportGenerator();
                const report = reportGenerator.generate({
                    checkResults: allCheckResults,
                    qualityElementScores,
                    totalQualityScore: totalScore,
                    errorClassStatistics,
                    grossErrorRate,
                    overrideList,
                    errorList: validationErrors,
                    configVersions,
                    inspectionScope: datasetFilePath,
                    warnings: allWarnings,
                });
                const outputPathDir = args.outputPathDir ?? dirname(datasetFilePath);
                const jsonPath = resolve(outputPathDir, 'inspection-report.json');
                const markdownPath = resolve(outputPathDir, 'inspection-report.md');
                reportGenerator.writeJson(report, jsonPath);
                reportGenerator.writeMarkdown(report, markdownPath);
                const result = {
                    reportId: report.reportId,
                    inspectionTime: report.inspectionTime,
                    summary: {
                        totalPoints: dataset.points.length,
                        totalSegments: dataset.segments.length,
                        totalStructures: dataset.structures.length,
                        totalCheckResults: allCheckResults.length,
                        classAErrors: errorClassStatistics.classACount,
                        classBErrors: errorClassStatistics.classBCount,
                        classCErrors: errorClassStatistics.classCCount,
                        classDErrors: errorClassStatistics.classDCount,
                        totalQualityScore: totalScore,
                        grossErrorRate: grossErrorRate.rate,
                        grossErrorRatePassed: grossErrorRate.passed,
                        overrideCount: overrideList.length,
                        validationErrorCount: validationErrors.length,
                    },
                    configVersions,
                    legalDisclaimer: LEGAL_DISCLAIMER,
                    reportPaths: { json: jsonPath, markdown: markdownPath },
                };
                return result;
            }
            catch (e) {
                return { error: ERROR_CODES.UNKNOWN_ERROR, message: e.message };
            }
        },
    });
    ctx.tools.register({
        name: 'underground_submit_review_override',
        description: '提交人工复核覆盖指令，对自动判定结果进行人工覆盖并记录覆盖理由',
        parameters: {
            type: 'object',
            properties: {
                objectId: { type: 'string', description: '被覆盖的对象标识' },
                overrideConclusion: { type: 'string', description: '覆盖后结论（合格/不合格/误判/需复检）' },
                overrideReason: { type: 'string', description: '覆盖理由（不可为空）' },
                operator: { type: 'string', description: '操作人标识' },
                inspectionReportPath: { type: 'string', description: '巡检报告路径（用于定位判定结果）' },
            },
            required: ['objectId', 'overrideConclusion', 'overrideReason', 'operator', 'inspectionReportPath'],
        },
        output: {
            schema: { type: 'object', additionalProperties: true },
            render: (_args, value) => [
                { type: 'text', text: JSON.stringify(value, null, 2) },
            ],
        },
        async execute(args) {
            try {
                if (!args || typeof args !== 'object') {
                    return { error: ERROR_CODES.INPUT_INVALID, message: '参数不能为空' };
                }
                const objectId = args.objectId;
                const overrideConclusion = args.overrideConclusion;
                const overrideReason = args.overrideReason;
                const operator = args.operator;
                const inspectionReportPath = args.inspectionReportPath;
                if (!objectId || typeof objectId !== 'string') {
                    return { error: ERROR_CODES.INPUT_INVALID, message: 'objectId 为必填字段' };
                }
                if (!overrideConclusion || typeof overrideConclusion !== 'string') {
                    return { error: ERROR_CODES.INPUT_INVALID, message: 'overrideConclusion 为必填字段' };
                }
                if (!overrideReason || typeof overrideReason !== 'string') {
                    return { error: ERROR_CODES.REASON_REQUIRED, message: '覆盖理由不可为空' };
                }
                if (!operator || typeof operator !== 'string') {
                    return { error: ERROR_CODES.INPUT_INVALID, message: 'operator 为必填字段' };
                }
                if (!inspectionReportPath || typeof inspectionReportPath !== 'string') {
                    return { error: ERROR_CODES.INPUT_INVALID, message: 'inspectionReportPath 为必填字段' };
                }
                if (!existsSync(inspectionReportPath)) {
                    return { error: ERROR_CODES.FILE_NOT_FOUND, message: `巡检报告文件不存在 - ${inspectionReportPath}` };
                }
                const reportRaw = readFileSync(inspectionReportPath, 'utf-8');
                let reportData;
                try {
                    reportData = JSON.parse(reportRaw);
                }
                catch {
                    return { error: ERROR_CODES.CONFIG_INVALID, message: '巡检报告文件 JSON 解析失败' };
                }
                const existingObjectIds = new Set();
                for (const item of reportData.checkResults) {
                    existingObjectIds.add(item.objectId);
                }
                const overrideRecorder = new ReviewOverrideRecorder();
                const validation = overrideRecorder.validateOverrideInstruction(objectId, overrideConclusion, overrideReason, existingObjectIds);
                if (!validation.valid) {
                    return { error: validation.error, message: validation.message };
                }
                const originalConclusion = findOriginalConclusion(reportData, objectId);
                const overrideRecord = {
                    objectId,
                    originalConclusion,
                    newConclusion: overrideConclusion,
                    overrideReason,
                    operator,
                    overrideTime: new Date().toISOString(),
                };
                overrideRecorder.record(overrideRecord);
                const result = {
                    success: true,
                    objectId,
                    originalConclusion,
                    newConclusion: overrideConclusion,
                    overrideReason,
                    operator,
                    overrideTime: overrideRecord.overrideTime,
                    message: '人工复核覆盖已记录',
                };
                return result;
            }
            catch (e) {
                return { error: ERROR_CODES.UNKNOWN_ERROR, message: e.message };
            }
        },
    });
}
function findOriginalConclusion(report, objectId) {
    for (const item of report.checkResults) {
        if (item.objectId === objectId) {
            return `${item.errorClass}类错误`;
        }
    }
    return '未知';
}
//# sourceMappingURL=index.js.map