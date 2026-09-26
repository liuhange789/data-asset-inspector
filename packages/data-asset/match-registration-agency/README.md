# @liuhange/dsh-match-registration-agency

登记机构匹配插件：根据数据类型推荐登记机构。


## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-match-registration-agency
```

## 功能说明

全国仅3家登记机构：
- 金融/征信/支付 → 上海数据交易所（金融数据交易活跃度最高）
- 医疗/健康/生物 → 北京国际大数据交易所（医疗数据登记案例集中）
- 交通/物流/地理 → 深圳数据交易所（交通数据登记案例较多）
- 其他 → 建议咨询专业机构

## 依赖

- `@liuhange/dsh-data-asset-shared: ^3.0.0`
- `@deepseek-ai/cordis: ^4.0.0`
- `@deepseek-ai/dsh-tools: 0.0.1-rc.1`

## 安装

```bash
npm install @liuhange/dsh-match-registration-agency
```