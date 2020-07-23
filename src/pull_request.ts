import { GitHub } from "@actions/github/lib/utils";
import { Option } from "./option";
import { Config } from "./config";
import { Commit } from "./commit";

export interface PullRequest {
    htmlUrl: string;
    number: number;
    title: string;
    user: {
        login: string;
    };
    labels: {
        name: string;
    }[];
    mergeCommitSha: string;
    commits: Commit[];
}

declare type PullsListResponseData = {
    html_url: string;
    number: number;
    title: string;
    user: {
        login: string;
    };
    labels: {
        name: string;
    }[];
    merged_at: string | null;
    merge_commit_sha: string;
};

declare type PullsListCommitsResponseData = {
    sha: string;
    commit: {
        message: string;
    };
};

export async function listPullRequests(
    client: InstanceType<typeof GitHub>,
    option: Option,
    config: Config,
    commits: Commit[]
): Promise<[Commit, PullRequest | null][]> {
    const owner = option.repository.split("/")[0];
    const repository = option.repository.split("/")[1];

    const selector: (data: PullsListResponseData, commits: Commit[]) => PullRequest = (data, commits) => {
        return {
            htmlUrl: data.html_url,
            number: data.number,
            title: data.title,
            user: data.user,
            labels: data.labels,
            mergeCommitSha: data.merge_commit_sha,
            commits: commits,
        };
    };
    const get: (page: number) => Promise<PullRequest[]> = async (page) => {
        const response = await client.pulls.list({
            owner: owner,
            repo: repository,
            state: "closed",
            sort: "updated",
            direction: "desc",
            base: config.branch.baseBranch,
            per_page: 50,
            page: page,
        });
        if (400 <= response.status) {
            throw new Error(`cannot get pull requests`);
        }

        const result: PullRequest[] = [];
        for (const data of response.data) {
            if (data.merged_at == null) {
                continue;
            }
            result.push(selector(data, await listCommits(client, owner, repository, data.number)));
        }
        return result;
    };
    const find: (commits: Commit[], sha: string) => Commit | null = (commits, sha) => {
        for (const commit of commits) {
            if (commit.sha == sha) {
                return commit;
            }
        }
        return null;
    };

    const map = new Map<string, PullRequest>();
    for (let i = 1; i < 100; i++) {
        const pullRequests = await get(i);
        let unmatched = 0;
        for (const pullRequest of pullRequests) {
            const foundCommit = find(commits, pullRequest.mergeCommitSha);
            if (foundCommit == null) {
                unmatched += 1;
                continue;
            }
            map.set(foundCommit.sha, pullRequest);
        }
        if (pullRequests.length < 50) {
            break;
        }
        if (10 < unmatched) {
            break;
        }
    }

    const result: [Commit, PullRequest | null][] = [];

    for (const commit of commits) {
        result.push([commit, map.get(commit.sha) ?? null]);
    }

    return result;
}

async function listCommits(
    client: InstanceType<typeof GitHub>,
    owner: string,
    repository: string,
    number: number
): Promise<Commit[]> {
    let commits: Commit[] = [];

    const selector: (data: PullsListCommitsResponseData) => Commit = (data) => {
        return {
            sha: data.sha,
            message: data.commit.message,
        };
    };
    const get: (page: number) => Promise<Commit[]> = async (page) => {
        const response = await client.pulls.listCommits({
            owner: owner,
            repo: repository,
            pull_number: number,
            per_page: 50,
            page: page,
        });
        if (400 <= response.status) {
            throw new Error(`cannot get commits of #${number}`);
        }
        return response.data.map((x) => selector(x));
    };

    // can get max: 250
    for (const i of [1, 2, 3, 4, 5]) {
        const response = await get(i);
        commits = commits.concat(response);
        if (response.length < 50) {
            break;
        }
    }

    return commits;
}
