interface FixSuggestionEntry {
  readonly phenomenonPattern: RegExp
  readonly possibleCause: string
  readonly fixSuggestion: string
}

const KNOWLEDGE_BASE: readonly FixSuggestionEntry[] = [
  {
    phenomenonPattern: /DSH.*not.*found|npx.*failed|dsh.*not.*installed/i,
    possibleCause: 'DSH CLI 未安装或 npx 无法解析 @deepseek-ai/dsh',
    fixSuggestion: '执行 npm install -g @deepseek-ai/dsh 或确保 npx 可访问 npm registry',
  },
  {
    phenomenonPattern: /ECONNREFUSED|ENOTFOUND|network.*unreachable/i,
    possibleCause: '网络不可达，无法访问 npm registry 或 DSH API',
    fixSuggestion: '检查网络连接和代理配置，确保 registry.npmjs.org 可达',
  },
  {
    phenomenonPattern: /SANDBOX_INSIDE_REPO/i,
    possibleCause: '临时沙箱目录创建在仓库路径内',
    fixSuggestion: '确保 os.tmpdir() 返回的路径不在仓库根目录下',
  },
  {
    phenomenonPattern: /DSH_START_TIMEOUT|DSH_START_FAILED/i,
    possibleCause: 'DSH Web 环境启动超时或进程退出',
    fixSuggestion: '检查 Node.js 版本 >=22，确认 DSH 依赖完整安装，查看 stderr 日志',
  },
  {
    phenomenonPattern: /PACKAGE_INSTALL_FAILED/i,
    possibleCause: 'npm 包安装失败，可能版本不存在或依赖冲突',
    fixSuggestion: '确认包版本已发布到 npm，检查 peerDependencies 兼容性',
  },
  {
    phenomenonPattern: /INSTALL_ORDER_VIOLATION/i,
    possibleCause: '包安装顺序不符合依赖要求',
    fixSuggestion: 'shared 必须第一个安装，orchestration 必须最后安装',
  },
  {
    phenomenonPattern: /NPM_REGISTRY_UNREACHABLE/i,
    possibleCause: 'npm registry 不可达，重试后仍失败',
    fixSuggestion: '检查网络连接，确认 npm registry 配置正确',
  },
  {
    phenomenonPattern: /peerDependency.*warning|peer.*dep/i,
    possibleCause: 'peerDependency 版本不匹配',
    fixSuggestion: '检查 @deepseek-ai/cordis 和 @deepseek-ai/dsh-tools 版本兼容性',
  },
  {
    phenomenonPattern: /plugin.*not.*visible|not.*in.*list/i,
    possibleCause: '插件未在 DSH 插件列表中显示',
    fixSuggestion: '确认 dsh plugin add 命令成功执行，检查插件 apply 函数无异常',
  },
  {
    phenomenonPattern: /TOOL_NOT_FOUND|tool.*not.*registered/i,
    possibleCause: '工具名未注册',
    fixSuggestion: '确认插件 apply(ctx) 正确调用 ctx.tools.register，检查工具名拼写',
  },
  {
    phenomenonPattern: /failed.*to.*load|load.*error/i,
    possibleCause: '插件加载时抛出异常',
    fixSuggestion: '查看 DSH 启动日志，确认插件导出的 name/inject/apply 符合规范',
  },
  {
    phenomenonPattern: /CHAIN_NOT_FOUND|trigger.*not.*matched/i,
    possibleCause: '触发词未匹配到链路',
    fixSuggestion: '确认 vertical-chains.json 中包含该触发词，检查 execute_vertical_chain 工具参数',
  },
  {
    phenomenonPattern: /TOOL_EXECUTION_ERROR/i,
    possibleCause: '链路环节工具执行失败',
    fixSuggestion: '查看工具执行错误信息，确认输入参数正确',
  },
  {
    phenomenonPattern: /checkpoint.*missing|field.*not.*present/i,
    possibleCause: '输出报告缺少检查点字段',
    fixSuggestion: '确认插件输出包含预期字段，检查 policyBasis 是否正确解析',
  },
  {
    phenomenonPattern: /field.*empty|null.*value/i,
    possibleCause: '检查点字段存在但值为空',
    fixSuggestion: '确认工具执行成功且有有效输出，检查数据源是否有效',
  },
  {
    phenomenonPattern: /step.*order.*wrong|环节.*乱序/i,
    possibleCause: '链路环节执行顺序与预期不符',
    fixSuggestion: '检查 vertical-chains.json 中 chain 数组顺序',
  },
  {
    phenomenonPattern: /continued.*after.*failure|失败后继续/i,
    possibleCause: '环节失败后链路未停止',
    fixSuggestion: '确认 verticalChainExecutor 在 catch 块中返回 VerticalChainFailureResult',
  },
  {
    phenomenonPattern: /failure.*structure.*missing|failed.*field.*missing/i,
    possibleCause: '失败返回结构缺少 trigger/completed/failed/error/completedAt 字段',
    fixSuggestion: '确认 VerticalChainFailureResult 接口定义完整且 executor 正确构造返回值',
  },
  {
    phenomenonPattern: /completed.*array.*wrong/i,
    possibleCause: 'completed 数组内容与实际已完成环节不符',
    fixSuggestion: '确认 executor 在成功时 push 工具名到 completed 数组',
  },
  {
    phenomenonPattern: /policyBasis.*missing|政策依据.*缺失/i,
    possibleCause: '输出报告缺少 policyBasis 字段',
    fixSuggestion: '确认 resolvePolicyBasis 被调用且 stage 参数正确',
  },
  {
    phenomenonPattern: /文件名称.*简写|name.*abbreviated/i,
    possibleCause: '政策依据文件名称被简写，缺少"关于""暂行"等',
    fixSuggestion: '确认 policy-references.json 中 name 字段为完整文件名',
  },
  {
    phenomenonPattern: /文号.*方括号|docNumber.*bracket/i,
    possibleCause: '文号使用了方括号[]而非六角括号〔〕',
    fixSuggestion: '确认 policy-references.json 中 docNumber 使用〔〕格式',
  },
  {
    phenomenonPattern: /条款摘要.*缺失|coreRequirement.*missing/i,
    possibleCause: '政策依据缺少核心条款摘要',
    fixSuggestion: '确认 policy-references.json 中 coreRequirement 字段非空',
  },
  {
    phenomenonPattern: /政策依据.*遗漏|policy.*missing/i,
    possibleCause: '部分政策依据未在报告中出现',
    fixSuggestion: '确认所有 stage 的 policyBasis 均被调用，检查 policy-references.json 完整性',
  },
  {
    phenomenonPattern: /npm.*page.*inaccessible|页面.*不可访问/i,
    possibleCause: 'npm 包页面不可访问',
    fixSuggestion: '确认包已发布且为 public access，检查 npm registry 状态',
  },
  {
    phenomenonPattern: /version.*mismatch|latest.*不一致/i,
    possibleCause: 'npm latest 版本与预期发布版本不一致',
    fixSuggestion: '确认 npm publish 成功，检查 dist-tags.latest 是否指向正确版本',
  },
  {
    phenomenonPattern: /metadata.*missing|元数据.*缺失/i,
    possibleCause: 'npm 包元数据缺失',
    fixSuggestion: '确认 package.json 中 description/repository/homepage 字段完整',
  },
]

export function matchFixSuggestion(errorPhenomenon: string): { possibleCause: string; fixSuggestion: string } | null {
  for (const entry of KNOWLEDGE_BASE) {
    if (entry.phenomenonPattern.test(errorPhenomenon)) {
      return { possibleCause: entry.possibleCause, fixSuggestion: entry.fixSuggestion }
    }
  }
  return null
}