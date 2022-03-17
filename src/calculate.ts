import { Config } from "./config";
import { PullRequest } from "./pull_request";
import { Commit } from "./commit";

export interface Changes {
    type: "commit" | "pull_request";
    unixTime: number;
    value: Commit | PullRequest;
}

export function calculateChanges(config: Config, commitAndPullRequests: [Commit, PullRequest | null][]): Changes[] {
    const result: Changes[] = [];
    const skipCommitShas: string[] = [];

    for (const commitAndPullRequest of commitAndPullRequests) {
        if (commitAndPullRequest[1] != null) {
            result.push({
                type: "pull_request",
                unixTime: commitAndPullRequest[0].unixTime,
                value: commitAndPullRequest[1],
            });
            for (const commit of commitAndPullRequest[1].commits) {
                skipCommitShas.push(commit.sha);
            }
            if (
                config.release.pullRequestCommit == "exclude" ||
                config.release.pullRequestCommit == "include_branch_commit_only"
            ) {
                continue;
            }
        }
        if (0 <= skipCommitShas.indexOf(commitAndPullRequest[0].sha)) {
            if (
                config.release.pullRequestCommit == "exclude" ||
                config.release.pullRequestCommit == "include_merge_commit_only"
            ) {
                continue;
            }
        }
        result.push({ type: "commit", unixTime: commitAndPullRequest[0].unixTime, value: commitAndPullRequest[0] });
    }

    return result;
}
