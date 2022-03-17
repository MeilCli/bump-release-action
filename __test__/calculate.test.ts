import { Config, ConfigReleaseCommitNoteReplacer, ConfigReleasePullRequestCommit } from "../src/config";
import { PullRequest } from "../src/pull_request";
import { Commit } from "../src/commit";
import { calculateChanges } from "../src/calculate";
import { ReleaseSortBy, ReleaseSortDirection } from "../src/release";

function createCommitAndPullRequests(changes: [string, number | null][]): [Commit, PullRequest | null][] {
    const result: [Commit, PullRequest | null][] = [];

    let unixTime = 0;
    for (const change of changes) {
        const commit: Commit = { sha: change[0], unixTime: unixTime++, message: "" };
        let pullRequest: PullRequest | null = null;
        const additionalCommits: Commit[] = [];
        if (change[1] != null) {
            for (let i = 1; i <= change[1]; i++) {
                additionalCommits.push({ sha: `${change[0]}-${i}`, unixTime: unixTime++, message: "" });
            }
            pullRequest = {
                title: "",
                number: 0,
                htmlUrl: "",
                user: { login: "" },
                labels: [],
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

test("testCalculateChangesPullRequestOnly", () => {
    const config = createConfig();
    const commitAndPullRequests = createCommitAndPullRequests([
        ["c1", 1],
        ["c2", 3],
        ["c3", 2],
    ]);
    expect(commitAndPullRequests.length).toBe(9);

    const changes = calculateChanges(config, commitAndPullRequests);
    expect(changes.length).toBe(3);

    expect(changes[0].type).toBe("pull_request");
    expect(changes[0].unixTime).toBe(0);
    expect((changes[0].value as PullRequest).mergeCommitSha).toBe("c1");

    expect(changes[1].type).toBe("pull_request");
    expect(changes[1].unixTime).toBe(2);
    expect((changes[1].value as PullRequest).mergeCommitSha).toBe("c2");

    expect(changes[2].type).toBe("pull_request");
    expect(changes[2].unixTime).toBe(6);
    expect((changes[2].value as PullRequest).mergeCommitSha).toBe("c3");
});

test("testCalculateChangesCommitOnly", () => {
    const config = createConfig();
    const commitAndPullRequests = createCommitAndPullRequests([
        ["c1", null],
        ["c2", null],
        ["c3", null],
    ]);
    expect(commitAndPullRequests.length).toBe(3);

    const changes = calculateChanges(config, commitAndPullRequests);
    expect(changes.length).toBe(3);

    expect(changes[0].type).toBe("commit");
    expect(changes[0].unixTime).toBe(0);
    expect((changes[0].value as Commit).sha).toBe("c1");

    expect(changes[1].type).toBe("commit");
    expect(changes[1].unixTime).toBe(1);
    expect((changes[1].value as Commit).sha).toBe("c2");

    expect(changes[2].type).toBe("commit");
    expect(changes[2].unixTime).toBe(2);
    expect((changes[2].value as Commit).sha).toBe("c3");
});

test("testCalculateChanges", () => {
    const config = createConfig();
    const commitAndPullRequests = createCommitAndPullRequests([
        ["c1", 3],
        ["c2", null],
        ["c3", 2],
        ["c4", null],
        ["c5", null],
    ]);
    expect(commitAndPullRequests.length).toBe(10);

    const changes = calculateChanges(config, commitAndPullRequests);
    expect(changes.length).toBe(5);

    expect(changes[0].type).toBe("pull_request");
    expect(changes[0].unixTime).toBe(0);
    expect((changes[0].value as PullRequest).mergeCommitSha).toBe("c1");

    expect(changes[1].type).toBe("commit");
    expect(changes[1].unixTime).toBe(4);
    expect((changes[1].value as Commit).sha).toBe("c2");

    expect(changes[2].type).toBe("pull_request");
    expect(changes[2].unixTime).toBe(5);
    expect((changes[2].value as PullRequest).mergeCommitSha).toBe("c3");

    expect(changes[3].type).toBe("commit");
    expect(changes[3].unixTime).toBe(8);
    expect((changes[3].value as Commit).sha).toBe("c4");

    expect(changes[4].type).toBe("commit");
    expect(changes[4].unixTime).toBe(9);
    expect((changes[4].value as Commit).sha).toBe("c5");
});

test("testCalculateChangesWithIncludePullRequestCommit", () => {
    const config = createConfig("commit_at", "descending", [], "include");
    const commitAndPullRequests = createCommitAndPullRequests([
        ["c1", 3],
        ["c2", null],
        ["c3", 2],
        ["c4", null],
        ["c5", null],
    ]);
    expect(commitAndPullRequests.length).toBe(10);

    const changes = calculateChanges(config, commitAndPullRequests);
    expect(changes.length).toBe(12);

    expect(changes[0].type).toBe("pull_request");
    expect(changes[0].unixTime).toBe(0);
    expect((changes[0].value as PullRequest).mergeCommitSha).toBe("c1");

    expect(changes[1].type).toBe("commit");
    expect(changes[1].unixTime).toBe(0);
    expect((changes[1].value as Commit).sha).toBe("c1");

    expect(changes[2].type).toBe("commit");
    expect(changes[2].unixTime).toBe(1);
    expect((changes[2].value as Commit).sha).toBe("c1-1");

    expect(changes[3].type).toBe("commit");
    expect(changes[3].unixTime).toBe(2);
    expect((changes[3].value as Commit).sha).toBe("c1-2");

    expect(changes[4].type).toBe("commit");
    expect(changes[4].unixTime).toBe(3);
    expect((changes[4].value as Commit).sha).toBe("c1-3");

    expect(changes[5].type).toBe("commit");
    expect(changes[5].unixTime).toBe(4);
    expect((changes[5].value as Commit).sha).toBe("c2");

    expect(changes[6].type).toBe("pull_request");
    expect(changes[6].unixTime).toBe(5);
    expect((changes[6].value as PullRequest).mergeCommitSha).toBe("c3");

    expect(changes[7].type).toBe("commit");
    expect(changes[7].unixTime).toBe(5);
    expect((changes[7].value as Commit).sha).toBe("c3");

    expect(changes[8].type).toBe("commit");
    expect(changes[8].unixTime).toBe(6);
    expect((changes[8].value as Commit).sha).toBe("c3-1");

    expect(changes[9].type).toBe("commit");
    expect(changes[9].unixTime).toBe(7);
    expect((changes[9].value as Commit).sha).toBe("c3-2");

    expect(changes[10].type).toBe("commit");
    expect(changes[10].unixTime).toBe(8);
    expect((changes[10].value as Commit).sha).toBe("c4");

    expect(changes[11].type).toBe("commit");
    expect(changes[11].unixTime).toBe(9);
    expect((changes[11].value as Commit).sha).toBe("c5");
});

test("testCalculateChangesWithIncludePullRequestMergeCommitOnly", () => {
    const config = createConfig("commit_at", "descending", [], "include_merge_commit_only");
    const commitAndPullRequests = createCommitAndPullRequests([
        ["c1", 3],
        ["c2", null],
        ["c3", 2],
        ["c4", null],
        ["c5", null],
    ]);
    expect(commitAndPullRequests.length).toBe(10);

    const changes = calculateChanges(config, commitAndPullRequests);
    expect(changes.length).toBe(7);

    expect(changes[0].type).toBe("pull_request");
    expect(changes[0].unixTime).toBe(0);
    expect((changes[0].value as PullRequest).mergeCommitSha).toBe("c1");

    expect(changes[1].type).toBe("commit");
    expect(changes[1].unixTime).toBe(0);
    expect((changes[1].value as Commit).sha).toBe("c1");

    expect(changes[2].type).toBe("commit");
    expect(changes[2].unixTime).toBe(4);
    expect((changes[2].value as Commit).sha).toBe("c2");

    expect(changes[3].type).toBe("pull_request");
    expect(changes[3].unixTime).toBe(5);
    expect((changes[3].value as PullRequest).mergeCommitSha).toBe("c3");

    expect(changes[4].type).toBe("commit");
    expect(changes[4].unixTime).toBe(5);
    expect((changes[4].value as Commit).sha).toBe("c3");

    expect(changes[5].type).toBe("commit");
    expect(changes[5].unixTime).toBe(8);
    expect((changes[5].value as Commit).sha).toBe("c4");

    expect(changes[6].type).toBe("commit");
    expect(changes[6].unixTime).toBe(9);
    expect((changes[6].value as Commit).sha).toBe("c5");
});

test("testCalculateChangesWithIncludePullRequestBranchCommitOnly", () => {
    const config = createConfig("commit_at", "descending", [], "include_branch_commit_only");
    const commitAndPullRequests = createCommitAndPullRequests([
        ["c1", 3],
        ["c2", null],
        ["c3", 2],
        ["c4", null],
        ["c5", null],
    ]);
    expect(commitAndPullRequests.length).toBe(10);

    const changes = calculateChanges(config, commitAndPullRequests);
    expect(changes.length).toBe(10);

    expect(changes[0].type).toBe("pull_request");
    expect(changes[0].unixTime).toBe(0);
    expect((changes[0].value as PullRequest).mergeCommitSha).toBe("c1");

    expect(changes[1].type).toBe("commit");
    expect(changes[1].unixTime).toBe(1);
    expect((changes[1].value as Commit).sha).toBe("c1-1");

    expect(changes[2].type).toBe("commit");
    expect(changes[2].unixTime).toBe(2);
    expect((changes[2].value as Commit).sha).toBe("c1-2");

    expect(changes[3].type).toBe("commit");
    expect(changes[3].unixTime).toBe(3);
    expect((changes[3].value as Commit).sha).toBe("c1-3");

    expect(changes[4].type).toBe("commit");
    expect(changes[4].unixTime).toBe(4);
    expect((changes[4].value as Commit).sha).toBe("c2");

    expect(changes[5].type).toBe("pull_request");
    expect(changes[5].unixTime).toBe(5);
    expect((changes[5].value as PullRequest).mergeCommitSha).toBe("c3");

    expect(changes[6].type).toBe("commit");
    expect(changes[6].unixTime).toBe(6);
    expect((changes[6].value as Commit).sha).toBe("c3-1");

    expect(changes[7].type).toBe("commit");
    expect(changes[7].unixTime).toBe(7);
    expect((changes[7].value as Commit).sha).toBe("c3-2");

    expect(changes[8].type).toBe("commit");
    expect(changes[8].unixTime).toBe(8);
    expect((changes[8].value as Commit).sha).toBe("c4");

    expect(changes[9].type).toBe("commit");
    expect(changes[9].unixTime).toBe(9);
    expect((changes[9].value as Commit).sha).toBe("c5");
});
