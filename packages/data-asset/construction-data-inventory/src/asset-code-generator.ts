import type { AssetCodeGenerateResult, EncodingRuleConfig, UnifiedAssetItem } from './types.js'
import { POLICY_STANDARD_NAME } from './invariant.js'
import { SequentialCodeAllocator } from './sequential-code-allocator.js'
import { ChecksumCalculator } from './checksum-calculator.js'
import { CodeUniquenessValidator } from './code-uniqueness-validator.js'

export interface AssetCodeGenerationResult {
  assets: UnifiedAssetItem[]
  errors: string[]
  warnings: string[]
  overflowAssets: string[]
}

export class AssetCodeGenerator {
  private readonly checksumCalculator: ChecksumCalculator
  private readonly uniquenessValidator: CodeUniquenessValidator

  constructor() {
    this.checksumCalculator = new ChecksumCalculator()
    this.uniquenessValidator = new CodeUniquenessValidator()
  }

  generate(classifiedAssets: UnifiedAssetItem[], encodingRuleConfig: EncodingRuleConfig): AssetCodeGenerationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const overflowAssets: string[] = []
    const policyBasis = `依据：${POLICY_STANDARD_NAME}编码规则`

    const allocator = new SequentialCodeAllocator(encodingRuleConfig)
    this.uniquenessValidator.clear()

    if (!encodingRuleConfig.checksumAlgorithm || encodingRuleConfig.checksumAlgorithm.trim() === '') {
      errors.push('校验位算法配置缺失，终止编码生成')
      for (const asset of classifiedAssets) {
        asset.assetCode = ''
      }
      return { assets: classifiedAssets, errors, warnings, overflowAssets }
    }

    for (const asset of classifiedAssets) {
      if (!asset.classificationCode || asset.classificationCode.trim() === '') {
        continue
      }

      const classificationLevelCode = this.padToLength(
        asset.classificationCode,
        encodingRuleConfig.classificationCodeLength,
      )

      const sequentialCode = allocator.allocate()
      if (sequentialCode === null) {
        errors.push(`顺序码溢出，资产 ${asset.assetId} 编码生成失败`)
        overflowAssets.push(asset.assetId)
        asset.assetCode = ''
        continue
      }
      const sequentialCodeStr = this.padToLength(
        String(sequentialCode),
        encodingRuleConfig.sequentialCodeLength,
      )

      let checksum: string
      try {
        checksum = this.checksumCalculator.calculate(
          classificationLevelCode + sequentialCodeStr,
          encodingRuleConfig.checksumAlgorithm,
        )
      } catch (e) {
        errors.push(`校验位计算失败: ${(e as Error).message}`)
        asset.assetCode = ''
        continue
      }

      const assetCode = classificationLevelCode + sequentialCodeStr + checksum

      if (!this.uniquenessValidator.validate(assetCode)) {
        errors.push(`编码重复: ${assetCode}`)
        asset.assetCode = ''
        continue
      }

      asset.assetCode = assetCode
      asset.policyBasis = policyBasis
    }

    return { assets: classifiedAssets, errors, warnings, overflowAssets }
  }

  regenerateForAsset(asset: UnifiedAssetItem, encodingRuleConfig: EncodingRuleConfig): AssetCodeGenerationResult {
    const originalAssetCode = asset.assetCode
    const result = this.generate([asset], encodingRuleConfig)
    if (result.assets[0] && result.assets[0]!.assetCode) {
      result.assets[0]!.originalAssetCode = originalAssetCode
    }
    return result
  }

  generateSingleCode(classificationCode: string, sequentialCode: number, encodingRuleConfig: EncodingRuleConfig): AssetCodeGenerateResult {
    const policyBasis = `依据：${POLICY_STANDARD_NAME}编码规则`
    const classificationLevelCode = this.padToLength(
      classificationCode,
      encodingRuleConfig.classificationCodeLength,
    )
    const sequentialCodeStr = this.padToLength(
      String(sequentialCode),
      encodingRuleConfig.sequentialCodeLength,
    )
    const checksum = this.checksumCalculator.calculate(
      classificationLevelCode + sequentialCodeStr,
      encodingRuleConfig.checksumAlgorithm,
    )
    const assetCode = classificationLevelCode + sequentialCodeStr + checksum
    return { assetCode, policyBasis }
  }

  private padToLength(value: string, length: number): string {
    if (value.length >= length) {
      return value.slice(0, length)
    }
    return value.padStart(length, '0')
  }
}