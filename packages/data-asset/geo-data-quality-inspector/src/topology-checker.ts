import type {
  GeoDataset,
  GeoTopologyConfig,
  TopologyCheckResult,
  GeoFeature,
  QualityCheckResult,
} from './types.js'

export class TopologyChecker {
  check(
    dataset: GeoDataset,
    config: GeoTopologyConfig,
  ): TopologyCheckResult {
    const checkResults: QualityCheckResult[] = []
    const pseudoNodes: { featureId: string; description: string }[] = []
    const danglingNodes: { featureId: string; description: string }[] = []
    const polygonOverlaps: { featureIdA: string; featureIdB: string; description: string }[] = []
    const polygonGaps: { featureIdA: string; featureIdB: string; description: string }[] = []
    const duplicateCollections: { featureId: string; description: string }[] = []

    const startTime = Date.now()
    const timeoutMs = config.topologyTimeout.timeoutMs

    const lineFeatures = dataset.features.filter(
      (f) => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString',
    )

    this.checkPseudoNodes(lineFeatures, config, pseudoNodes, checkResults)
    this.checkDanglingNodes(lineFeatures, config, danglingNodes, checkResults)

    const polygonFeatures = dataset.features.filter(
      (f) => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon',
    )

    let timedOut = false
    if (polygonFeatures.length > 0) {
      const elapsed = Date.now() - startTime
      if (elapsed >= timeoutMs) {
        timedOut = true
        checkResults.push({
          checkName: '面要素拓扑检查',
          errorClass: 'D',
          objectId: 'dataset',
          description: `面要素拓扑计算超时（已耗时 ${elapsed} 毫秒，阈值 ${timeoutMs} 毫秒），超时未完成，建议分批处理`,
          policyBasis: config.topologyTimeout.policyBasis,
        })
      } else {
        this.checkPolygonOverlap(polygonFeatures, config, polygonOverlaps, checkResults)
        const elapsedAfterOverlap = Date.now() - startTime
        if (elapsedAfterOverlap >= timeoutMs) {
          timedOut = true
          checkResults.push({
            checkName: '面要素拓扑检查',
            errorClass: 'D',
            objectId: 'dataset',
            description: `面缝隙检查超时（已耗时 ${elapsedAfterOverlap} 毫秒，阈值 ${timeoutMs} 毫秒），超时未完成，建议分批处理`,
            policyBasis: config.topologyTimeout.policyBasis,
          })
        } else {
          this.checkPolygonGap(polygonFeatures, config, polygonGaps, checkResults)
        }
      }
    }

    this.checkDuplicateCollection(dataset.features, config, duplicateCollections, checkResults)

    const finalElapsed = Date.now() - startTime
    if (finalElapsed >= timeoutMs && !timedOut) {
      timedOut = true
      checkResults.push({
        checkName: '面要素拓扑检查',
        errorClass: 'D',
        objectId: 'dataset',
        description: `拓扑计算总耗时 ${finalElapsed} 毫秒超过阈值 ${timeoutMs} 毫秒，超时未完成，建议分批处理`,
        policyBasis: config.topologyTimeout.policyBasis,
      })
    }

    return {
      pseudoNodes,
      danglingNodes,
      polygonOverlaps,
      polygonGaps,
      duplicateCollections,
      timedOut,
      checkResults,
    }
  }

  private checkPseudoNodes(
    lineFeatures: GeoFeature[],
    config: GeoTopologyConfig,
    pseudoNodes: { featureId: string; description: string }[],
    checkResults: QualityCheckResult[],
  ): void {
    const tolerance = config.pseudoNode.toleranceMeter
    const endpoints: { featureId: string; x: number; y: number }[] = []

    for (const feature of lineFeatures) {
      const coords = feature.geometry.coordinates
      if (feature.geometry.type === 'LineString' && Array.isArray(coords)) {
        const lineCoords = coords as number[][]
        if (lineCoords.length >= 2) {
          const start = lineCoords[0]!
          const end = lineCoords[lineCoords.length - 1]!
          if (start.length >= 2) endpoints.push({ featureId: feature.featureId, x: start[0]!, y: start[1]! })
          if (end.length >= 2) endpoints.push({ featureId: feature.featureId, x: end[0]!, y: end[1]! })
        }
      }
    }

    for (let i = 0; i < endpoints.length; i++) {
      for (let j = i + 1; j < endpoints.length; j++) {
        const epA = endpoints[i]!
        const epB = endpoints[j]!
        if (epA.featureId === epB.featureId) continue
        const distance = Math.sqrt((epA.x - epB.x) ** 2 + (epA.y - epB.y) ** 2)
        if (distance < tolerance && distance > 0) {
          pseudoNodes.push({
            featureId: epA.featureId,
            description: `线要素 ${epA.featureId} 与 ${epB.featureId} 端点距离 ${distance.toFixed(6)} 米小于伪节点容差 ${tolerance} 米`,
          })
          checkResults.push({
            checkName: '伪节点检查',
            errorClass: 'D',
            objectId: `${epA.featureId}-${epB.featureId}`,
            description: `线要素 ${epA.featureId} 与 ${epB.featureId} 端点距离 ${distance.toFixed(6)} 米小于伪节点容差 ${tolerance} 米`,
            policyBasis: config.pseudoNode.policyBasis,
          })
        }
      }
    }
  }

