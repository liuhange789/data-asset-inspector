import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { TRIGGERS } from './config.js'
import type { NormalTestDataSets, InvalidTestDataSets, TestDataFiles, InvalidTestDataSpec, Trigger } from './types.js'

export async function generateNormal(sandboxDir: string): Promise<NormalTestDataSets> {
  const baseDir = resolve(sandboxDir, 'testdata', 'normal')
  mkdirSync(baseDir, { recursive: true })

  const sets: Partial<NormalTestDataSets> = {}

  const attestationDir = resolve(baseDir, 'attestation')
  mkdirSync(attestationDir, { recursive: true })
  const attestationData = JSON.stringify({
    dimensions: [
      { dimension: 'completeness', score: 85, issues: [] },
      { dimension: 'accuracy', score: 90, issues: [] },
      { dimension: 'consistency', score: 88, issues: [] },
      { dimension: 'timeliness', score: 92, issues: [] },
      { dimension: 'uniqueness', score: 95, issues: [] },
      { dimension: 'normativity', score: 87, issues: [] },
    ],
    timestamp: new Date().toISOString(),
  })
  writeFileSync(resolve(attestationDir, 'quality-score-result.json'), attestationData)
  sets['数据鉴证'] = { inputFiles: [{ path: resolve(attestationDir, 'quality-score-result.json'), description: '六维质量评分结果' }] }

  const aiDir = resolve(baseDir, 'ai-dataset')
  mkdirSync(aiDir, { recursive: true })
  const trainingData = JSON.stringify([
    { id: 't001', label: 'positive', annotation1: 'A', annotation2: 'A', text: '样本1' },
    { id: 't002', label: 'negative', annotation1: 'B', annotation2: 'B', text: '样本2' },
    { id: 't003', label: 'positive', annotation1: 'A', annotation2: 'A', text: '样本3' },
    { id: 't004', label: 'negative', annotation1: 'B', annotation2: 'B', text: '样本4' },
  ])
  writeFileSync(resolve(aiDir, 'training.json'), trainingData)
  sets['AI数据集体检'] = { inputFiles: [{ path: resolve(aiDir, 'training.json'), description: 'AI训练数据集' }] }

  const govDir = resolve(baseDir, 'gov-data')
  mkdirSync(govDir, { recursive: true })
  const govData = JSON.stringify([
    { name: '营业执照办理', timeLimit: '5工作日', onlineCapable: true, requiredElements: ['申请表', '身份证明', '场地证明'] },
    { name: '社保登记', timeLimit: '3工作日', onlineCapable: true, requiredElements: ['申请表', '身份证明'] },
  ])
  writeFileSync(resolve(govDir, 'guides.json'), govData)
  sets['政务数据巡检'] = { inputFiles: [{ path: resolve(govDir, 'guides.json'), description: '政务办事指南数据' }] }

  const circDir = resolve(baseDir, 'circulation')
  mkdirSync(circDir, { recursive: true })
  const circData = JSON.stringify({ datasetId: 'ds-001', targetSpace: 'enterprise', complianceResultRef: null })
  writeFileSync(resolve(circDir, 'circulation-input.json'), circData)
  sets['数据可流通性评估'] = { inputFiles: [{ path: resolve(circDir, 'circulation-input.json'), description: '可流通性评估输入' }] }

  const cityDir = resolve(baseDir, 'city-data')
  mkdirSync(cityDir, { recursive: true })
  const cityData = JSON.stringify([
    { name: '人口统计', type: 'structured', fields: ['district', 'population', 'year'] },
    { name: '交通流量', type: 'semi-structured', fields: ['road', 'volume', 'timestamp'] },
  ])
  writeFileSync(resolve(cityDir, 'assets.json'), cityData)
  sets['城市数据分类'] = { inputFiles: [{ path: resolve(cityDir, 'assets.json'), description: '城市数据资产目录' }] }

  return sets as NormalTestDataSets
}

export async function generateInvalid(sandboxDir: string): Promise<InvalidTestDataSets> {
  const baseDir = resolve(sandboxDir, 'testdata', 'invalid')
  mkdirSync(baseDir, { recursive: true })

  const sets: Partial<InvalidTestDataSets> = {}

  sets['数据鉴证'] = {
    trigger: '数据鉴证',
    kind: 'nonexistent-path',
    path: resolve(baseDir, 'nonexistent-attestation.json'),
    expectedFailStep: 'score_data_quality',
  }

  const emptyPath = resolve(baseDir, 'empty-ai.json')
  writeFileSync(emptyPath, '')
  sets['AI数据集体检'] = {
    trigger: 'AI数据集体检',
    kind: 'empty-file',
    path: emptyPath,
    expectedFailStep: 'mask_sensitive_data',
  }

  const corruptedPath = resolve(baseDir, 'corrupted-gov.json')
  writeFileSync(corruptedPath, '{invalid json!!!')
  sets['政务数据巡检'] = {
    trigger: '政务数据巡检',
    kind: 'corrupted-format',
    path: corruptedPath,
    expectedFailStep: 'scan_inventory',
  }

  const missingFieldPath = resolve(baseDir, 'missing-field-circ.json')
  writeFileSync(missingFieldPath, JSON.stringify({ targetSpace: 'enterprise' }))
  sets['数据可流通性评估'] = {
    trigger: '数据可流通性评估',
    kind: 'missing-required-field',
    path: missingFieldPath,
    expectedFailStep: 'check_compliance',
  }

  const emptyCityPath = resolve(baseDir, 'empty-city.json')
  writeFileSync(emptyCityPath, '[]')
  sets['城市数据分类'] = {
    trigger: '城市数据分类',
    kind: 'empty-file',
    path: emptyCityPath,
    expectedFailStep: 'scan_inventory',
  }

  return sets as InvalidTestDataSets
}