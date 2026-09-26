import type { PackagePatch, PackageMeta, KeywordsGapResult } from '../types/index.js';

const HOMEPAGE_URL = 'https://github.com/liuhange789/data-asset-inspector#readme';

export class PatchGenerator {
  generatePackagePatch(
    packageName: string,
    currentMeta: PackageMeta,
    gapResult: KeywordsGapResult,
  ): PackagePatch {
    const addedKeywords = Array.from(new Set(gapResult.suggested)).filter(
      (k) => !currentMeta.keywords.includes(k),
    );

    const addedHomepage = currentMeta.homepage ? null : HOMEPAGE_URL;

    const updatedDescription = this.enhanceDescription(currentMeta.description, packageName);

    const patchOps: JsonPatchOp[] = [];
    if (addedKeywords.length > 0) {
      patchOps.push({
        op: 'add',
        path: '/keywords',
        value: Array.from(new Set([...currentMeta.keywords, ...addedKeywords])),
      });
    }
    if (addedHomepage) {
      patchOps.push({ op: 'add', path: '/homepage', value: addedHomepage });
    }
    if (updatedDescription && updatedDescription !== currentMeta.description) {
      patchOps.push({ op: 'replace', path: '/description', value: updatedDescription });
    }

    return {
      packageName,
      patchContent: JSON.stringify(patchOps, null, 2),
      addedKeywords,
      addedHomepage,
      updatedDescription: updatedDescription !== currentMeta.description ? updatedDescription : null,
      isIdempotent: true,
    };
  }

  generateAllPatches(packages: readonly PackageMeta[]): readonly PackagePatch[] {
    return packages.map((p) => {
      const gapResult: KeywordsGapResult = {
        existing: p.keywords,
        missing: this.getMissingKeywords(p.keywords),
        suggested: Array.from(new Set([...p.keywords, ...this.getMissingKeywords(p.keywords)])),
      };
      return this.generatePackagePatch(p.name, p, gapResult);
    });
  }

  private enhanceDescription(description: string | null, packageName: string): string {
    const aliasName = this.getAliasName(packageName);
    if (!description) {
      return aliasName ? `DeepSeek Harness plugin. Also known as ${aliasName}.` : 'DeepSeek Harness plugin.';
    }
    if (aliasName && !description.includes(aliasName)) {
      return `${description} Also known as ${aliasName}.`;
    }
    return description;
  }

  private getAliasName(packageName: string): string | null {
    if (!packageName.startsWith('@liuhange/')) return null;
    const suffix = packageName.slice('@liuhange/'.length);
    return `@deepseek-ai/${suffix}`;
  }

  private getMissingKeywords(existing: readonly string[]): readonly string[] {
    const required = ['deepseek-harness', 'dsh-plugin', 'data-asset'];
    return required.filter((k) => !existing.includes(k));
  }
}

interface JsonPatchOp {
  readonly op: 'add' | 'replace' | 'remove';
  readonly path: string;
  readonly value?: unknown;
}