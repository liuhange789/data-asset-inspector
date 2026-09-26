import type { RootCause, BugFixItem } from '../types/index.js';

export class GuidanceGenerator {
  generateBugFixList(rootCauses: readonly RootCause[]): readonly BugFixItem[] {
    const fixes: BugFixItem[] = [];
    for (const rc of rootCauses) {
      if (!rc.actionable || !rc.fixId) continue;
      const fixId: string = rc.fixId;
      fixes.push(this.createFixItem(rc, fixId));
    }
    return fixes;
  }

  private createFixItem(rc: RootCause, fixId: string): BugFixItem {
    const layerSpecific = this.getLayerSpecific(rc.layer, fixId);
    return {
      id: fixId,
      rootCauseId: rc.id,
      layer: rc.layer,
      priority: rc.priority,
      description: layerSpecific.description,
      verifyCommand: layerSpecific.verifyCommand,
      acceptanceCriteria: layerSpecific.acceptanceCriteria,
      autoFixScript: layerSpecific.autoFixScript,
    };
  }

  private getLayerSpecific(
    layer: RootCause['layer'],
    fixId: string,
  ): {
    description: string;
    verifyCommand: string;
    acceptanceCriteria: string;
    autoFixScript: string | null;
  } {
    if (layer === 'OFFICIAL') {
      return {
        description: `向 dshplugin 官方提交 issue 申请处理: ${fixId}`,
        verifyCommand: 'visibility-doctor verify --probe-hit',
        acceptanceCriteria: '官方侧问题已解决',
        autoFixScript: this.generateIssueTemplate(fixId),
      };
    }
    if (layer === 'PLUGIN') {
      return {
        description: `修复插件侧问题: ${fixId}`,
        verifyCommand: 'visibility-doctor diagnose --packages <all>',
        acceptanceCriteria: '插件侧问题已修复',
        autoFixScript: 'npm version patch && npm publish',
      };
    }
    return {
      description: `补全市场建档信息: ${fixId}`,
      verifyCommand: 'visibility-doctor verify --market',
      acceptanceCriteria: '市场收录状态全部 LISTED',
      autoFixScript: null,
    };
  }

  private generateIssueTemplate(fixId: string): string {
    return `# Issue 模板: ${fixId}\n\n## 问题描述\n[请描述问题]\n\n## 期望行为\n[请描述期望的修复后行为]\n\n## 复现步骤\n1. [步骤1]\n2. [步骤2]`;
  }
}