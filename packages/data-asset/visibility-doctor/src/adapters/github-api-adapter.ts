import type {
  IGitHubApiAdapter,
  ReadmeInstallCommand,
  IssueStatus,
  RepoMeta,
} from '../types/index.js';

type FetchLike = typeof globalThis.fetch;

export class GitHubApiAdapter implements IGitHubApiAdapter {
  private readonly fetchFn: FetchLike;
  private readonly token: string | null;

  constructor(githubToken?: string, fetchOverride?: FetchLike) {
    this.fetchFn = fetchOverride ?? globalThis.fetch;
    this.token = githubToken ?? process.env.GITHUB_TOKEN ?? null;
  }

  async queryTopics(repoFullName: string): Promise<readonly string[]> {
    const url = `https://api.github.com/repos/${repoFullName}/topics`;
    const res = await this.fetchGithub(url);
    const data = (await res.json()) as { names?: string[] };
    return data.names ?? [];
  }

  checkTopicsDoubleHit(topics: readonly string[]): {
    readonly hit: boolean;
    readonly missing: readonly string[];
  } {
    const required = ['dsh-plugin', 'deepseek-harness'];
    const missing = required.filter((t) => !topics.includes(t));
    return { hit: missing.length === 0, missing };
  }

  async queryReadmeInstallCommands(repoFullName: string): Promise<readonly ReadmeInstallCommand[]> {
    const url = `https://api.github.com/repos/${repoFullName}/readme`;
    const res = await this.fetchGithub(url, { Accept: 'application/vnd.github.raw' });
    const readme = await res.text();
    return this.extractInstallCommands(readme);
  }

  async queryIssueStatus(issueRef: string): Promise<IssueStatus> {
    const [repo, issueNum] = this.parseIssueRef(issueRef);
    const issueUrl = `https://api.github.com/repos/${repo}/issues/${issueNum}`;
    const commentsUrl = `https://api.github.com/repos/${repo}/issues/${issueNum}/comments`;

    const [issueRes, commentsRes] = await Promise.all([
      this.fetchGithub(issueUrl),
      this.fetchGithub(commentsUrl),
    ]);

    const issueData = (await issueRes.json()) as {
      state: string;
      updated_at: string;
    };
    const commentsData = (await commentsRes.json()) as Array<{
      body: string;
      created_at: string;
    }>;

    return {
      issueRef,
      state: issueData.state === 'closed' ? 'closed' : 'open',
      comments: commentsData.map((c) => ({ body: c.body, createdAt: c.created_at })),
      lastUpdatedAt: issueData.updated_at,
    };
  }

  async queryRepoMeta(repoFullName: string): Promise<RepoMeta> {
    const url = `https://api.github.com/repos/${repoFullName}`;
    const res = await this.fetchGithub(url);
    const data = (await res.json()) as {
      stargazers_count?: number;
      default_branch?: string;
    };
    const topics = await this.queryTopics(repoFullName);
    return {
      stars: data.stargazers_count ?? 0,
      topics,
      defaultBranch: data.default_branch ?? 'main',
    };
  }

  private async fetchGithub(url: string, extraHeaders?: Record<string, string>): Promise<Response> {
    const headers: Record<string, string> = {
      'User-Agent': 'dsh-visibility-doctor',
      ...extraHeaders,
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    const res = await this.fetchFn(url, { headers });
    if (!res.ok) {
      throw new Error(`GitHub API request failed: ${res.status} for ${url}`);
    }
    return res;
  }

  private extractInstallCommands(readme: string): readonly ReadmeInstallCommand[] {
    const regex = /dsh\s+plugin\s+--profile\s+\w+\s+add\s+(@[\w-]+\/[\w-]+)/g;
    const commands: ReadmeInstallCommand[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(readme)) !== null) {
      const fullCommand = match[0];
      const packageName = match[1];
      if (packageName === undefined) continue;
      const usesActualName = packageName.startsWith('@liuhange/');
      commands.push({ command: fullCommand, packageName, usesActualName });
    }
    return commands;
  }

  private parseIssueRef(issueRef: string): [string, string] {
    const parts = issueRef.split('#');
    if (parts.length !== 2) {
      throw new Error(`Invalid issue reference format: ${issueRef}. Expected owner/repo#number`);
    }
    return [parts[0]!, parts[1]!];
  }
}