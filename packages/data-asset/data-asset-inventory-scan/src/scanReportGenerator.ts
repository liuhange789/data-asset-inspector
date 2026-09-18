import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AssetItem, ScanReport } from './types.js'
import type { PolicyDocument } from '@liuhange/dsh-data-asset-shared'

export class ScanReportGenerator {
  constructor(private policyDocuments: PolicyDocument[]) {}

  generate(
    assetItems: AssetItem[],
    scanSource: string,
    sourceType: 'directory' | 'database',
    outputPathDir?: string,
  ): ScanReport {
    if (!this.policyDocuments || this.policyDocuments.length === 0) {
      throw new Error('POLICY_REFERENCES_EMPTY: policy documents must not be empty')
    }
    for (const doc of this.policyDocuments) {
      if (!doc.name || doc.name === '依据文件待补充') {
        throw new Error(`POLICY_REFERENCE_PLACEHOLDER: ${doc.name || 'undefined'}`)
      }
    }

    const report: ScanReport = {
      assetItems,
      scanSource,
      sourceType,
      policyReferences: this.policyDocuments,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    }

    if (outputPathDir) {
      const outputPath = join(outputPathDir, 'scan-report.json')
      writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8')
    }

    return report
  }

  formatPolicyReference(doc: PolicyDocument): string {
    return `依据：《${doc.name}》（${doc.docNumber}）——${doc.coreRequirement}`
  }
}