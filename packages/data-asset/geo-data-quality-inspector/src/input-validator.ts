import type {
  GeoDataset,
  GeoFeature,
  Geometry,
  CheckPoint,
  SpatialReference,
  ShapefileManifest,
  DataFormat,
  GridCell,
  ValidationError,
} from './types.js'
import { SHAPEFILE_REQUIRED_EXTENSIONS, VALID_GEOMETRY_TYPES } from './invariant.js'

const FEATURE_REQUIRED_FIELDS = ['featureId', 'geometry'] as const

export class InputValidator {
  validateFeature(raw: unknown): { feature: GeoFeature | null; error: ValidationError | null } {
    if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
      return {
        feature: null,
        error: {
          objectId: 'unknown',
          missingFields: [...FEATURE_REQUIRED_FIELDS],
          errorMessage: '要素数据不是有效对象',
        },
      }
    }

    const obj = raw as Record<string, unknown>
    const missingFields: string[] = []
    const errors: string[] = []

    for (const field of FEATURE_REQUIRED_FIELDS) {
      const value = obj[field]
      if (value === null || value === undefined || value === '') {
        missingFields.push(field)
      }
    }

    if (typeof obj.featureId === 'string' && obj.featureId !== '') {
      if (typeof obj.geometry !== 'object' || obj.geometry === null || Array.isArray(obj.geometry)) {
        errors.push('geometry 必须为有效几何对象')
        if (!missingFields.includes('geometry')) missingFields.push('geometry')
      } else {
        const geom = obj.geometry as Record<string, unknown>
        if (typeof geom.type !== 'string' || !VALID_GEOMETRY_TYPES.includes(geom.type as (typeof VALID_GEOMETRY_TYPES)[number])) {
          errors.push(`geometry.type 须为合法几何类型: ${VALID_GEOMETRY_TYPES.join('/')}`)
        }
        if (geom.coordinates === undefined && geom.geometries === undefined) {
          errors.push('geometry 须包含 coordinates 或 geometries 字段')
        }
      }
    }

    if (missingFields.length > 0 || errors.length > 0) {
      return {
        feature: null,
        error: {
          objectId: typeof obj.featureId === 'string' && obj.featureId !== '' ? obj.featureId : 'unknown',
          missingFields,
          errorMessage: errors.length > 0 ? errors.join('; ') : '必填字段缺失',
        },
      }
    }

    const geometry = obj.geometry as Geometry
    const feature: GeoFeature = {
      featureId: obj.featureId as string,
      geometry,
      properties: (obj.properties as Record<string, unknown>) ?? {},
    }

    if (typeof obj.featureType === 'string' && obj.featureType !== '') {
      feature.featureType = obj.featureType
    }
    if (typeof obj.classificationCode === 'string' && obj.classificationCode !== '') {
      feature.classificationCode = obj.classificationCode
    }

