import type {
  GeoDataset,
  GeoAccuracyConfig,
  EdgeAccuracyResult,
  GeoFeature,
  QualityCheckResult,
} from './types.js'

export class EdgeAccuracyChecker {
  check(
    dataset: GeoDataset,
    config: GeoAccuracyConfig,
  ): EdgeAccuracyResult {
    const checkResults: QualityCheckResult[] = []
    const mismatchedPairs: { featureIdA: string; featureIdB: string; distance: number }[] = []

    const tolerance = config.edgeMatching.toleranceMeter
    const lineFeatures = dataset.features.filter(
      (f) => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString',
    )

    const endpoints = this.extractEndpoints(lineFeatures)

    for (let i = 0; i < endpoints.length; i++) {
      for (let j = i + 1; j < endpoints.length; j++) {
        const epA = endpoints[i]!
        const epB = endpoints[j]!
        if (epA.featureId === epB.featureId) continue

        const distance = this.calculateDistance(epA.x, epA.y, epB.x, epB.y)
        const neighborThreshold = tolerance * 100

        if (distance <= neighborThreshold && distance > tolerance) {
          mismatchedPairs.push({
            featureIdA: epA.featureId,
            featureIdB: epB.featureId,
            distance: Math.round(distance * 1000000) / 1000000,
          })
          checkResults.push({
            checkName: '接边精度检查',
            errorClass: 'B',
            objectId: `${epA.featureId}-${epB.featureId}`,
            description: `接边要素 ${epA.featureId} 与 ${epB.featureId} 坐标偏差 ${distance.toFixed(6)} 米，超过容差 ${tolerance} 米`,
            policyBasis: config.edgeMatching.policyBasis,
          })
        }
      }
    }

    return { mismatchedPairs, checkResults }
  }

  private extractEndpoints(features: GeoFeature[]): { featureId: string; x: number; y: number }[] {
    const endpoints: { featureId: string; x: number; y: number }[] = []

    for (const feature of features) {
      const coords = feature.geometry.coordinates
      if (feature.geometry.type === 'LineString' && Array.isArray(coords)) {
        const lineCoords = coords as number[][]
        if (lineCoords.length >= 2) {
          const start = lineCoords[0]!
          const end = lineCoords[lineCoords.length - 1]!
          if (start.length >= 2) endpoints.push({ featureId: feature.featureId, x: start[0]!, y: start[1]! })
          if (end.length >= 2) endpoints.push({ featureId: feature.featureId, x: end[0]!, y: end[1]! })
        }
      } else if (feature.geometry.type === 'MultiLineString' && Array.isArray(coords)) {
        const multiCoords = coords as number[][][]
        for (const lineCoords of multiCoords) {
          if (lineCoords.length >= 2) {
            const start = lineCoords[0]!
            const end = lineCoords[lineCoords.length - 1]!
            if (start.length >= 2) endpoints.push({ featureId: feature.featureId, x: start[0]!, y: start[1]! })
            if (end.length >= 2) endpoints.push({ featureId: feature.featureId, x: end[0]!, y: end[1]! })
          }
        }
      }
    }

    return endpoints
  }

  private calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x1 - x2
    const dy = y1 - y2
    return Math.sqrt(dx * dx + dy * dy)
  }
}