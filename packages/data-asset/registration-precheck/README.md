# @liuhange/dsh-registration-precheck

登记预检插件：在数据资产体检完成后，自动检查数据是否满足国家数据产权登记条件。


## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-registration-precheck
```

## 功能说明

依据《数据产权登记工作指引（试行）》（国数综政策〔2026〕35号）规定的不予登记情形，执行四项检查：
1. 国家安全检查：数据是否涉及敏感领域
2. 来源合规检查：复用脱敏模块来源合法性声明
3. 权属纠纷检查：读取企业权属确认结果
4. 材料真实性承诺：提示企业如实填报

输出《登记预检报告》，明确告知"可以申请登记"或"暂不满足登记条件"。

## 依赖

- `@liuhange/dsh-data-asset-shared: ^3.0.0`
- `@deepseek-ai/cordis: ^4.0.0`
- `@deepseek-ai/dsh-tools: 0.0.1-rc.1`

## 安装

```bash
npm install @liuhange/dsh-registration-precheck
```