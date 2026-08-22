import type { VisualizationConfig } from '@liuhange/dsh-data-asset-shared'

export const defaultVisualizationConfig: VisualizationConfig = {
  charts: {
    bar: { enabled: true, title: '脱敏统计' },
    comparison: { enabled: true, title: '清洗前后对比' },
    pie: { enabled: true, title: '数据资产分布' },
    radar: { enabled: true, title: '质量评分' },
    flowchart: { enabled: true, title: '血缘追踪' },
  },
  layout: {
    columns: 2,
    responsive: true,
  },
  colorScheme: {
    primary: '#4A90D9',
    secondary: '#F5A623',
    success: '#7ED321',
    warning: '#F8E71C',
    danger: '#D0021B',
    background: '#F5F5F5',
    text: '#333333',
  },
  interactions: {
    expandCollapse: true,
    chartSwitch: true,
    tooltip: true,
  },
  templateVersion: '1.0',
}