  private checkDanglingNodes(
    lineFeatures: GeoFeature[],
    config: GeoTopologyConfig,
    danglingNodes: { featureId: string; description: string }[],
    checkResults: QualityCheckResult[],
  ): void {
    const tolerance = config.danglingNode.toleranceMeter
    const endpoints: { featureId: string; x: number; y: number }[] = []

    for (const feature of lineFeatures) {
      const coords = feature.geometry.coordinates
      if (feature.geometry.type === 'LineString' && Array.isArray(coords)) {
        const lineCoords = coords as number[][]
        if (lineCoords.length >= 2) {
          const start = lineCoords[0]!
          const end = lineCoords[lineCoords.length - 1]!
          if (start.length >= 2) endpoints.push({ featureId: feature.featureId, x: start[0]!, y: start[1]! })
          if (end.length >= 2) endpoints.push({ featureId: feature.featureId, x: end[0]!, y: end[1]! })
        }
      }
    }

    for (let i = 0; i < endpoints.length; i++) {
      const epA = endpoints[i]!
      let hasMatch = false
      for (let j = 0; j < endpoints.length; j++) {
        if (i === j) continue
        const epB = endpoints[j]!
        const distance = Math.sqrt((epA.x - epB.x) ** 2 + (epA.y - epB.y) ** 2)
        if (distance <= tolerance) {
          hasMatch = true
          break
        }
      }
      if (!hasMatch && lineFeatures.length > 1) {
        danglingNodes.push({
          featureId: epA.featureId,
          description: `线要素 ${epA.featureId} 端点 (${epA.x}, ${epA.y}) 无匹配点，距离大于悬挂点容差 ${tolerance} 米`,
        })
        checkResults.push({
          checkName: '悬挂点检查',
          errorClass: 'C',
          objectId: epA.featureId,
          description: `线要素 ${epA.featureId} 端点 (${epA.x}, ${epA.y}) 无匹配点，距离大于悬挂点容差 ${tolerance} 米`,
          policyBasis: config.danglingNode.policyBasis,
        })
      }
    }
  }

  private checkPolygonOverlap(
    polygonFeatures: GeoFeature[],
    config: GeoTopologyConfig,
    polygonOverlaps: { featureIdA: string; featureIdB: string; description: string }[],
    checkResults: QualityCheckResult[],
  ): void {
    const tolerance = config.polygonOverlap.toleranceSquareMeter
    const boundingBoxes = this.calculateBoundingBoxes(polygonFeatures)

    for (let i = 0; i < boundingBoxes.length; i++) {
      for (let j = i + 1; j < boundingBoxes.length; j++) {
        const bbA = boundingBoxes[i]!
        const bbB = boundingBoxes[j]!
        const overlapArea = this.calculateBoundingBoxOverlap(bbA, bbB)
        if (overlapArea > tolerance) {
          polygonOverlaps.push({
            featureIdA: bbA.featureId,
            featureIdB: bbB.featureId,
            description: `面要素 ${bbA.featureId} 与 ${bbB.featureId} 重叠面积 ${overlapArea.toFixed(6)} 平方米超过容差 ${tolerance} 平方米`,
          })
          checkResults.push({
            checkName: '面重叠检查',
            errorClass: 'B',
            objectId: `${bbA.featureId}-${bbB.featureId}`,
            description: `面要素 ${bbA.featureId} 与 ${bbB.featureId} 重叠面积 ${overlapArea.toFixed(6)} 平方米超过容差 ${tolerance} 平方米`,
            policyBasis: config.polygonOverlap.policyBasis,
          })
        }
      }
    }
  }

