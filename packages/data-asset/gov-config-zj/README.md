# @liuhange/gov-config-zj

浙江省政务数据巡检配置包。

## 基本信息

| 项目 | 值 |
|------|-----|
| 包名 | @liuhange/gov-config-zj |
| 版本 | 2026.1.0 |
| 地区 | 浙江省 |
| configPackId | zj-gov-2026 |

## 用法

```bash
npm install @liuhange/gov-config-zj
```

设置环境变量：

```bash
export GOV_CONFIG_PACK_PACKAGE=@liuhange/gov-config-zj
```

## 内容

- 政策依据：含浙政办等浙江省地方政策文件
- 必填字段、格式规则、逻辑规则
- 标准词表（材料词 + 条件词）
- 数据源凭证与优先级（省级优先）

## 校验

使用 `@liuhange/gov-config-schema` 离线校验：

```bash
npx @liuhange/gov-config-schema config-pack.json
```

## License

MIT