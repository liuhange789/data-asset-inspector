import type { IGitHubApiAdapter, ReadmeInstallCommand, IssueStatus, RepoMeta } from '../types/index.js';
type FetchLike = typeof globalThis.fetch;
export declare class GitHubApiAdapter implements IGitHubApiAdapter {
    private readonly fetchFn;
    private readonly token;
    constructor(githubToken?: string, fetchOverride?: FetchLike);
    queryTopics(repoFullName: string): Promise<readonly string[]>;
    checkTopicsDoubleHit(topics: readonly string[]): {
        readonly hit: boolean;
        readonly missing: readonly string[];
    };
    queryReadmeInstallCommands(repoFullName: string): Promise<readonly ReadmeInstallCommand[]>;
    queryIssueStatus(issueRef: string): Promise<IssueStatus>;
    queryRepoMeta(repoFullName: string): Promise<RepoMeta>;
    private fetchGithub;
    private extractInstallCommands;
    private parseIssueRef;
}
export {};
//# sourceMappingURL=github-api-adapter.d.ts.map