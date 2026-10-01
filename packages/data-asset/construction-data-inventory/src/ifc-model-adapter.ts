import { readFileSync } from 'node:fs'
import type { IfcEntityRecord, IfcParseResult, UnifiedAssetItem } from './types.js'
import { IFC_ENTITY_TYPES, SUPPORTED_IFC_VERSIONS } from './invariant.js'
import type { SourceAdapter } from './source-adapter.js'

export class IfcModelAdapter implements SourceAdapter {
  adapt(sourcePath: string, systemId: string, projectId: string): {
    assets: UnifiedAssetItem[]
    warnings: string[]
    errors: string[]
  } {
    const assets: UnifiedAssetItem[] = []
    const warnings: string[] = []
    const errors: string[] = []

    let content: string
    try {
      content = readFileSync(sourcePath, 'utf-8')
    } catch (e) {
      errors.push(`IFC文件读取失败: ${sourcePath} - ${(e as Error).message}`)
      return { assets, warnings, errors }
    }

    const parseResult = this.parseIfc(content, sourcePath)
    warnings.push(...parseResult.warnings)
    errors.push(...parseResult.errors)

    const collectionTime = new Date().toISOString()
    for (const entity of parseResult.entities) {
      const dataType = this.mapEntityTypeToDataType(entity.entityType)
      if (dataType === '') {
        warnings.push(`构件类型 ${entity.entityType} 不支持，已跳过 (line=${entity.lineId})`)
        continue
      }
      assets.push({
        assetId: `IFC-${entity.guid || entity.lineId}`,
        sourceSystemId: systemId,
        dataType,
        projectId,
        collectionTime,
        classificationCode: '',
        assetCode: '',
        judgmentStatus: '自动判定',
      })
    }

    return { assets, warnings, errors }
  }

  parseIfc(content: string, filePath: string): IfcParseResult {
    const entities: IfcEntityRecord[] = []
    const warnings: string[] = []
    const errors: string[] = []
    let version = ''

    const lines = content.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line === undefined) continue
      const trimmed = line.trim()
      if (trimmed === '') continue

      if (trimmed.startsWith('FILE_DESCRIPTION')) {
        const versionMatch = trimmed.match(/'([^']+)'/)
        if (versionMatch && versionMatch[1]) {
          const rawVersion = versionMatch[1].toUpperCase()
          if (SUPPORTED_IFC_VERSIONS.some((v) => rawVersion.includes(v))) {
            version = SUPPORTED_IFC_VERSIONS.find((v) => rawVersion.includes(v)) ?? ''
          } else {
            version = rawVersion
          }
        }
        continue
      }

      const entityMatch = trimmed.match(/^#(\d+)\s*=\s*([A-Z0-9]+)\s*\((.*)\)\s*;?\s*$/)
      if (!entityMatch) {
        if (trimmed.startsWith('#')) {
          errors.push(`IFC格式不合法: ${filePath} line=${i + 1}`)
        }
        continue
      }

      const lineId = parseInt(entityMatch[1]!, 10)
      const entityType = entityMatch[2]!
      const argsStr = entityMatch[3] ?? ''

      if (!IFC_ENTITY_TYPES.includes(entityType as (typeof IFC_ENTITY_TYPES)[number])) {
        warnings.push(`构件类型 ${entityType} 不支持，已跳过 (line=${i + 1})`)
        continue
      }

      const guid = this.extractGuid(argsStr)
      const attributes = this.extractAttributes(argsStr)
      entities.push({ lineId, entityType, guid, attributes })
    }

    if (version === '') {
      version = 'IFC2X3'
      warnings.push('未检测到IFC版本，默认按IFC2X3解析')
    }

    return { entities, warnings, errors, version }
  }

  private extractGuid(argsStr: string): string {
    const guidMatch = argsStr.match(/^'([^']*)'/)
    return guidMatch && guidMatch[1] ? guidMatch[1] : ''
  }

  private extractAttributes(argsStr: string): string[] {
    const attributes: string[] = []
    let depth = 0
    let current = ''
    for (const char of argsStr) {
      if (char === '(') {
        depth++
        if (depth === 1) continue
      }
      if (char === ')') {
        depth--
        if (depth === 0) {
          attributes.push(current)
          current = ''
          continue
        }
      }
      if (depth >= 1) {
        current += char
      } else if (char === ',') {
        if (current.trim() !== '') {
          attributes.push(current.trim())
        }
        current = ''
      } else {
        current += char
      }
    }
    if (current.trim() !== '') {
      attributes.push(current.trim())
    }
    return attributes
  }

  private mapEntityTypeToDataType(entityType: string): string {
    const mapping: Record<string, string> = {
      IFCWALL: 'BIM构件-元素',
      IFCWALLSTANDARDCASE: 'BIM构件-元素',
      IFCCOLUMN: 'BIM构件-元素',
      IFCCOLUMNSTANDARDCASE: 'BIM构件-元素',
      IFCSLAB: 'BIM构件-元素',
      IFCSLABSTANDARDCASE: 'BIM构件-元素',
      IFCDOOR: 'BIM构件-元素',
      IFCWINDOW: 'BIM构件-元素',
      IFCBEAM: 'BIM构件-元素',
      IFCBEAMSTANDARDCASE: 'BIM构件-元素',
      IFCFOOTING: 'BIM构件-元素',
      IFCSTAIR: 'BIM构件-元素',
      IFCSTAIRFLIGHT: 'BIM构件-元素',
      IFCRAILING: 'BIM构件-元素',
      IFCCURTAINWALL: 'BIM构件-元素',
      IFCROOF: 'BIM构件-元素',
      IFCSPACE: 'BIM构件-建筑空间',
      IFCBUILDINGSTOREY: 'BIM构件-建筑物',
      IFCBUILDING: 'BIM构件-建筑物',
      IFCSITE: 'BIM构件-建筑物',
      IFCPROPERTYSET: '属性数据',
    }
    return mapping[entityType] ?? ''
  }
}