import type { QualityScoringConfig } from '@liuhange/dsh-data-asset-shared'

export const defaultScoringRules: QualityScoringConfig = {
  weights: {
    completeness: 0.25,
    accuracy: 0.25,
    consistency: 0.25,
    timeliness: 0.25,
  },
  thresholds: {
    completeness: 60,
    accuracy: 60,
    consistency: 60,
    timeliness: 60,
  },
  completeness: {
    missingMarkers: ['null', 'undefined', 'N/A', '', 'NULL', 'NaN'],
  },
  accuracy: {
    formatRules: [
      { fieldName: 'phone', pattern: '1[3-9]\\d{9}', weight: 0.5 },
      { fieldName: 'email', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', weight: 0.5 },
    ],
    domainRules: [
      { fieldName: 'age', min: 0, max: 150, weight: 0.5 },
      { fieldName: 'score', min: 0, max: 100, weight: 0.5 },
    ],
  },
  consistency: {
    crossFieldRules: [
      { name: 'endDateAfterStartDate', fields: ['startDate', 'endDate'], constraint: 'after' },
    ],
  },
  timeliness: {
    timestampField: 'updatedAt',
    freshnessThresholdHours: 720,
  },
}