import * as fs from 'fs'
import * as path from 'path'
import type { ProductManual, PackagingRules, DataFormat } from '@liuhange/dsh-data-asset-shared'
import { ReportGenerator } from '@liuhange/dsh-data-asset-shared'
import { SampleExtractor } from './sampleExtractor.js'
import { ComplianceGenerator } from './complianceGenerator.js'

export interface ManualGenerateParams {
  dataPath: string
  productName: string
  description?: string
  packagingRules: PackagingRules
  format: DataFormat
}

export class ManualGenerator {
  private readonly sampleExtractor = new SampleExtractor()
  private readonly complianceGenerator = new ComplianceGenerator()
  private readonly reportGenerator = new ReportGenerator()

  async generate(params: ManualGenerateParams): Promise<{ manual: ProductManual; text: string }> {
    const fullPath = path.resolve(params.dataPath)
    const stats = fs.statSync(fullPath)
    const readResult = await this.sampleExtractor.extract(fullPath, 5)

    const lines = await this.readFileLines(fullPath)
    const recordCount = lines.length

    const usageScenario = params.description ?? params.packagingRules.defaultDescription ?? ''
    const complianceStatements = this.complianceGenerator.generate(params.packagingRules)

    const pricingSuggestion = this.matchPricingSuggestion(params.packagingRules)

    const manual: ProductManual = {
      productName: params.productName,
      version: params.packagingRules.version,
      generatedDate: new Date().toISOString().split('T')[0] ?? '',
      dataOverview: {
        sourceFile: path.basename(fullPath),
        recordCount,
        fileSizeKb: stats.size / 1024,
        format: params.format,
      },
      sampleLines: readResult,
      usageScenario,
      complianceStatements,
      pricingSuggestion,
    }

    const text = this.reportGenerator.generatePackagingManual({ productManual: manual })

    return { manual, text }
  }

  private async readFileLines(filePath: string): Promise<string[]> {
    const content = fs.readFileSync(filePath, 'utf-8')
    return content.split('\n').filter(l => l.trim())
  }

  private matchPricingSuggestion(rules: PackagingRules): string {
    if (rules.pricingRules.length > 0) {
      return rules.pricingRules[2]?.suggestion ?? rules.pricingRules[0]?.suggestion ?? ''
    }
    return '根据数据质量、稀缺性和应用场景综合定价'
  }
}
