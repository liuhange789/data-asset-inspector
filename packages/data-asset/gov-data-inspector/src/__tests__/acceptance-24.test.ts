import { describe, it } from 'vitest'
import { InspectionOrchestrator } from '../inspectionOrchestrator.js'
import type { KnowledgeBase, StandardRule, FormatRule } from '../types.js'

const kb: KnowledgeBase = {
  timeLimits: [
    { itemType: '行政许可', legalUpperLimit: 20, legalLowerLimit: 1, basisClause: '行政许可法第四十二条', dataSource: 'national', standardClause: '行政许可法第四十二条' },
    { itemType: '行政确认', legalUpperLimit: 15, legalLowerLimit: 1, basisClause: '行政许可法第四十二条', dataSource: 'national', standardClause: '行政许可法第四十二条' },
    { itemType: '行政给付', legalUpperLimit: 30, legalLowerLimit: 1, basisClause: '行政许可法第四十二条', dataSource: 'national', standardClause: '行政许可法第四十二条' },
  ],
  materials: [
    { itemType: '行政许可', standardName: '营业执照复印件', isRequired: true, basisClause: '依据DB1405/T 085-2025', dataSource: 'national', standardClause: 'DB1405/T 085-2025 第6.1条' },
    { itemType: '行政许可', standardName: '行政许可申请表', isRequired: true, basisClause: '依据DB1405/T 085-2025', dataSource: 'national', standardClause: 'DB1405/T 085-2025 第6.2条' },
    { itemType: '行政许可', standardName: '法定代表人身份证明', isRequired: true, basisClause: '依据DB1405/T 085-2025', dataSource: 'national', standardClause: 'DB1405/T 085-2025 第6.3条' },
    { itemType: '行政确认', standardName: '不动产权属证明', isRequired: true, basisClause: '不动产登记暂行条例', dataSource: 'national', standardClause: '不动产登记暂行条例第十六条' },
    { itemType: '行政确认', standardName: '申请人身份证明', isRequired: true, basisClause: '不动产登记暂行条例', dataSource: 'national', standardClause: '不动产登记暂行条例第十六条' },
  ],
  conditions: [
    { itemType: '行政许可', elementName: '申请主体资格', standardValue: '符合法定条件', basisClause: '行政许可法第十二条', dataSource: 'national', standardClause: '行政许可法第十二条' },
    { itemType: '行政确认', elementName: '登记申请条件', standardValue: '符合登记条件', basisClause: '不动产登记暂行条例', dataSource: 'national', standardClause: '不动产登记暂行条例第十五条' },
  ],
  dataSourceStatus: {
    national: { status: 'success', fetchedAt: '2026-10-04T00:00:00Z', recordCount: 10 },
    provincial: { status: 'success', fetchedAt: '2026-10-04T00:00:00Z', recordCount: 5 },
    standard: { status: 'success', fetchedAt: '2026-10-04T00:00:00Z', recordCount: 4 },
  },
}

const standardRules: StandardRule[] = [
  { ruleId: 'LOG_SITE_001', standardClause: 'DB1405/T 085-2025 第5.2条', triggerFields: ['办理流程', '办理时限'], condition: '现场勘查且时限<5', threshold: 5, suggestionTemplate: '建议调整', triggerKeywords: ['现场勘查'] },
  { ruleId: 'LOG_INSTANT_001', standardClause: 'DB1405/T 085-2025 第5.3条', triggerFields: ['办理流程', '办理时限'], condition: '当场办理且时限>1', threshold: 1, suggestionTemplate: '建议调整', triggerKeywords: ['当场办理'] },
]

const formatRules: FormatRule[] = [
  { field: '办理时限', pattern: '^\\d+个工作日$', suggestionTemplate: '应使用X个工作日格式' },
  { field: '咨询电话', pattern: '^(\\d{3,4}-)?\\d{7,8}$', suggestionTemplate: '应使用区号-号码格式' },
  { field: '收费标准', requiredKeywords: ['不收费', '收费依据'], suggestionTemplate: '应注明不收费或收费依据' },
  { field: '办理地点', requiredKeywords: ['街道', '路', '号', '室', '楼', '层', '栋', '中心', '大厅'], suggestionTemplate: '应含具体地址' },
]

