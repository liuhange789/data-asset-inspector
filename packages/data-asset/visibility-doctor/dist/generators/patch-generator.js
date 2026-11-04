const HOMEPAGE_URL = 'https://github.com/liuhange789/data-asset-inspector#readme';
export class PatchGenerator {
    generatePackagePatch(packageName, currentMeta, gapResult) {
        const addedKeywords = Array.from(new Set(gapResult.suggested)).filter((k) => !currentMeta.keywords.includes(k));
        const addedHomepage = currentMeta.homepage ? null : HOMEPAGE_URL;
        const updatedDescription = this.enhanceDescription(currentMeta.description, packageName);
        const patchOps = [];
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
    generateAllPatches(packages) {
        return packages.map((p) => {
            const gapResult = {
                existing: p.keywords,
                missing: this.getMissingKeywords(p.keywords),
                suggested: Array.from(new Set([...p.keywords, ...this.getMissingKeywords(p.keywords)])),
            };
            return this.generatePackagePatch(p.name, p, gapResult);
        });
    }
    enhanceDescription(description, packageName) {
        const aliasName = this.getAliasName(packageName);
        if (!description) {
            return aliasName ? `DeepSeek Harness plugin. Also known as ${aliasName}.` : 'DeepSeek Harness plugin.';
        }
        if (aliasName && !description.includes(aliasName)) {
            return `${description} Also known as ${aliasName}.`;
        }
        return description;
    }
    getAliasName(packageName) {
        if (!packageName.startsWith('@liuhange/'))
            return null;
        const suffix = packageName.slice('@liuhange/'.length);
        return `@deepseek-ai/${suffix}`;
    }
    getMissingKeywords(existing) {
        const required = ['deepseek-harness', 'dsh-plugin', 'data-asset'];
        return required.filter((k) => !existing.includes(k));
    }
}
//# sourceMappingURL=patch-generator.js.map