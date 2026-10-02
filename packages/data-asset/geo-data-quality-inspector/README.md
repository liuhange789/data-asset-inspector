# @liuhange/dsh-geo-data-quality-inspector

地理空间数据质量检测插件。依据GB/T 24356-2023与GB/T 35644-2017，检测高程中误差、平面位置精度、接边精度、拓扑关系（伪节点/悬挂点/面重叠/面缝隙）、逻辑一致性，支持Shapefile/GeoJSON/RFC 7946格式，DSM/DEM加权评分。

## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-geo-data-quality-inspector
```

## 用法

```javascript
import { apply } from '@liuhange/dsh-geo-data-quality-inspector';
apply(ctx); // 注册工具: inspect_geo_data_quality
```

## 法规依据

| 文件名称 | 文号 | 核心条款摘要 |
|---------|------|------------|
| 测绘成果质量检查与验收 | GB/T 24356-2023 | 质量元素、高程中误差、平面位置精度 |
| 地理空间数据质量评价 | GB/T 35644-2017 | 接边精度、拓扑关系、逻辑一致性 |

## License

MIT

## 兼容性

- DSH Runtime: ^4.0.0
- Node.js: 22+
- TypeScript: 5.7