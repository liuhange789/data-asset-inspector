import { readFile } from 'node:fs/promises';

import type {
  ScoreDimension,
  Subscore,
  DiscoverabilityScore,
} from '../types/index.js';

export interface ScoringWeights {
  readonly keywords: number;
  readonly readmeInstall: number;
  readonly topicsDoubleHit: number;
  readonly marketListed: number;
  readonly aliasDisplay: number;
  readonly repoNameMatch: number;
}

export interface PackageDiagnosisInput {
  readonly packageName: string;
  readonly keywordsHit: boolean;
  readonly readmeInstallFormat: boolean;
  readonly topicsDoubleHit: boolean;
  readonly marketListed: boolean;
  readonly aliasDisplay: boolean;
  readonly repoNameMatch: boolean;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  keywords: 25,
  readmeInstall: 20,
  topicsDoubleHit: 20,
  marketListed: 15,
  aliasDisplay: 10,
  repoNameMatch: 10,
};

export class ScoringCalculator {
  private readonly weights: ScoringWeights;

  constructor(weights?: ScoringWeights) {
    this.weights = weights ?? DEFAULT_WEIGHTS;
  }

  static async fromConfigFile(configPath: string): Promise<ScoringCalculator> {
    try {
      const content = await readFile(configPath, 'utf-8');
      const parsed = JSON.parse(content) as ScoringWeights;
      return new ScoringCalculator(parsed);
    } catch {
      return new ScoringCalculator();
    }
  }

  scorePackage(input: PackageDiagnosisInput): DiscoverabilityScore {
    const subscores: Subscore[] = [
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

  scoreAll(packages: readonly PackageDiagnosisInput[]): readonly DiscoverabilityScore[] {
    return packages.map((p) => this.scorePackage(p));
  }

  private scoreDimension(
    dimension: ScoreDimension,
    hit: boolean,
    maxScore: number,
  ): Subscore {
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