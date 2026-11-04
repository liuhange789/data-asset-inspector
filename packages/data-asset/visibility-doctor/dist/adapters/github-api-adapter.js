export class GitHubApiAdapter {
    fetchFn;
    token;
    constructor(githubToken, fetchOverride) {
        this.fetchFn = fetchOverride ?? globalThis.fetch;
        this.token = githubToken ?? process.env.GITHUB_TOKEN ?? null;
    }
    async queryTopics(repoFullName) {
        const url = `https://api.github.com/repos/${repoFullName}/topics`;
        const res = await this.fetchGithub(url);
        const data = (await res.json());
        return data.names ?? [];
    }
    checkTopicsDoubleHit(topics) {
        const required = ['dsh-plugin', 'deepseek-harness'];
        const missing = required.filter((t) => !topics.includes(t));
        return { hit: missing.length === 0, missing };
    }
    async queryReadmeInstallCommands(repoFullName) {
        const url = `https://api.github.com/repos/${repoFullName}/readme`;
        const res = await this.fetchGithub(url, { Accept: 'application/vnd.github.raw' });
        const readme = await res.text();
        return this.extractInstallCommands(readme);
    }
    async queryIssueStatus(issueRef) {
        const [repo, issueNum] = this.parseIssueRef(issueRef);
        const issueUrl = `https://api.github.com/repos/${repo}/issues/${issueNum}`;
        const commentsUrl = `https://api.github.com/repos/${repo}/issues/${issueNum}/comments`;
        const [issueRes, commentsRes] = await Promise.all([
            this.fetchGithub(issueUrl),
            this.fetchGithub(commentsUrl),
        ]);
        const issueData = (await issueRes.json());
        const commentsData = (await commentsRes.json());
        return {
            issueRef,
            state: issueData.state === 'closed' ? 'closed' : 'open',
            comments: commentsData.map((c) => ({ body: c.body, createdAt: c.created_at })),
            lastUpdatedAt: issueData.updated_at,
        };
    }
    async queryRepoMeta(repoFullName) {
        const url = `https://api.github.com/repos/${repoFullName}`;
        const res = await this.fetchGithub(url);
        const data = (await res.json());
        const topics = await this.queryTopics(repoFullName);
        return {
            stars: data.stargazers_count ?? 0,
            topics,
            defaultBranch: data.default_branch ?? 'main',
        };
    }
    async fetchGithub(url, extraHeaders) {
        const headers = {
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
    extractInstallCommands(readme) {
        const regex = /dsh\s+plugin\s+--profile\s+\w+\s+add\s+(@[\w-]+\/[\w-]+)/g;
        const commands = [];
        let match;
        while ((match = regex.exec(readme)) !== null) {
            const fullCommand = match[0];
            const packageName = match[1];
            if (packageName === undefined)
                continue;
            const usesActualName = packageName.startsWith('@liuhange/');
            commands.push({ command: fullCommand, packageName, usesActualName });
        }
        return commands;
    }
    parseIssueRef(issueRef) {
        const parts = issueRef.split('#');
        if (parts.length !== 2) {
            throw new Error(`Invalid issue reference format: ${issueRef}. Expected owner/repo#number`);
        }
        return [parts[0], parts[1]];
    }
}
//# sourceMappingURL=github-api-adapter.js.map