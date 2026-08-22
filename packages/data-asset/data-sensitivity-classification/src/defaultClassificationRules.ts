import type { SensitivityClassificationConfig } from '@liuhange/dsh-data-asset-shared'

export const defaultClassificationRules: SensitivityClassificationConfig = {
  fieldNameRules: [
    { name: 'idCard', pattern: 'id_?card|身份证|identity', level: 'Secret' },
    { name: 'phone', pattern: 'phone|手机|mobile|tel', level: 'Confidential' },
    { name: 'email', pattern: 'email|邮箱|mail', level: 'Confidential' },
    { name: 'bankCard', pattern: 'bank_?card|银行卡|account', level: 'Secret' },
    { name: 'address', pattern: 'address|地址|addr', level: 'Internal' },
    { name: 'name', pattern: '^name$|姓名|username', level: 'Internal' },
    { name: 'public', pattern: 'status|type|category|label|tag|level', level: 'Public' },
  ],
  fieldValueRules: [
    { name: 'idCardValue', pattern: '[1-9]\\d{5}(18|19|20)?\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]', level: 'Secret' },
    { name: 'phoneValue', pattern: '1[3-9]\\d{9}', level: 'Confidential' },
    { name: 'emailValue', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', level: 'Confidential' },
    { name: 'bankCardValue', pattern: '[1-9]\\d{15,18}', level: 'Secret' },
  ],
  levelMapping: {
    Public: 'none',
    Internal: 'partial',
    Confidential: 'full',
    Secret: 'encrypt',
  },
  defaultLevel: 'Internal',
}