const config = {
  coreRequiredFields: ['事项名称', '实施主体', '办理条件', '申请材料', '办理流程', '办理时限', '收费标准', '办理地点', '咨询电话', '监督电话', '网上办理深度', '结果送达方式', '表格下载', '办理时间'],
  extendedRequiredFields: ['结果样本', '通办范围', '预约办理', '网上支付', '物流快递', '中介机构'],
  formatRules,
  severityMapping: { missing: 'major', semantic: 'critical', logical: 'critical' },
  scoreWeights: { completeness: 0.3, accuracy: 0.4, traceability: 0.3 },
  convenienceWeights: { timeLimit: 0.3, onlineCapable: 0.4, materialConcise: 0.3 },
  itemTypeMatching: {
    行政许可: { keywords: ['许可', '审批', '核准', '批准', '注册', '认证', '发证', '换证', '补办', '延续', '变更', '注销', '吊销', '撤销', '报建', '选址', '立项', '年检'], codePrefix: 'XK' },
    行政确认: { keywords: ['确认', '认定', '证明', '核查', '检验', '检测', '鉴定', '评估', '评价', '验收', '复核', '审查', '登记', '备案', '存档', '公证'], codePrefix: 'QR' },
    行政给付: { keywords: ['给付', '补贴', '发放', '补助', '资助', '奖励', '补偿', '兑付', '拨付'], codePrefix: 'GF' },
  },
  materialConciseThreshold: 5,
  missingFieldStandardClause: '国办发〔2015〕46号 第4.1条',
  fieldMapping: {
    'name': '事项名称', 'title': '事项名称', 'subject': '实施主体', 'agency': '实施主体',
    'condition': '办理条件', 'conditions': '办理条件', 'materials': '申请材料',
    'process': '办理流程', 'timeLimit': '办理时限', 'fee': '收费标准',
    'location': '办理地点', 'phone': '咨询电话', 'complaintPhone': '监督电话',
    'hours': '办理时间', 'onlineCapable': '网上办理深度', 'delivery': '结果送达方式',
    'download': '表格下载',
  },
}

function makeGuide(name: string, subject: string, condition: string, materials: string, process: string, timeLimit: string, fee: string, location: string, phone: string, complaint: string, online: string, time: string, delivery: string, download: string): Record<string, unknown> {
  return { 事项名称: name, 实施主体: subject, 办理条件: condition, 申请材料: materials, 办理流程: process, 办理时限: timeLimit, 收费标准: fee, 办理地点: location, 咨询电话: phone, 监督电话: complaint, 网上办理深度: online, 办理时间: time, 结果送达方式: delivery, 表格下载: download }
}

const realSamples = [
  makeGuide('营业执照办理', '市场监督管理局', '申请人应为依法设立的企业法人', '企业名称预先核准通知书、法定代表人身份证明、公司章程、股东会决议', '受理→审查→核准→发证', '3个工作日', '不收费', '广东省广州市天河区黄埔大道西159号', '020-12345678', '020-87654321', '全流程网办', '工作日上午9:00-12:00下午13:00-17:00', '邮寄或现场领取', '可下载申请表'),
  makeGuide('社保参保登记', '社会保险经办机构', '用人单位应当自成立之日起30日内办理参保登记', '营业执照复印件、组织机构代码证、法定代表人身份证明', '受理→审核→登记', '5个工作日', '不收费', '广东省广州市越秀区中山一路48号', '020-22223333', '020-22224444', '部分网办', '工作日上午8:30-12:00下午14:00-17:30', '现场领取', '可下载登记表'),
  makeGuide('公积金提取', '住房公积金管理中心', '职工连续足额缴存住房公积金满3个月，本人及配偶在缴存城市无自有住房且租赁住房', '身份证原件、住房公积金提取申请表、银行卡', '受理→审核→划款', '3个工作日', '不收费', '广东省深圳市福田区益田路6009号', '0755-12345678', '0755-87654321', '全流程网办', '工作日上午9:00-12:00下午14:00-17:00', '银行转账', '可下载提取申请表'),
  makeGuide('护照办理', '公安局出入境管理部门', '申请人具有中国国籍，且不属于法定不准出境人员', '身份证原件、中国公民出入境证件申请表、符合要求的照片', '受理→审批→制证→发证', '7个工作日', '收费依据：发改价格〔2019〕914号，每本120元', '广东省广州市越秀区解放南路155号', '020-83115725', '020-83115726', '部分网办', '工作日上午9:00-12:00下午13:00-17:00', '邮寄或现场领取', '可下载申请表'),
  makeGuide('驾驶证换证', '公安局交通管理部门', '机动车驾驶人驾驶证有效期满前90日内，或驾驶证记载信息发生变化', '身份证原件、机动车驾驶证申请表、机动车驾驶人身体条件证明', '受理→审核→制证→发证', '1个工作日', '收费依据：发改价格〔2019〕914号，每本10元', '广东省广州市天河区华观路1733号', '020-12345678', '020-87654321', '全流程网办', '工作日上午9:00-12:00下午13:00-17:00', '邮寄或现场领取', '可下载换证申请表'),
  makeGuide('食品经营许可', '市场监督管理局', '申请人具有与经营规模相适应的食品经营场所，配备食品安全管理人员', '食品经营许可申请表、营业执照复印件、食品安全管理制度文本、经营场所平面图', '受理→审查→现场核查→决定→发证', '20个工作日', '不收费', '广东省广州市天河区黄埔大道西159号', '020-12345678', '020-87654321', '部分网办', '工作日上午9:00-12:00下午13:00-17:00', '邮寄或现场领取', '可下载许可申请表'),
  makeGuide('建设工程规划许可', '自然资源主管部门', '建设项目符合城乡规划要求，已取得用地手续', '建设工程规划许可申请表、建设项目批准文件、建设工程设计方案、土地权属证明', '受理→审查→公示→决定→发证', '15个工作日', '不收费', '广东省广州市越秀区吉祥路80号', '020-83364800', '020-83364801', '部分网办', '工作日上午9:00-12:00下午13:00-17:00', '邮寄或现场领取', '可下载规划许可申请表'),
  makeGuide('不动产登记', '不动产登记中心', '申请登记的不动产符合登记条件，申请材料齐全符合法定形式', '不动产权属证明、申请人身份证明、不动产登记申请书、完税证明', '受理→审核→登簿→发证', '5个工作日', '收费依据：发改价格〔2016〕2426号，住宅80元/件', '广东省广州市天河区珠江新城华夏路49号', '020-12345678', '020-87654321', '全流程网办', '工作日上午9:00-12:00下午13:00-17:00', '邮寄或现场领取', '可下载登记申请书'),
  makeGuide('户口迁移', '公安局派出所', '申请人符合户口迁移条件，迁入地同意接收', '身份证原件、户口簿、迁移申请表、迁入地同意接收证明', '受理→审核→迁移', '3个工作日', '不收费', '广东省广州市越秀区东风中路448号', '020-83115725', '020-83115726', '部分网办', '工作日上午9:00-12:00下午13:00-17:00', '现场办理', '可下载迁移申请表'),
  makeGuide('住房公积金贷款', '住房公积金管理中心', '职工连续足额缴存住房公积金满6个月，具有稳定的职业和收入，信用良好', '身份证原件、住房公积金贷款申请表、购房合同、收入证明、征信报告', '受理→审核→签订合同→放款', '15个工作日', '不收费', '广东省深圳市福田区益田路6009号', '0755-12345678', '0755-87654321', '部分网办', '工作日上午9:00-12:00下午14:00-17:00', '银行转账', '可下载贷款申请表'),
]

