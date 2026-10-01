export type ErrorClass = 'A' | 'B' | 'C' | 'D'
export type JudgmentStatus = '自动判定' | '人工确认'
export type DataFormat = 'Shapefile' | 'GeoJSON'

export type GeometryType =
  | 'Point'
  | 'MultiPoint'
  | 'LineString'
  | 'MultiLineString'
  | 'Polygon'
  | 'MultiPolygon'
  | 'GeometryCollection'

export interface Position {
  x: number
  y: number
  z?: number
}

export interface Geometry {
  type: GeometryType
  coordinates: number[] | number[][] | number[][][] | number[][][][]
  geometries?: Geometry[]
}

export interface GeoFeatureProperties {
  [key: string]: unknown
}

export interface GeoFeature {
  featureId: string
  geometry: Geometry
  properties: GeoFeatureProperties
  featureType?: string
  classificationCode?: string
}

export interface SpatialReference {
  srid?: string
  verticalDatum?: string
  projection?: string
}

export interface CheckPoint {
  pointId: string
  measuredElevation: number
  referenceElevation: number
  measuredX?: number
  measuredY?: number
  referenceX?: number
  referenceY?: number
}

export interface GridCell {
  cellId: string
  x: number
  y: number
  elevation: number
  gridSpacing: number
}

export interface GridParameter {
  gridSpacing: number
  originX: number
  originY: number
  cells: GridCell[]
}

export interface ShapefileManifest {
  basePath: string
  existingExtensions: string[]
  missingExtensions: string[]
}

export interface GeoDataset {
  format: DataFormat
  features: GeoFeature[]
  spatialReference?: SpatialReference
  checkPoints?: CheckPoint[]
  gridParameter?: GridParameter
  shapefileManifest?: ShapefileManifest
  highPrecisionReferenceAvailable?: boolean
  crossValidationPoints?: CheckPoint[]
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
  totalQualityScore: number
  errorClassStatistics: ErrorClassStatistics
  overrideList: ReviewOverrideRecord[]
  errorList: ValidationError[]
  policyBasisSummary: string[]
  configVersions: ConfigVersionSet
  legalDisclaimer: string
  warnings: string[]
}

export interface ConfigVersionSet {
  geoAccuracyConfigVersion: string
  geoTopologyConfigVersion: string
  qualityElementConfigVersion: string
}

export interface GeoAccuracyConfig {
  version: string
  lastUpdated: string
  elevationAccuracy: {
    description: string
    rmseThresholdMeter: number
    policyBasis: string
  }
  planarAccuracy: {
    description: string
    rmseThresholdMeter: number
    policyBasis: string
  }
  edgeMatching: {
    description: string
    toleranceMeter: number
    policyBasis: string
  }
  checkPointCount: {
    description: string
    minCheckPoints: number
    maxCheckPoints: number
    policyBasis: string
  }
  gridParameter: {
    description: string
    sameNameElevationToleranceMeter: number
    gridSpacingMeter: number
    policyBasis: string
  }
  highPrecisionReference: {
    description: string
    degradationReason: string
    policyBasis: string
  }
  crossValidation: {
    description: string
    toleranceMeter: number
    policyBasis: string
  }
  spatialReference: {
    description: string
    allowedSridList: string[]
    allowedVerticalDatumList: string[]
    policyBasis: string
  }
}

export interface GeoTopologyConfig {
  version: string
  lastUpdated: string
  pseudoNode: {
    description: string
    toleranceMeter: number
    policyBasis: string
  }
  danglingNode: {
    description: string
    toleranceMeter: number
    policyBasis: string
  }
  polygonOverlap: {
    description: string
    toleranceSquareMeter: number
    policyBasis: string
  }
  polygonGap: {
    description: string
    toleranceSquareMeter: number
    policyBasis: string
  }
  duplicateCollection: {
    description: string
    maxDuplicateCount: number
    policyBasis: string
  }
  topologyTimeout: {
    description: string
    timeoutMs: number
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
  geoAccuracyConfig: GeoAccuracyConfig
  geoTopologyConfig: GeoTopologyConfig
  qualityElementConfig: QualityElementConfig
  loadStatus: ConfigLoadStatus
  warnings: string[]
}

export interface ElevationAccuracyResult {
  rmse: number | null
  checkPointCount: number
  passed: boolean | null
  method: string
  degradationReason?: string
  checkResults: QualityCheckResult[]
}

export interface PlanarAccuracyResult {
  rmse: number | null
  checkPointCount: number
  passed: boolean | null
  checkResults: QualityCheckResult[]
}

export interface EdgeAccuracyResult {
  mismatchedPairs: { featureIdA: string; featureIdB: string; distance: number }[]
  checkResults: QualityCheckResult[]
}

export interface SpatialReferenceCheckResult {
  invalidSrid: { featureId: string; description: string }[]
  invalidVerticalDatum: { featureId: string; description: string }[]
  resolvable: boolean
  checkResults: QualityCheckResult[]
}

export interface LogicalConsistencyResult {
  invalidClassificationCodes: { featureId: string; description: string }[]
  checkResults: QualityCheckResult[]
}

export interface FormatConsistencyResult {
  shapefileComplete: boolean
  missingExtensions: string[]
  geoJsonValid: boolean
  blocked: boolean
  checkResults: QualityCheckResult[]
}

export interface TopologyCheckResult {
  pseudoNodes: { featureId: string; description: string }[]
  danglingNodes: { featureId: string; description: string }[]
  polygonOverlaps: { featureIdA: string; featureIdB: string; description: string }[]
  polygonGaps: { featureIdA: string; featureIdB: string; description: string }[]
  duplicateCollections: { featureId: string; description: string }[]
  timedOut: boolean
  checkResults: QualityCheckResult[]
}

export interface AttributePrecisionResult {
  invalidAttributeValues: { featureId: string; fieldName: string; description: string }[]
  checkResults: QualityCheckResult[]
}

export interface GridParameterResult {
  sameNameElevationMismatches: { cellIdA: string; cellIdB: string; description: string }[]
  gridSpacingViolations: { cellId: string; description: string }[]
  checkResults: QualityCheckResult[]
}