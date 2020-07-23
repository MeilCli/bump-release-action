import { Option } from "../src/option";
import { Config } from "../src/config";
import { PullRequest } from "../src/pull_request";
import { Commit } from "../src/commit";
import { calculateChanges } from "../src/calculate";
import { createReleaseBody } from "../src/release";

function createOption(): Option {
    return {
        githubToken: "",
        repository: "MeilCli/bump-release-action",
        commitUser: "",
        commitEmail: "",
        configPath: "",
        bump: null,
    };
}

function createConfig(): Config {
    return {
        release: {
            titlePrefix: undefined,
            titlePostfix: undefined,
            bodyTitle: "Title",
            bodyWhenEmptyChanges: "",
            initialVersion: "1.0.0",
            tagPrefix: undefined,
            tagPostfix: undefined,
        },
        branch: {
            baseBranch: "master",
            versionBranchPrefix: undefined,
            versionBranchPostfix: undefined,
            createMajorVersionBranch: true,
            createMinorVersionBranch: false,
        },
        categories: [
            {
                title: "Feature",
                labels: ["feature"],
                skipLabel: "skip",
                commits: ["feature:"],
                changesPrefix: undefined,
                changesPostfix: undefined,
            },
            {
                title: "Bug Fix",
                labels: ["bug"],
                skipLabel: "skip",
                commits: ["bug:"],
                changesPrefix: undefined,
                changesPostfix: undefined,
            },
            {
                title: "Empty",
                labels: ["empty"],
                skipLabel: "skip",
                commits: ["empty:"],
                changesPrefix: undefined,
                changesPostfix: undefined,
            },
        ],
        bump: {
            default: "patch",
            major: {
                labels: ["major"],
                commits: ["major:"],
            },
            minor: {
                labels: ["minor"],
                commits: ["minor:"],
            },
            patch: {
                labels: ["patch"],
                commits: ["patch:"],
            },
        },
    };
}

function createCommitAndPullRequests(changes: [string, [number, string] | null][]): [Commit, PullRequest | null][] {
    const result: [Commit, PullRequest | null][] = [];

    for (const change of changes) {
        const commit: Commit = { sha: change[0], message: change[0] };
        let pullRequest: PullRequest | null = null;
        const additionalCommits: Commit[] = [];
        if (change[1] != null) {
            for (let i = 1; i <= change[1][0]; i++) {
                additionalCommits.push({ sha: `${change[0]}-${i}`, message: `${change[0]}-${i}` });
            }
            pullRequest = {
                title: `PR-${change[0]}`,
                number: 0,
                htmlUrl: "https://github.com/MeilCli/bump-release-action",
                user: { login: "MeilCli" },
                labels: [{ name: change[1][1] }],
                mergeCommitSha: change[0],
                commits: additionalCommits,
            };
        }
        result.push([commit, pullRequest]);
        for (const additionalCommit of additionalCommits) {
            result.push([additionalCommit, null]);
        }
    }

    return result;
}

const expectBody = `## Title
### Feature
- PR-pr-1 ([#0](https://github.com/MeilCli/bump-release-action)) @MeilCli
- feature: menu (https://github.com/MeilCli/bump-release-action/commit/feature: menu)
### Bug Fix
- bug: menu (https://github.com/MeilCli/bump-release-action/commit/bug: menu)
- PR-pr-2 ([#0](https://github.com/MeilCli/bump-release-action)) @MeilCli
`.replace("\r\n", "\n");

test("testCreateReleaseBody", () => {
    const option = createOption();
    const config = createConfig();
    const commitAndPullRequests = createCommitAndPullRequests([
        ["bug: menu", null],
        ["pr-1", [2, "feature"]],
        ["pr-2", [3, "bug"]],
        ["feature: menu", null],
    ]);
    const changes = calculateChanges(commitAndPullRequests);
    const body = createReleaseBody(option, config, changes);

    expect(body).toBe(expectBody);
});
