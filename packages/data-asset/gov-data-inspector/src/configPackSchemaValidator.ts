export interface SchemaError {
  path: string
  message: string
}

export interface SchemaValidationResult {
  valid: boolean
  errors: SchemaError[]
}

const REQUIRED_TOP_FIELDS = [
  'configPackId',
  'region',
  'configPackVersion',
  'policyBasis',
  'requiredFields',
  'formatRules',
  'localStandardTerms',
  'logicErrorRules',
  'scoringWeights',
  'itemTypeMatching',
  'severityMapping',
  'gbtMapping',
  'dataSourceCredentials',
  'dataSourcePriority',
] as const

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

function isString(val: unknown): val is string {
  return typeof val === 'string'
}

function isNumber(val: unknown): val is number {
  return typeof val === 'number'
}

function isArray(val: unknown): val is unknown[] {
  return Array.isArray(val)
}

function checkRegexSafety(pattern: string): boolean {
  if (/\([^)]*\+\)[+*]/.test(pattern)) return false
  if (/\([^)]*\*\)[+*]/.test(pattern)) return false
  if (/\(\?:[^)]*\)[+*]{2,}/.test(pattern)) return false
  if (/\[[^\]]*\*\]\[[^\]]*\*\]/.test(pattern)) return false
  if (/\[[^\]]*\+\]\[[^\]]*\+\]/.test(pattern)) return false
  try {
    new RegExp(pattern)
  } catch {
    return false
  }
  return true
}