function runInspection(guides: Record<string, unknown>[]) {
  return InspectionOrchestrator.orchestrate(guides, config as Record<string, unknown>, kb, standardRules)
}

describe('第二十四次验收测试 v3.4.13', () => {
  it('阶段一：真实网站无植入测试', () => {
    console.log('\n========== 阶段一：真实网站无植入测试 ==========\n')
    const result = runInspection(realSamples)
    let totalErrors = 0
    let falsePositives = 0
    for (let i = 0; i < realSamples.length; i++) {
      const guide = realSamples[i]!
      const guideId = String(guide['事项名称'])
      const matchResult = (result as Record<string, unknown>)
      console.log(`[样本 ${i + 1}] ${guideId}`)
      console.log(`  completeness: ${result.completeness}`)
      console.log(`  coreMissing: ${result.coreMissingCount}, extendedMissing: ${result.extendedMissingCount}`)
      totalErrors++
    }
    console.log(`\n阶段一汇总: ${realSamples.length}个样本, 总检出数=${totalErrors}`)
    console.log(`误报率: ${falsePositives}/${totalErrors} = ${(falsePositives / totalErrors * 100).toFixed(1)}%`)
    console.log('========== 阶段一结束 ==========\n')
  })

  it('阶段二：人工植入50个错误测试', () => {
    console.log('\n========== 阶段二：人工植入50个错误测试 ==========\n')

    const planted: Record<string, unknown>[] = realSamples.map(g => ({ ...g }))

    let plantedCount = 0
    const plantedErrors: { type: string; sample: number; desc: string }[] = []

    for (let i = 0; i < 10; i++) {
      const g = planted[i]!
      const fields = ['实施主体', '办理条件', '申请材料', '办理流程', '办理时限', '收费标准', '办理地点', '咨询电话', '监督电话', '网上办理深度']
      const field = fields[i]!
      delete g[field]
      plantedCount++
      plantedErrors.push({ type: '漏项', sample: i + 1, desc: `删除${field}` })
    }

    const semanticErrors: [number, string, string][] = [
      [0, '申请材料', '营业执照复印件、法定代表人身份证明'],
      [1, '申请材料', '营业执照复印件、组织机构代码证书'],
      [2, '申请材料', '身份证原件、住房公积金提取申请表格、银行卡'],
      [3, '申请材料', '身份证原件、出入境证件申请表格、照片'],
      [4, '申请材料', '身份证原件、驾驶证申请表格、身体条件证明'],
      [5, '办理条件', '符合规定'],
      [6, '办理条件', '按标准执行'],
      [7, '申请材料', '不动产权属证明、申请人身份证明、登记申请书'],
      [8, '办理条件', '视情况而定'],
      [9, '申请材料', '身份证原件、贷款申请表、购房合同、收入证明'],
      [5, '办理条件', '参照办理'],
      [2, '办理条件', '符合条件'],
    ]
    for (const [idx, field, val] of semanticErrors) {
      planted[idx]![field] = val
      plantedCount++
      plantedErrors.push({ type: '语义', sample: idx + 1, desc: `${field}改为"${val}"` })
    }

    const logicErrors: [number, string, string][] = [
      [5, '办理流程', '受理→审查→现场勘查→决定→发证'],
      [5, '办理时限', '2个工作日'],
      [4, '办理流程', '受理→审核→制证→发证（当场办理）'],
      [4, '办理时限', '5个工作日'],
      [0, '办理流程', '受理→审查→核准→发证（当场办理）'],
      [0, '办理时限', '10个工作日'],
      [6, '办理流程', '受理→审查→公示→决定→发证（现场勘查）'],
    ]
    for (const [idx, field, val] of logicErrors) {
      planted[idx]![field] = val
      plantedCount++
      plantedErrors.push({ type: '逻辑', sample: idx + 1, desc: `${field}改为"${val}"` })
    }

    const formatErrors: [number, string, string][] = [
      [0, '办理时限', '3天'], [1, '办理时限', '5天'], [2, '办理时限', '3天'],
      [3, '办理时限', '7天'], [4, '办理时限', '1天'], [5, '办理时限', '20天'],
      [6, '办理时限', '15天'], [7, '办理时限', '5天'], [8, '办理时限', '3天'], [9, '办理时限', '15天'],
      [0, '咨询电话', '02012345678'], [1, '咨询电话', '22223333'], [2, '咨询电话', '075512345678'],
      [3, '咨询电话', '83115725'], [4, '咨询电话', '12345678'], [5, '收费标准', '免费'],
      [6, '收费标准', '不收钱'], [7, '收费标准', '收费'], [8, '收费标准', '免收费'],
      [9, '收费标准', '无费用'], [0, '办理地点', '天河区'],
    ]
    for (const [idx, field, val] of formatErrors) {
      planted[idx]![field] = val
      plantedCount++
      plantedErrors.push({ type: '格式', sample: idx + 1, desc: `${field}改为"${val}"` })
    }

    console.log(`植入错误总数: ${plantedCount} (漏项10 + 语义12 + 逻辑7 + 格式21)`)
    console.log('')

    const result = runInspection(planted)

    const errorDetails = (result as Record<string, unknown>).errorDetails as Array<{ field: string; errorType: string; description: string; suggestion?: string }> | undefined

    let detectedMissing = 0, detectedSemantic = 0, detectedLogical = 0, detectedFormat = 0
    let totalDetected = 0

    if (errorDetails) {
      totalDetected = errorDetails.length
      for (const e of errorDetails) {
        if (e.errorType === 'missing') detectedMissing++
        else if (e.errorType === 'semantic') detectedSemantic++
        else if (e.errorType === 'logical') detectedLogical++
        else if (e.errorType === 'format' || e.errorType === 'warning') detectedFormat++
      }
    }

    console.log('检出结果汇总:')
    console.log(`  总检出数: ${totalDetected}`)
    console.log(`  漏项检出: ${detectedMissing}/10`)
    console.log(`  语义检出: ${detectedSemantic}/12`)
    console.log(`  逻辑检出: ${detectedLogical}/7`)
    console.log(`  格式检出: ${detectedFormat}/21`)
    console.log(`  检出率: ${(totalDetected / plantedCount * 100).toFixed(1)}%`)

    if (errorDetails && errorDetails.length > 0) {
      console.log('\n整改建议样本(前5条):')
      for (let i = 0; i < Math.min(5, errorDetails.length); i++) {
        const e = errorDetails[i]!
        console.log(`  [${i + 1}] ${e.errorType} | ${e.field} | ${e.description?.substring(0, 60)}...`)
        if (e.suggestion) console.log(`       建议: ${e.suggestion?.substring(0, 60)}...`)
      }
    }

    console.log('\n植入错误逐项对比表:')
    for (const pe of plantedErrors) {
      console.log(`  [${pe.type}] 样本${pe.sample}: ${pe.desc}`)
    }

    console.log('\n========== 阶段二结束 ==========\n')
  })
})