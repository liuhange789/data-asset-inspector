import type { VisualizationConfig } from '@liuhange/dsh-data-asset-shared'
import { defaultVisualizationConfig } from './defaultVisualizationConfig.js'

export class TemplateLoader {
  load(config: VisualizationConfig | undefined): VisualizationConfig {
    if (config) {
      return config
    }
    return defaultVisualizationConfig
  }
}