export const ConfigPackSchemaValidator = {
  validate(pack: unknown): SchemaValidationResult {
    const errors: SchemaError[] = []

    if (!isObject(pack)) {
      return { valid: false, errors: [{ path: '', message: '配置包应为对象' }] }
    }

    for (const field of REQUIRED_TOP_FIELDS) {
      if (pack[field] === undefined || pack[field] === null) {
        errors.push({ path: field, message: `必填字段 "${field}" 缺失` })
      }
    }

    if (isString(pack.configPackId)) {
      if (!/^([a-z]{2}-[a-z]+-\d{4})|default$/.test(pack.configPackId)) {
        errors.push({ path: 'configPackId', message: 'configPackId 应匹配 ^[a-z]{2}-[a-z]+-\\d{4}$ 或为 default' })
      }
    }

    if (isString(pack.region) && pack.region.length < 2) {
      errors.push({ path: 'region', message: 'region 长度应不少于 2' })
    }

    if (isString(pack.configPackVersion)) {
      if (!/^\d+\.\d+\.\d+$/.test(pack.configPackVersion)) {
        errors.push({ path: 'configPackVersion', message: 'configPackVersion 应匹配 ^\\d+\\.\\d+\\.\\d+$' })
      }
    }

    if (isArray(pack.policyBasis)) {
      if (pack.policyBasis.length < 1) {
        errors.push({ path: 'policyBasis', message: 'policyBasis 应至少含 1 个条目' })
      }
      for (let i = 0; i < pack.policyBasis.length; i++) {
        const doc = pack.policyBasis[i]
        if (!isObject(doc)) {
          errors.push({ path: `policyBasis[${i}]`, message: '应为对象' })
          continue
        }
        for (const f of ['name', 'docNumber', 'coreRequirement'] as const) {
          if (!isString(doc[f]) || (doc[f] as string).length < 1) {
            errors.push({ path: `policyBasis[${i}].${f}`, message: `应为非空字符串` })
          }
        }
      }
    }

    if (isArray(pack.requiredFields) && pack.requiredFields.length < 1) {
      errors.push({ path: 'requiredFields', message: 'requiredFields 应至少含 1 个条目' })
    }

    if (isArray(pack.formatRules)) {
      for (let i = 0; i < pack.formatRules.length; i++) {
        const rule = pack.formatRules[i]
        if (!isObject(rule)) {
          errors.push({ path: `formatRules[${i}]`, message: '应为对象' })
          continue
        }
        if (!isString(rule.field)) {
          errors.push({ path: `formatRules[${i}].field`, message: '应为字符串' })
        }
        if (!isString(rule.suggestionTemplate)) {
          errors.push({ path: `formatRules[${i}].suggestionTemplate`, message: '应为字符串' })
        }
        if (isString(rule.pattern)) {
          if (!checkRegexSafety(rule.pattern)) {
            errors.push({ path: `formatRules[${i}].pattern`, message: `正则 "${rule.pattern}" 不安全（可能引发 ReDoS）` })
          }
        }
      }
    }

    if (isObject(pack.localStandardTerms)) {
      if (!isArray(pack.localStandardTerms.materials)) {
        errors.push({ path: 'localStandardTerms.materials', message: '应为数组' })
      }
      if (!isArray(pack.localStandardTerms.conditions)) {
        errors.push({ path: 'localStandardTerms.conditions', message: '应为数组' })
      }
    }

    if (isArray(pack.logicErrorRules)) {
      for (let i = 0; i < pack.logicErrorRules.length; i++) {
        const rule = pack.logicErrorRules[i]
        if (!isObject(rule)) {
          errors.push({ path: `logicErrorRules[${i}]`, message: '应为对象' })
          continue
        }
        if (!isString(rule.ruleId)) {
          errors.push({ path: `logicErrorRules[${i}].ruleId`, message: '应为字符串' })
        }
        if (!isString(rule.standardClause)) {
          errors.push({ path: `logicErrorRules[${i}].standardClause`, message: '应为字符串' })
        }
        if (!isArray(rule.triggerFields)) {
          errors.push({ path: `logicErrorRules[${i}].triggerFields`, message: '应为数组' })
        }
        if (!isArray(rule.triggerKeywords)) {
          errors.push({ path: `logicErrorRules[${i}].triggerKeywords`, message: '应为数组' })
        }
      }
    }

    if (isObject(pack.scoringWeights)) {
      const sw = pack.scoringWeights
      const completeness = isNumber(sw.completeness) ? sw.completeness : NaN
      const accuracy = isNumber(sw.accuracy) ? sw.accuracy : NaN
      const traceability = isNumber(sw.traceability) ? sw.traceability : NaN
      if (isNaN(completeness) || isNaN(accuracy) || isNaN(traceability)) {
        errors.push({ path: 'scoringWeights', message: 'completeness/accuracy/traceability 应为数字' })
      } else {
        const sum = completeness + accuracy + traceability
        if (Math.abs(sum - 1) > 0.001) {
          errors.push({ path: 'scoringWeights', message: `三权重之和应为 1，实际为 ${sum}` })
        }
      }
    }

    if (isObject(pack.itemTypeMatching)) {
      if (Object.keys(pack.itemTypeMatching).length < 1) {
        errors.push({ path: 'itemTypeMatching', message: '应至少含 1 个条目' })
      }
    }

    if (isObject(pack.severityMapping)) {
      const validValues = ['critical', 'major', 'minor']
      for (const [key, val] of Object.entries(pack.severityMapping)) {
        if (!validValues.includes(val as string)) {
          errors.push({ path: `severityMapping.${key}`, message: `应为 critical/major/minor，实际为 ${val}` })
        }
      }
    }

    if (isObject(pack.gbtMapping) && Object.keys(pack.gbtMapping).length < 1) {
      errors.push({ path: 'gbtMapping', message: '应至少含 1 个条目' })
    }

    if (isObject(pack.dataSourceCredentials)) {
      const ds = pack.dataSourceCredentials
      for (const src of ['national', 'provincial', 'standard'] as const) {
        if (!isObject(ds[src])) {
          errors.push({ path: `dataSourceCredentials.${src}`, message: '应为对象' })
        }
      }
    }

    if (isArray(pack.dataSourcePriority)) {
      if (pack.dataSourcePriority.length < 1) {
        errors.push({ path: 'dataSourcePriority', message: '应至少含 1 个条目' })
      }
      for (let i = 0; i < pack.dataSourcePriority.length; i++) {
        if (!['national', 'provincial'].includes(pack.dataSourcePriority[i] as string)) {
          errors.push({ path: `dataSourcePriority[${i}]`, message: '应为 national 或 provincial' })
        }
      }
    }

    return { valid: errors.length === 0, errors }
  },

  checkRegexSafety(pattern: string): boolean {
    return checkRegexSafety(pattern)
  },
}