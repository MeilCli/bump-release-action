import { PullRequest } from "./pull_request";
import { Commit } from "./commit";

export interface Changes {
    type: "commit" | "pull_request";
    value: Commit | PullRequest;
}

export function calculateChanges(commitAndPullRequests: [Commit, PullRequest | null][]): Changes[] {
    const result: Changes[] = [];
    const skipCommitShas: string[] = [];

    for (const commitAndPullRequest of commitAndPullRequests) {
        if (commitAndPullRequest[1] != null) {
            result.push({ type: "pull_request", value: commitAndPullRequest[1] });
            for (const commit of commitAndPullRequest[1].commits) {
                skipCommitShas.push(commit.sha);
            }
            continue;
        }
        if (0 <= skipCommitShas.indexOf(commitAndPullRequest[0].sha)) {
            continue;
        }
        result.push({ type: "commit", value: commitAndPullRequest[0] });
    }

    return result;
}
