export type ErrorClass = 'A' | 'B' | 'C' | 'D'
export type JudgmentStatus = '自动判定' | '人工确认'

export interface PipelinePoint {
  pointId: string
  pointType: string
  x: number
  y: number
  elevation: number
  srid?: string
  verticalDatum?: string
}

export interface PipelineSegment {
  segmentId: string
  startPointId: string
  endPointId: string
  diameter: number
  material: string
  buryMethod: string
  flowDirection?: string
}

export interface Structure {
  structureId: string
  structureType: string
  x?: number
  y?: number
  elevation?: number
}

export interface PipelineDataset {
  points: PipelinePoint[]
  segments: PipelineSegment[]
  structures: Structure[]
  workspaceLayers?: string[]
}

export interface QualityCheckResult {
  checkName: string
  errorClass: ErrorClass
  objectId: string
  description: string
  policyBasis: string
}

export interface QualityElementScore {
  elementName: string
  weight: number
  score: number
  policyBasis: string
}

export interface ErrorClassStatistics {
  classACount: number
  classBCount: number
  classCCount: number
  classDCount: number
  totalCount: number
  policyBasis: string
}

export interface GrossErrorRateResult {
  totalPoints: number
  grossErrorPoints: number
  rate: number
  threshold: number
  passed: boolean
  policyBasis: string
}

export interface ReviewOverrideRecord {
  objectId: string
  originalConclusion: string
  newConclusion: string
  overrideReason: string
  operator: string
  overrideTime: string
}

export interface ValidationError {
  objectId: string
  missingFields: string[]
  errorMessage: string
}

export interface InspectionReport {
  reportId: string
  inspectionTime: string
  inspectionScope: string
  inspectionRatioStatement: string
  checkResults: QualityCheckResult[]
  qualityElementScores: QualityElementScore[]
  errorClassStatistics: ErrorClassStatistics
  grossErrorRate: GrossErrorRateResult
  overrideList: ReviewOverrideRecord[]
  errorList: ValidationError[]
  policyBasisSummary: string[]
  configVersions: ConfigVersionSet
  legalDisclaimer: string
  warnings: string[]
}

export interface ConfigVersionSet {
  inspectionConfigVersion: string
  attributeConfigVersion: string
  qualityElementConfigVersion: string
}

export interface PipelineInspectionConfig {
  version: string
  lastUpdated: string
  workspace: {
    description: string
    requiredLayers: string[]
    policyBasis: string
  }
  edgeMatching: {
    description: string
    toleranceMeter: number
    policyBasis: string
  }
  legalCoordinateSystems: {
    description: string
    allowedSridList: string[]
    policyBasis: string
  }
  verticalDatum: {
    description: string
    allowedDatumList: string[]
    policyBasis: string
  }
  connectivity: {
    description: string
    minConnectedSegments: number
    maxConnectedSegments: number
    policyBasis: string
  }
  grossErrorRate: {
    description: string
    thresholdRate: number
    policyBasis: string
  }
  fieldIntegrity: {
    description: string
    pipelinePointRequiredFields: string[]
    pipelineSegmentRequiredFields: string[]
    policyBasis: string
  }
}

export interface FieldConstraint {
  fieldName: string
  maxLength: number
  policyBasis: string
}

export interface PipelineAttributeConfig {
  version: string
  lastUpdated: string
  diameterRange: {
    description: string
    minMm: number
    maxMm: number
    policyBasis: string
  }
  materialEnum: {
    description: string
    allowedValues: string[]
    policyBasis: string
  }
  buryMethodEnum: {
    description: string
    allowedValues: string[]
    policyBasis: string
  }
  flowDirectionEnum: {
    description: string
    allowedValues: string[]
    policyBasis: string
  }
  attributeSpec: {
    description: string
    fieldConstraints: FieldConstraint[]
    policyBasis: string
  }
}

export interface QualityElementConfigItem {
  elementName: string
  weight: number
  policyBasis: string
}

export interface QualityElementConfig {
  version: string
  lastUpdated: string
  qualityElements: {
    description: string
    elements: QualityElementConfigItem[]
    policyBasis: string
  }
  errorClassThresholds: {
    description: string
    classAScoreDeduction: number
    classBScoreDeduction: number
    classCScoreDeduction: number
    classDScoreDeduction: number
    policyBasis: string
  }
  qualityGradeThresholds: {
    description: string
    excellentMinScore: number
    goodMinScore: number
    qualifiedMinScore: number
    policyBasis: string
  }
}

export type ConfigLoadStatus =
  | 'CONFIG_LOADED'
  | 'DEFAULT_MISSING'
  | 'DEFAULT_PARSE'
  | 'DEFAULT_VERSION'
  | 'DEFAULT_PARTIAL'

export interface ConfigLoadResult {
  inspectionConfig: PipelineInspectionConfig
  attributeConfig: PipelineAttributeConfig
  qualityElementConfig: QualityElementConfig
  loadStatus: ConfigLoadStatus
  warnings: string[]
}

export interface CoverageCheckResult {
  missingLayers: string[]
  fieldErrors: ValidationError[]
  policyBasis: string
}

export interface EdgeMatchingResult {
  mismatchedPairs: { pointIdA: string; pointIdB: string; distance: number }[]
  policyBasis: string
}

export interface TopologyCheckResult {
  duplicateSegments: { segmentId: string; description: string }[]
  duplicatePoints: { pointId: string; description: string }[]
  isolatedPoints: { pointId: string; description: string }[]
  duplicateStructures: { structureId: string; description: string }[]
  connectivityViolations: { pointId: string; description: string }[]
  policyBasis: string
}

export interface CoordinateCheckResult {
  missingCoordinatePoints: { pointId: string; description: string }[]
  policyBasis: string
}

export interface FlowDirectionCheckResult {
  invalidFlowSegments: { segmentId: string; description: string }[]
  policyBasis: string
}

export interface AttributePrecisionCheckResult {
  invalidDiameter: { segmentId: string; description: string }[]
  invalidMaterial: { segmentId: string; description: string }[]
  invalidBuryMethod: { segmentId: string; description: string }[]
  invalidFlowDirection: { segmentId: string; description: string }[]
  fieldLengthViolations: { objectId: string; fieldName: string; description: string }[]
  policyBasis: string
}

export interface SpatialReferenceCheckResult {
  invalidSrid: { pointId: string; description: string }[]
  invalidVerticalDatum: { pointId: string; description: string }[]
  policyBasis: string
}