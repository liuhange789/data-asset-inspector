export interface Anomaly {
  line: number
  reason: string
}

export interface AnomalyDetectResult {
  anomalies: Anomaly[]
  totalCount: number
}

export class AnomalyDetector {
  detect(lines: string[], maxDisplay = 5): AnomalyDetectResult {
    const allAnomalies: Anomaly[] = []

    lines.forEach((line, index) => {
      if (line.length < 3) {
        allAnomalies.push({ line: index + 1, reason: '内容过短' })
      }
      if (line.includes('null') || line.includes('NULL')) {
        allAnomalies.push({ line: index + 1, reason: '包含null值' })
      }
    })

    return {
      anomalies: allAnomalies.slice(0, maxDisplay),
      totalCount: allAnomalies.length,
    }
  }
}
