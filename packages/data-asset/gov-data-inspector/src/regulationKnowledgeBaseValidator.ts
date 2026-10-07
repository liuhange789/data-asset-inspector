
export interface ValidationResult {
  valid: boolean
  errors: Array<{ path: string; message: string }>
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isClause(v: unknown): boolean {
  if (!isObject(v)) return false
  return typeof v.clauseId === 'string' && typeof v.clauseText === 'string' && Array.isArray(v.extractedRules) && typeof v.isCore === 'boolean'
}

export const RegulationKnowledgeBaseValidator = {
  validate(kb: unknown): ValidationResult {
    const errors: Array<{ path: string; message: string }> = []

    if (!isObject(kb)) {
      return { valid: false, errors: [{ path: 'root', message: '知识库根不是对象' }] }
    }

    const root = kb as Record<string, unknown>

    if (!Array.isArray(root.nationalLaws)) {
      errors.push({ path: 'nationalLaws', message: 'nationalLaws 不是数组' })
    } else if (root.nationalLaws.length < 4) {
      errors.push({ path: 'nationalLaws', message: `国家法律不足4部，当前${root.nationalLaws.length}部` })
    }

    if (!Array.isArray(root.nationalPolicies)) {
      errors.push({ path: 'nationalPolicies', message: 'nationalPolicies 不是数组' })
    } else if (root.nationalPolicies.length < 4) {
      errors.push({ path: 'nationalPolicies', message: `国务院文件不足4份，当前${root.nationalPolicies.length}份` })
    }

    if (!Array.isArray(root.nationalStandards)) {
      errors.push({ path: 'nationalStandards', message: 'nationalStandards 不是数组' })
    } else if (root.nationalStandards.length < 3) {
      errors.push({ path: 'nationalStandards', message: `国家标准不足3项，当前${root.nationalStandards.length}项` })
    }

    if (!Array.isArray(root.provincialStandards)) {
      errors.push({ path: 'provincialStandards', message: 'provincialStandards 不是数组' })
    }

    if (!Array.isArray(root.hotlineWhitelist)) {
      errors.push({ path: 'hotlineWhitelist', message: 'hotlineWhitelist 不是数组' })
    } else if (root.hotlineWhitelist.length < 15) {
      errors.push({ path: 'hotlineWhitelist', message: `热线白名单不足15项，当前${root.hotlineWhitelist.length}项` })
    }

    if (Array.isArray(root.hotlineWhitelist)) {
      for (let i = 0; i < root.hotlineWhitelist.length; i++) {
        const h = root.hotlineWhitelist[i] as Record<string, unknown>
        if (!isObject(h) || typeof h.hotline !== 'string' || typeof h.policyBasis !== 'string') {
          errors.push({ path: `hotlineWhitelist[${i}]`, message: '热线条目缺少 hotline 或 policyBasis' })
        }
      }
    }

    if (Array.isArray(root.nationalStandards)) {
      const gbt39554 = (root.nationalStandards as Array<Record<string, unknown>>).find((s) => s.standardNumber === 'GB/T 39554.2-2020')
      if (gbt39554 && (!Array.isArray(gbt39554.requiredElements) || gbt39554.requiredElements === undefined)) {
        errors.push({ path: 'nationalStandards[GB/T 39554.2-2020].requiredElements', message: 'requiredElements 缺失或非数组' })
      }
      const gbt36114 = (root.nationalStandards as Array<Record<string, unknown>>).find((s) => s.standardNumber === 'GB/T 36114-2018')
      if (gbt36114 && (!Array.isArray(gbt36114.serviceGuideElements) || gbt36114.serviceGuideElements === undefined)) {
        errors.push({ path: 'nationalStandards[GB/T 36114-2018].serviceGuideElements', message: 'serviceGuideElements 缺失或非数组' })
      }
      const gbt36344 = (root.nationalStandards as Array<Record<string, unknown>>).find((s) => s.standardNumber === 'GB/T 36344-2018')
      if (gbt36344 && (!Array.isArray(gbt36344.qualityDimensions) || gbt36344.qualityDimensions === undefined)) {
        errors.push({ path: 'nationalStandards[GB/T 36344-2018].qualityDimensions', message: 'qualityDimensions 缺失或非数组' })
      }
    }

    const allClauses: Array<{ path: string; clause: unknown }> = []
    for (const key of ['nationalLaws', 'nationalPolicies', 'nationalStandards', 'provincialStandards'] as const) {
      if (Array.isArray(root[key])) {
        for (let i = 0; i < root[key].length; i++) {
          const item = root[key][i] as Record<string, unknown>
          if (isObject(item) && Array.isArray(item.relevantClauses)) {
            for (let j = 0; j < item.relevantClauses.length; j++) {
              allClauses.push({ path: `${key}[${i}].relevantClauses[${j}]`, clause: item.relevantClauses[j] })
            }
          }
        }
      }
    }
    for (const { path, clause } of allClauses) {
      if (!isClause(clause)) {
        errors.push({ path, message: '条款结构不完整（缺 clauseId/clauseText/extractedRules/isCore）' })
      }
    }

    return { valid: errors.length === 0, errors }
  },
}