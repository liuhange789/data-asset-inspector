# @liuhange/gov-config-schema

政务数据巡检配置包 JSON Schema — 供配置包维护者离线校验配置包内容。

## 基本信息

| 项目 | 值 |
|------|-----|
| 包名 | @liuhange/gov-config-schema |
| 版本 | 2026.1.0 |
| Schema 标准 | JSON Schema Draft 2020-12 |

## 用法

```bash
npm install @liuhange/gov-config-schema
```

导入 Schema 定义：

```javascript
import schema from '@liuhange/gov-config-schema';
// schema 为 JSON Schema Draft 2020-12 格式对象
```

## 与插件的关系

本包的 `config-pack-schema.json` 与插件 `@liuhange/dsh-gov-data-inspector` 内嵌的 Schema 保持同步。配置包维护者可独立安装本包进行离线校验，无需安装完整插件。

## License

MIT