  private checkPolygonGap(
    polygonFeatures: GeoFeature[],
    config: GeoTopologyConfig,
    polygonGaps: { featureIdA: string; featureIdB: string; description: string }[],
    checkResults: QualityCheckResult[],
  ): void {
    const tolerance = config.polygonGap.toleranceSquareMeter
    const boundingBoxes = this.calculateBoundingBoxes(polygonFeatures)

    for (let i = 0; i < boundingBoxes.length; i++) {
      for (let j = i + 1; j < boundingBoxes.length; j++) {
        const bbA = boundingBoxes[i]!
        const bbB = boundingBoxes[j]!
        const gapArea = this.calculateBoundingBoxGap(bbA, bbB)
        if (gapArea > tolerance && gapArea < tolerance * 1000) {
          polygonGaps.push({
            featureIdA: bbA.featureId,
            featureIdB: bbB.featureId,
            description: `面要素 ${bbA.featureId} 与 ${bbB.featureId} 缝隙面积 ${gapArea.toFixed(6)} 平方米超过容差 ${tolerance} 平方米`,
          })
          checkResults.push({
            checkName: '面缝隙检查',
            errorClass: 'C',
            objectId: `${bbA.featureId}-${bbB.featureId}`,
            description: `面要素 ${bbA.featureId} 与 ${bbB.featureId} 缝隙面积 ${gapArea.toFixed(6)} 平方米超过容差 ${tolerance} 平方米`,
            policyBasis: config.polygonGap.policyBasis,
          })
        }
      }
    }
  }

  private checkDuplicateCollection(
    features: GeoFeature[],
    config: GeoTopologyConfig,
    duplicateCollections: { featureId: string; description: string }[],
    checkResults: QualityCheckResult[],
  ): void {
    const maxDuplicate = config.duplicateCollection.maxDuplicateCount
    const featureKeyMap = new Map<string, string[]>()

    for (const feature of features) {
      const key = this.generateFeatureKey(feature)
      const existing = featureKeyMap.get(key) ?? []
      existing.push(feature.featureId)
      featureKeyMap.set(key, existing)
    }

    for (const [, featureIds] of featureKeyMap) {
      if (featureIds.length > maxDuplicate) {
        for (const featureId of featureIds) {
          duplicateCollections.push({
            featureId,
            description: `要素 ${featureId} 重复采集 ${featureIds.length} 次，超过阈值 ${maxDuplicate}`,
          })
          checkResults.push({
            checkName: '重复采集检查',
            errorClass: 'B',
            objectId: featureId,
            description: `要素 ${featureId} 重复采集 ${featureIds.length} 次，超过阈值 ${maxDuplicate}`,
            policyBasis: config.duplicateCollection.policyBasis,
          })
        }
      }
    }
  }

  private generateFeatureKey(feature: GeoFeature): string {
    const geom = feature.geometry
    const coordsStr = JSON.stringify(geom.coordinates)
    return `${geom.type}|${coordsStr}`
  }

  private calculateBoundingBoxes(
    features: GeoFeature[],
  ): { featureId: string; minX: number; minY: number; maxX: number; maxY: number }[] {
    const boxes: { featureId: string; minX: number; minY: number; maxX: number; maxY: number }[] = []

    for (const feature of features) {
      const coords = feature.geometry.coordinates
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      const points = this.extractAllPoints(coords)
      for (const pt of points) {
        if (pt[0]! < minX) minX = pt[0]!
        if (pt[1]! < minY) minY = pt[1]!
        if (pt[0]! > maxX) maxX = pt[0]!
        if (pt[1]! > maxY) maxY = pt[1]!
      }

      if (minX !== Infinity) {
        boxes.push({ featureId: feature.featureId, minX, minY, maxX, maxY })
      }
    }

    return boxes
  }

  private extractAllPoints(coords: unknown): number[][] {
    const points: number[][] = []
    if (!Array.isArray(coords)) return points

    if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      points.push(coords as number[])
      return points
    }

    for (const item of coords) {
      points.push(...this.extractAllPoints(item))
    }

    return points
  }

  private calculateBoundingBoxOverlap(
    a: { minX: number; minY: number; maxX: number; maxY: number },
    b: { minX: number; minY: number; maxX: number; maxY: number },
  ): number {
    const overlapX = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX))
    const overlapY = Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY))
    return overlapX * overlapY
  }

  private calculateBoundingBoxGap(
    a: { minX: number; minY: number; maxX: number; maxY: number },
    b: { minX: number; minY: number; maxX: number; maxY: number },
  ): number {
    const gapX = Math.max(0, Math.max(a.minX, b.minX) - Math.min(a.maxX, b.maxX))
    const gapY = Math.max(0, Math.max(a.minY, b.minY) - Math.min(a.maxY, b.maxY))
    const overlapX = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX))
    const overlapY = Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY))
    if (gapX > 0 && overlapY > 0) {
      return gapX * overlapY
    }
    if (gapY > 0 && overlapX > 0) {
      return gapY * overlapX
    }
    return 0
  }
}