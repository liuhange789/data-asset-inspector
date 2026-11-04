import { readFile } from 'node:fs/promises';
const DEFAULT_WEIGHTS = {
    keywords: 25,
    readmeInstall: 20,
    topicsDoubleHit: 20,
    marketListed: 15,
    aliasDisplay: 10,
    repoNameMatch: 10,
};
export class ScoringCalculator {
    weights;
    constructor(weights) {
        this.weights = weights ?? DEFAULT_WEIGHTS;
    }
    static async fromConfigFile(configPath) {
        try {
            const content = await readFile(configPath, 'utf-8');
            const parsed = JSON.parse(content);
            return new ScoringCalculator(parsed);
        }
        catch {
            return new ScoringCalculator();
        }
    }
    scorePackage(input) {
        const subscores = [
            this.scoreDimension('KEYWORDS_HIT', input.keywordsHit, this.weights.keywords),
            this.scoreDimension('README_INSTALL_FORMAT', input.readmeInstallFormat, this.weights.readmeInstall),
            this.scoreDimension('TOPICS_DOUBLE_HIT', input.topicsDoubleHit, this.weights.topicsDoubleHit),
            this.scoreDimension('MARKET_LISTED', input.marketListed, this.weights.marketListed),
            this.scoreDimension('ALIAS_DISPLAY', input.aliasDisplay, this.weights.aliasDisplay),
            this.scoreDimension('REPO_NAME_MATCH', input.repoNameMatch, this.weights.repoNameMatch),
        ];
        const overallScore = subscores.reduce((sum, s) => sum + s.score, 0);
        return { packageName: input.packageName, overallScore, subscores };
    }
    scoreAll(packages) {
        return packages.map((p) => this.scorePackage(p));
    }
    scoreDimension(dimension, hit, maxScore) {
        return {
            dimension,
            score: hit ? maxScore : 0,
            maxScore,
            hit,
            evidence: hit ? `${dimension}: PASS` : `${dimension}: FAIL`,
        };
    }
}
export { DEFAULT_WEIGHTS };
//# sourceMappingURL=scoring-calculator.js.map