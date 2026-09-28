export interface UnmatchedWarning {
  type: 'UNMATCHED_ITEM_TYPE'
  guideId: string
  message: string
}

export const UnmatchedWarningBuilder = {
  build(guideId: string): UnmatchedWarning {
    return {
      type: 'UNMATCHED_ITEM_TYPE',
      guideId,
      message: '该事项未匹配到检测规则，语义检测被跳过',
    }
  },
}