    return { feature, error: null }
  }

  validateCheckPoint(raw: unknown): { checkPoint: CheckPoint | null; error: ValidationError | null } {
    if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
      return {
        checkPoint: null,
        error: {
          objectId: 'unknown',
          missingFields: ['pointId', 'measuredElevation', 'referenceElevation'],
          errorMessage: '检测点数据不是有效对象',
        },
      }
    }

    const obj = raw as Record<string, unknown>
    const missingFields: string[] = []

    if (typeof obj.pointId !== 'string' || obj.pointId === '') missingFields.push('pointId')
    if (typeof obj.measuredElevation !== 'number' || Number.isNaN(obj.measuredElevation)) missingFields.push('measuredElevation')
    if (typeof obj.referenceElevation !== 'number' || Number.isNaN(obj.referenceElevation)) missingFields.push('referenceElevation')

    if (missingFields.length > 0) {
      return {
        checkPoint: null,
        error: {
          objectId: typeof obj.pointId === 'string' && obj.pointId !== '' ? obj.pointId : 'unknown',
          missingFields,
          errorMessage: '必填字段缺失',
        },
      }
    }

    const checkPoint: CheckPoint = {
      pointId: obj.pointId as string,
      measuredElevation: obj.measuredElevation as number,
      referenceElevation: obj.referenceElevation as number,
    }

    if (typeof obj.measuredX === 'number' && !Number.isNaN(obj.measuredX)) checkPoint.measuredX = obj.measuredX
    if (typeof obj.measuredY === 'number' && !Number.isNaN(obj.measuredY)) checkPoint.measuredY = obj.measuredY
    if (typeof obj.referenceX === 'number' && !Number.isNaN(obj.referenceX)) checkPoint.referenceX = obj.referenceX
    if (typeof obj.referenceY === 'number' && !Number.isNaN(obj.referenceY)) checkPoint.referenceY = obj.referenceY

    return { checkPoint, error: null }
  }

  validateSpatialReference(raw: unknown): SpatialReference | undefined {
    if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
      return undefined
    }

    const obj = raw as Record<string, unknown>
    const sr: SpatialReference = {}

    if (typeof obj.srid === 'string' && obj.srid !== '') sr.srid = obj.srid
    if (typeof obj.verticalDatum === 'string' && obj.verticalDatum !== '') sr.verticalDatum = obj.verticalDatum
    if (typeof obj.projection === 'string' && obj.projection !== '') sr.projection = obj.projection

    if (sr.srid === undefined && sr.verticalDatum === undefined && sr.projection === undefined) {
      return undefined
    }

    return sr
  }

  validateShapefileManifest(raw: unknown): ShapefileManifest | undefined {
    if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
      return undefined
    }

    const obj = raw as Record<string, unknown>
    const basePath = typeof obj.basePath === 'string' ? obj.basePath : ''
    const existingExtensions = Array.isArray(obj.existingExtensions)
      ? (obj.existingExtensions as string[]).filter((e) => typeof e === 'string')
      : []
    const existingSet = new Set(existingExtensions)
    const missingExtensions = SHAPEFILE_REQUIRED_EXTENSIONS.filter((ext) => !existingSet.has(ext))

    return { basePath, existingExtensions, missingExtensions }
  }

  validateDataset(raw: unknown): {
    dataset: GeoDataset | null
    errors: ValidationError[]
  } {
    const errors: ValidationError[] = []

    if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
      errors.push({
        objectId: 'dataset',
        missingFields: ['format', 'features'],
        errorMessage: '数据集不是有效对象',
      })
      return { dataset: null, errors }
    }

    const obj = raw as Record<string, unknown>

    const format = obj.format
    if (typeof format !== 'string' || (format !== 'Shapefile' && format !== 'GeoJSON')) {
      errors.push({
        objectId: 'dataset',
        missingFields: ['format'],
        errorMessage: 'format 须为 Shapefile 或 GeoJSON',
      })
      return { dataset: null, errors }
    }

    const features: GeoFeature[] = []
    if (Array.isArray(obj.features)) {
      for (const rawFeature of obj.features) {
        const { feature, error } = this.validateFeature(rawFeature)
        if (feature !== null) {
          features.push(feature)
        } else if (error !== null) {
          errors.push(error)
        }
      }
    } else {
      errors.push({
        objectId: 'dataset',
        missingFields: ['features'],
        errorMessage: '数据集缺少 features 数组',
      })
    }

    const checkPoints: CheckPoint[] = []
    if (Array.isArray(obj.checkPoints)) {
      for (const rawPoint of obj.checkPoints) {
        const { checkPoint, error } = this.validateCheckPoint(rawPoint)
        if (checkPoint !== null) {
          checkPoints.push(checkPoint)
        } else if (error !== null) {
          errors.push(error)
        }
      }
    }

    const dataset: GeoDataset = {
      format: format as DataFormat,
      features,
    }

    const spatialReference = this.validateSpatialReference(obj.spatialReference)
    if (spatialReference !== undefined) {
      dataset.spatialReference = spatialReference
    }

    if (checkPoints.length > 0) {
      dataset.checkPoints = checkPoints
    }

    if (Array.isArray(obj.crossValidationPoints)) {
      const crossPoints: CheckPoint[] = []
      for (const rawPoint of obj.crossValidationPoints) {
        const { checkPoint } = this.validateCheckPoint(rawPoint)
        if (checkPoint !== null) {
          crossPoints.push(checkPoint)
        }
      }
      if (crossPoints.length > 0) {
        dataset.crossValidationPoints = crossPoints
      }
    }

    const shapefileManifest = this.validateShapefileManifest(obj.shapefileManifest)
    if (shapefileManifest !== undefined) {
      dataset.shapefileManifest = shapefileManifest
    }

    if (typeof obj.highPrecisionReferenceAvailable === 'boolean') {
      dataset.highPrecisionReferenceAvailable = obj.highPrecisionReferenceAvailable
    }

    if (typeof obj.gridParameter === 'object' && obj.gridParameter !== null && !Array.isArray(obj.gridParameter)) {
      const gp = obj.gridParameter as Record<string, unknown>
      if (typeof gp.gridSpacing === 'number' && typeof gp.originX === 'number' && typeof gp.originY === 'number' && Array.isArray(gp.cells)) {
        dataset.gridParameter = {
          gridSpacing: gp.gridSpacing,
          originX: gp.originX,
          originY: gp.originY,
          cells: gp.cells as GridCell[],
        }
      }
    }

    return { dataset, errors }
  }
}