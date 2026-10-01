import type {
  GeoDataset,
  GeoAccuracyConfig,
  GridParameterResult,
  QualityCheckResult,
} from './types.js'

export class GridParameterChecker {
  check(
    dataset: GeoDataset,
    config: GeoAccuracyConfig,
  ): GridParameterResult {
    const checkResults: QualityCheckResult[] = []
    const sameNameElevationMismatches: { cellIdA: string; cellIdB: string; description: string }[] = []
    const gridSpacingViolations: { cellId: string; description: string }[] = []

    const gridParam = dataset.gridParameter
    if (gridParam === undefined) {
      return { sameNameElevationMismatches, gridSpacingViolations, checkResults }
    }

    const tolerance = config.gridParameter.sameNameElevationToleranceMeter
    const expectedSpacing = config.gridParameter.gridSpacingMeter

    const cellMap = new Map<string, { cellId: string; x: number; y: number; elevation: number }[]>()
    for (const cell of gridParam.cells) {
      const key = `${cell.x}|${cell.y}`
      const existing = cellMap.get(key) ?? []
      existing.push(cell)
      cellMap.set(key, existing)
    }

    for (const [key, cells] of cellMap) {
      if (cells.length > 1) {
        for (let i = 0; i < cells.length; i++) {
          for (let j = i + 1; j < cells.length; j++) {
            const cellA = cells[i]!
            const cellB = cells[j]!
            const elevationDiff = Math.abs(cellA.elevation - cellB.elevation)
            if (elevationDiff > tolerance) {
              sameNameElevationMismatches.push({
                cellIdA: cellA.cellId,
                cellIdB: cellB.cellId,
                description: `同名格网点 (${key}) 高程值差异 ${elevationDiff.toFixed(4)} 米超过容差 ${tolerance} 米`,
              })
              checkResults.push({
                checkName: '同名格网高程值检查',
                errorClass: 'B',
                objectId: `${cellA.cellId}-${cellB.cellId}`,
                description: `同名格网点 (${key}) 高程值差异 ${elevationDiff.toFixed(4)} 米超过容差 ${tolerance} 米`,
                policyBasis: config.gridParameter.policyBasis,
              })
            }
          }
        }
      }
    }

    for (const cell of gridParam.cells) {
      if (Math.abs(cell.gridSpacing - expectedSpacing) > 1e-9) {
        gridSpacingViolations.push({
          cellId: cell.cellId,
          description: `格网点 ${cell.cellId} 格网间距 ${cell.gridSpacing} 米与配置间距 ${expectedSpacing} 米不一致`,
        })
        checkResults.push({
          checkName: '格网参数检查',
          errorClass: 'C',
          objectId: cell.cellId,
          description: `格网点 ${cell.cellId} 格网间距 ${cell.gridSpacing} 米与配置间距 ${expectedSpacing} 米不一致`,
          policyBasis: config.gridParameter.policyBasis,
        })
      }
    }

    return { sameNameElevationMismatches, gridSpacingViolations, checkResults }
  }
}