import { Option } from "../src/option";
import { Config, ConfigReleaseCommitNoteReplacer, ConfigReleasePullRequestCommit } from "../src/config";
import { PullRequest } from "../src/pull_request";
import { Commit } from "../src/commit";
import { calculateChanges } from "../src/calculate";
import { createReleaseBody, ReleaseSortBy, ReleaseSortDirection } from "../src/release";

function createOption(): Option {
    return {
        githubToken: "",
        repository: "MeilCli/bump-release-action",
        baseURL: "github.com",
        commitUser: "",
        commitEmail: "",
        configPath: "",
        bump: null,
        dryRun: false,
        preRelease: false,
        draft: false,
        forceVersioning: false,
        currentVersion: "",
        nextVersion: "",
    };
}

function createConfig(
    sortBy: ReleaseSortBy = "commit_at",
    sortDirection: ReleaseSortDirection = "descending",
    replacers: ConfigReleaseCommitNoteReplacer[] = [],
    pullRequestCommit: ConfigReleasePullRequestCommit = "exclude"
): Config {
    return {
        release: {
            titlePrefix: undefined,
            titlePostfix: undefined,
            bodyTitle: "Title",
            bodyWhenEmptyChanges: "",
            initialVersion: "1.0.0",
            tagPrefix: undefined,
            tagPostfix: undefined,
            sortBy: sortBy,
            sortDirection: sortDirection,
            commitNoteReplacers: replacers,
            pullRequestCommit: pullRequestCommit,
        },
        branch: {
            baseBranch: "master",
            versionBranchPrefix: undefined,
            versionBranchPostfix: undefined,
            createMajorVersionBranch: true,
            createMinorVersionBranch: false,
            bumpVersionCommitPrefix: undefined,
            bumpVersionCommitPostfix: undefined,
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
                title: "Feature",
                labels: ["f"],
                skipLabel: "skip",
                commits: ["f:"],
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
        files: [],
    };
}

function createCommitAndPullRequests(
    changes: [string, [number, string, string | undefined] | null][]
): [Commit, PullRequest | null][] {
    const result: [Commit, PullRequest | null][] = [];

    let commitAt = 100000000;
    for (const change of changes) {
        const commit: Commit = { sha: change[0], unixTime: commitAt--, message: change[0] };
        let pullRequest: PullRequest | null = null;
        const additionalCommits: Commit[] = [];
        if (change[1] != null) {
            for (let i = 1; i <= change[1][0]; i++) {
                additionalCommits.push({
                    sha: `${change[0]}-${i}`,
                    unixTime: commitAt--,
                    message: `${change[0]}-${i}`,
                });
            }
            pullRequest = {
                title: `PR-${change[0]}`,
                number: 0,
                htmlUrl: "https://github.com/MeilCli/bump-release-action",
                user: { login: "MeilCli" },
                labels: [{ name: change[1][1] }, { name: change[1][2] ?? "" }],
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

const expectBody1 = `## Title
### Feature
- PR-pr-1 ([#0](https://github.com/MeilCli/bump-release-action)) @MeilCli
- feature: menu (https://github.com/MeilCli/bump-release-action/commit/feature: menu)
### Bug Fix
- bug: menu (https://github.com/MeilCli/bump-release-action/commit/bug: menu)
- PR-pr-2 ([#0](https://github.com/MeilCli/bump-release-action)) @MeilCli`.replace("\r\n", "\n");

test("testCreateReleaseBody1", () => {
    const option = createOption();
    const config = createConfig();
    const commitAndPullRequests = createCommitAndPullRequests([
        ["bug: menu", null],
        ["pr-1", [2, "feature", undefined]],
        ["pr-2", [3, "bug", undefined]],
        ["feature: menu", null],
    ]);
    const changes = calculateChanges(config, commitAndPullRequests);
    const body = createReleaseBody(option, config, changes);

    expect(body).toBe(expectBody1);
});

const expectBody2 = `## Title
### Feature
- PR-pr-1 ([#0](https://github.com/MeilCli/bump-release-action)) @MeilCli
- PR-pr-9 ([#0](https://github.com/MeilCli/bump-release-action)) @MeilCli
- feature: menu (https://github.com/MeilCli/bump-release-action/commit/feature: menu)
- f: menu (https://github.com/MeilCli/bump-release-action/commit/f: menu)
### Bug Fix
- bug: menu (https://github.com/MeilCli/bump-release-action/commit/bug: menu)
- PR-pr-2 ([#0](https://github.com/MeilCli/bump-release-action)) @MeilCli`.replace("\r\n", "\n");

test("testCreateReleaseBody2", () => {
    const option = createOption();
    const config = createConfig();
    const commitAndPullRequests = createCommitAndPullRequests([
        ["bug: menu", null],
        ["pr-1", [2, "feature", undefined]],
        ["pr-9", [2, "f", undefined]],
        ["pr-2", [3, "bug", undefined]],
        ["feature: menu", null],
        ["f: menu", null],
    ]);
    const changes = calculateChanges(config, commitAndPullRequests);
    const body = createReleaseBody(option, config, changes);

    expect(body).toBe(expectBody2);
});

const expectSortByAscendingBody = `## Title
### Feature
- f: menu (https://github.com/MeilCli/bump-release-action/commit/f: menu)
- feature: menu (https://github.com/MeilCli/bump-release-action/commit/feature: menu)
- PR-pr-9 ([#0](https://github.com/MeilCli/bump-release-action)) @MeilCli
- PR-pr-1 ([#0](https://github.com/MeilCli/bump-release-action)) @MeilCli
### Bug Fix
- PR-pr-2 ([#0](https://github.com/MeilCli/bump-release-action)) @MeilCli
- bug: menu (https://github.com/MeilCli/bump-release-action/commit/bug: menu)`.replace("\r\n", "\n");

test("testCreateReleaseBodySortByAscending", () => {
    const option = createOption();
    const config = createConfig("commit_at", "ascending");
    const commitAndPullRequests = createCommitAndPullRequests([
        ["bug: menu", null],
        ["pr-1", [2, "feature", undefined]],
        ["pr-9", [2, "f", undefined]],
        ["pr-2", [3, "bug", undefined]],
        ["feature: menu", null],
        ["f: menu", null],
    ]);
    const changes = calculateChanges(config, commitAndPullRequests);
    const body = createReleaseBody(option, config, changes);

    expect(body).toBe(expectSortByAscendingBody);
});

const expectSortByNoteAndDescendingBody = `## Title
### Feature
- PR-pr-9 ([#0](https://github.com/MeilCli/bump-release-action)) @MeilCli
- PR-pr-1 ([#0](https://github.com/MeilCli/bump-release-action)) @MeilCli
- feature: menu (https://github.com/MeilCli/bump-release-action/commit/feature: menu)
- f: menu (https://github.com/MeilCli/bump-release-action/commit/f: menu)
### Bug Fix
- PR-pr-2 ([#0](https://github.com/MeilCli/bump-release-action)) @MeilCli
- bug: menu (https://github.com/MeilCli/bump-release-action/commit/bug: menu)`.replace("\r\n", "\n");

test("testCreateReleaseBodySortByNoteAndDescending", () => {
    const option = createOption();
    const config = createConfig("note", "descending");
    const commitAndPullRequests = createCommitAndPullRequests([
        ["bug: menu", null],
        ["pr-1", [2, "feature", undefined]],
        ["pr-9", [2, "f", undefined]],
        ["pr-2", [3, "bug", undefined]],
        ["feature: menu", null],
        ["f: menu", null],
    ]);
    const changes = calculateChanges(config, commitAndPullRequests);
    const body = createReleaseBody(option, config, changes);

    expect(body).toBe(expectSortByNoteAndDescendingBody);
});

const expectSortByNoteAndAscendingBody = `## Title
### Feature
- f: menu (https://github.com/MeilCli/bump-release-action/commit/f: menu)
- feature: menu (https://github.com/MeilCli/bump-release-action/commit/feature: menu)
- PR-pr-1 ([#0](https://github.com/MeilCli/bump-release-action)) @MeilCli
- PR-pr-9 ([#0](https://github.com/MeilCli/bump-release-action)) @MeilCli
### Bug Fix
- bug: menu (https://github.com/MeilCli/bump-release-action/commit/bug: menu)
- PR-pr-2 ([#0](https://github.com/MeilCli/bump-release-action)) @MeilCli`.replace("\r\n", "\n");

test("testCreateReleaseBodySortByNoteAndAscending", () => {
    const option = createOption();
    const config = createConfig("note", "ascending");
    const commitAndPullRequests = createCommitAndPullRequests([
        ["bug: menu", null],
        ["pr-1", [2, "feature", undefined]],
        ["pr-9", [2, "f", undefined]],
        ["pr-2", [3, "bug", undefined]],
        ["feature: menu", null],
        ["f: menu", null],
    ]);
    const changes = calculateChanges(config, commitAndPullRequests);
    const body = createReleaseBody(option, config, changes);

    expect(body).toBe(expectSortByNoteAndAscendingBody);
});

const expectReplacerBody = `## Title
### Feature
- PR-pr-1 ([#0](https://github.com/MeilCli/bump-release-action)) @MeilCli
- menu (https://github.com/MeilCli/bump-release-action/commit/feature: menu)
### Bug Fix
- menu (https://github.com/MeilCli/bump-release-action/commit/bug: menu)
- PR-pr-2 ([#0](https://github.com/MeilCli/bump-release-action)) @MeilCli`.replace("\r\n", "\n");

test("testCreateReleaseBodyWithReplacer", () => {
    const option = createOption();
    const config = createConfig("commit_at", "descending", [
        { replacePrefix: "feature: ", newPrefix: "" },
        { replacePrefix: "bug: ", newPrefix: "" },
    ]);
    const commitAndPullRequests = createCommitAndPullRequests([
        ["bug: menu", null],
        ["pr-1", [2, "feature", undefined]],
        ["pr-2", [3, "bug", undefined]],
        ["feature: menu", null],
    ]);
    const changes = calculateChanges(config, commitAndPullRequests);
    const body = createReleaseBody(option, config, changes);

    expect(body).toBe(expectReplacerBody);
});

const expectSkipBody = `## Title
### Feature
- feature: menu (https://github.com/MeilCli/bump-release-action/commit/feature: menu)
### Bug Fix
- bug: menu (https://github.com/MeilCli/bump-release-action/commit/bug: menu)
- PR-pr-2 ([#0](https://github.com/MeilCli/bump-release-action)) @MeilCli`.replace("\r\n", "\n");

test("testCreateReleaseBody1", () => {
    const option = createOption();
    const config = createConfig();
    const commitAndPullRequests = createCommitAndPullRequests([
        ["bug: menu", null],
        ["pr-1", [2, "feature", "skip"]],
        ["pr-2", [3, "bug", undefined]],
        ["feature: menu", null],
    ]);
    const changes = calculateChanges(config, commitAndPullRequests);
    const body = createReleaseBody(option, config, changes);

    expect(body).toBe(expectSkipBody);
});
