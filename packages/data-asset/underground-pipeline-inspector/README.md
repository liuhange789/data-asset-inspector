# @liuhange/dsh-underground-pipeline-inspector

地下管线数据质量检测插件。依据GB/T 35644-2017、GB/T 29806-2013、CJJ 61-2017、CJJ 68-2016，检测覆盖率、接边精度、拓扑关系、流向合理性、空间参考系、粗差率评分，服务于城市地下管线探测与政府采购数据验收。

## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-underground-pipeline-inspector
```

## 用法

```javascript
import { apply } from '@liuhange/dsh-underground-pipeline-inspector';
apply(ctx); // 注册工具: inspect_pipeline_data_quality
```

## 法规依据

| 文件名称 | 文号 | 核心条款摘要 |
|---------|------|------------|
| 地理空间数据质量评价 | GB/T 35644-2017 | 接边精度、拓扑关系、粗差率 |
| 城市地下管线探测技术规程 | CJJ 61-2017 | 管线探测、属性完整性 |
| 地下管线数据交换技术要求 | CJJ 68-2016 | 数据格式、空间参考系 |

## License

MIT

## 兼容性

- DSH Runtime: ^4.0.0
- Node.js: 22+
- TypeScript: 5.7