import { PullRequest } from "../src/pull_request";
import { Commit } from "../src/commit";
import { calculateChanges } from "../src/calculate";

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

test("testCalculateChangesPullRequestOnly", () => {
    const commitAndPullRequests = createCommitAndPullRequests([
        ["c1", 1],
        ["c2", 3],
        ["c3", 2],
    ]);
    expect(commitAndPullRequests.length).toBe(9);

    const changes = calculateChanges(commitAndPullRequests);
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
    const commitAndPullRequests = createCommitAndPullRequests([
        ["c1", null],
        ["c2", null],
        ["c3", null],
    ]);
    expect(commitAndPullRequests.length).toBe(3);

    const changes = calculateChanges(commitAndPullRequests);
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
    const commitAndPullRequests = createCommitAndPullRequests([
        ["c1", 3],
        ["c2", null],
        ["c3", 2],
        ["c4", null],
        ["c5", null],
    ]);
    expect(commitAndPullRequests.length).toBe(10);

    const changes = calculateChanges(commitAndPullRequests);
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
