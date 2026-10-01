import type { QualityElementConfig } from '../src/types.js'

export function createQualityElementConfig(): QualityElementConfig {
  return {
    version: '1.0.0',
    lastUpdated: '2026-10-01',
    qualityElements: {
      description: '建筑数据资产六类质量元素及权重，等权配置',
      elements: [
        { elementName: '空间参考系', weight: 0.1667, keywords: ['坐标系', '高程基准'], policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.1条' },
        { elementName: '位置精度', weight: 0.1667, keywords: ['接边', '坐标偏差'], policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.2条' },
        { elementName: '逻辑一致性', weight: 0.1667, keywords: ['重复', '孤立', '连通', '缺坐标', '构件', '属性', '字段', '楼层', '空间', '关联'], policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.3条' },
        { elementName: '时间精度', weight: 0.1667, keywords: ['时间', '进度'], policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.4条' },
        { elementName: '栅格质量', weight: 0.1666, keywords: ['栅格'], policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.5条' },
        { elementName: '附件质量', weight: 0.1666, keywords: ['附件', '文档'], policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6.6条' },
      ],
      policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第6章',
    },
    errorClassThresholds: {
      description: 'A/B/C/D错误分类扣分阈值，A类最严重',
      classAScoreDeduction: 1.0,
      classBScoreDeduction: 0.6,
      classCScoreDeduction: 0.3,
      classDScoreDeduction: 0.1,
      policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第7.2条',
    },
    qualityGradeThresholds: {
      description: '质量等级划分阈值，合格分下限',
      excellentMinScore: 90,
      goodMinScore: 80,
      qualifiedMinScore: 70,
      policyBasis: '依据：《测绘成果质量检查与验收》（GB/T 24356-2023）第8.1条',
    },
  }
}