# @liuhange/dsh-generate-registration-docs

登记材料生成插件：根据体检报告自动生成国家登记系统所需的申请材料。


## 安装

```bash
dsh plugin --profile web add @liuhange/dsh-generate-registration-docs
```

## 功能说明

生成三份登记申请材料：
1. 《数据描述》：从盘点报告和包装说明书提取数据集基本信息
2. 《来源合法性声明》：从脱敏报告提取来源声明
3. 《产权归属说明》：基于三权分置（持有权/加工使用权/经营权）

## 依赖

- `@liuhange/dsh-data-asset-shared: ^3.0.0`
- `@deepseek-ai/cordis: ^4.0.0`
- `@deepseek-ai/dsh-tools: 0.0.1-rc.1`

## 安装

```bash
npm install @liuhange/dsh-generate-registration-docs
```