import { Option } from "../src/option";
import { Config } from "../src/config";
import { Release } from "../src/release";
import { Changes } from "../src/calculate";
import { PullRequest } from "../src/pull_request";
import { Commit } from "../src/commit";
import { Version, calculateNextVersion, cleanTagName } from "../src/version";

function createOption(defaultBump: Version | null): Option {
    return {
        repository: "",
        githubToken: "",
        commitUser: "",
        commitEmail: "",
        configPath: "",
        bump: defaultBump,
        dryRun: false,
        preRelease: false,
        draft: false,
    };
}

function createConfig(
    tagPrefix: string | undefined,
    tagPostfix: string | undefined,
    defaultBump: Version = "patch"
): Config {
    return {
        release: {
            titlePrefix: undefined,
            titlePostfix: undefined,
            bodyTitle: "",
            bodyWhenEmptyChanges: "",
            initialVersion: "1.0.0",
            tagPrefix: tagPrefix,
            tagPostfix: tagPostfix,
            sortBy: "commit_at",
            sortDirection: "descending",
            commitNoteReplacers: [],
            pullRequestCommit: "exclude",
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
        categories: [],
        bump: {
            default: defaultBump,
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

function createRelease(tagName: string): Release {
    return {
        tagName: tagName,
        commitSha: "",
    };
}

function createChanges(changes: Array<string | string[]>): Changes[] {
    const result: Changes[] = [];

    for (const change of changes) {
        if (typeof change == "string") {
            const commit: Commit = {
                sha: "",
                unixTime: 0,
                message: change,
            };
            result.push({
                type: "commit",
                unixTime: 0,
                value: commit,
            });
        } else {
            type Label = { name: string };
            const pullRequest: PullRequest = {
                number: 0,
                title: "",
                mergeCommitSha: "",
                htmlUrl: "",
                user: { login: "" },
                commits: [],
                labels: change.map((x) => {
                    return { name: x } as Label;
                }),
            };
            result.push({
                type: "pull_request",
                unixTime: 0,
                value: pullRequest,
            });
        }
    }

    return result;
}

test("testCleanTagName", () => {
    expect(cleanTagName(createConfig(undefined, undefined), "v2.1.0")).toBe("2.1.0");
    expect(cleanTagName(createConfig(undefined, undefined), "v2.1")).toBe("2.1.0");
    expect(cleanTagName(createConfig(undefined, undefined), "v2")).toBe("2.0.0");
    expect(cleanTagName(createConfig("release-", undefined), "release-2.1.0")).toBe("2.1.0");
    expect(cleanTagName(createConfig(undefined, "-stable"), "v2.1.0-stable")).toBe("2.1.0");
    expect(cleanTagName(createConfig("release-", "-stable"), "release-2.1.0-stable")).toBe("2.1.0");
    expect(() => cleanTagName(createConfig(undefined, undefined), "v.0")).toThrowError(/.+/);
    expect(() => cleanTagName(createConfig(undefined, undefined), "v1.")).toThrowError(/.+/);
    expect(() => cleanTagName(createConfig(undefined, undefined), "v")).toThrowError(/.+/);
});

test("calculateNextVersion", () => {
    /**
     * initial version
     */
    expect(
        calculateNextVersion(
            createOption("patch"),
            createConfig(undefined, undefined),
            createRelease("v2.1.1"),
            createChanges([])
        )
    ).toBe("2.1.2");
    expect(
        calculateNextVersion(
            createOption("minor"),
            createConfig(undefined, undefined),
            createRelease("v2.1.1"),
            createChanges([])
        )
    ).toBe("2.2.0");
    expect(
        calculateNextVersion(
            createOption("major"),
            createConfig(undefined, undefined),
            createRelease("v2.1.1"),
            createChanges([])
        )
    ).toBe("3.0.0");
    expect(
        calculateNextVersion(
            createOption(null),
            createConfig(undefined, undefined),
            createRelease("v2.1.1"),
            createChanges([])
        )
    ).toBe("2.1.2");

    /**
     * prefix and postfix
     */
    expect(
        calculateNextVersion(
            createOption("patch"),
            createConfig("release-", "-stable"),
            createRelease("release-2.1.1-stable"),
            createChanges([])
        )
    ).toBe("2.1.2");

    /**
     * General
     */
    expect(
        calculateNextVersion(
            createOption(null),
            createConfig(undefined, undefined),
            createRelease("v2.1.1"),
            createChanges(["fix", ["skip"], ["patch"]])
        )
    ).toBe("2.1.2");
    expect(
        calculateNextVersion(
            createOption(null),
            createConfig(undefined, undefined),
            createRelease("v2.1.1"),
            createChanges(["fix", ["skip"], ["minor"]])
        )
    ).toBe("2.2.0");
    expect(
        calculateNextVersion(
            createOption(null),
            createConfig(undefined, undefined),
            createRelease("v2.1.1"),
            createChanges(["minor: fix", ["skip"], ["patch"]])
        )
    ).toBe("2.2.0");
    expect(
        calculateNextVersion(
            createOption(null),
            createConfig(undefined, undefined),
            createRelease("v2.1.1"),
            createChanges(["patch: fix", ["skip"], ["minor"]])
        )
    ).toBe("2.2.0");
    expect(
        calculateNextVersion(
            createOption(null),
            createConfig(undefined, undefined),
            createRelease("v2.1.1"),
            createChanges(["patch: fix", ["skip"], "minor: fix"])
        )
    ).toBe("2.2.0");
    expect(
        calculateNextVersion(
            createOption(null),
            createConfig(undefined, undefined),
            createRelease("v2.1.1"),
            createChanges(["fix", ["skip"], ["major"]])
        )
    ).toBe("3.0.0");
    expect(
        calculateNextVersion(
            createOption(null),
            createConfig(undefined, undefined),
            createRelease("v2.1.1"),
            createChanges(["major: fix", ["minor"], ["patch"]])
        )
    ).toBe("3.0.0");
    expect(
        calculateNextVersion(
            createOption(null),
            createConfig(undefined, undefined),
            createRelease("v2.1.1"),
            createChanges(["patch: fix", ["minor"], ["major"]])
        )
    ).toBe("3.0.0");
    expect(
        calculateNextVersion(
            createOption(null),
            createConfig(undefined, undefined),
            createRelease("v2.1.1"),
            createChanges(["patch: fix", ["minor"], "major: fix"])
        )
    ).toBe("3.0.0");
});

test("calculateNextVersionOverrideDefaultBump", () => {
    /**
     * patch bump
     */
    expect(
        calculateNextVersion(
            createOption(null),
            createConfig(undefined, undefined, "patch"),
            createRelease("v2.1.1"),
            createChanges([])
        )
    ).toBe("2.1.2");
    expect(
        calculateNextVersion(
            createOption(null),
            createConfig(undefined, undefined, "major"),
            createRelease("v2.1.1"),
            createChanges(["patch: fix"])
        )
    ).toBe("2.1.2");

    /**
     * minor bump
     */
    expect(
        calculateNextVersion(
            createOption(null),
            createConfig(undefined, undefined, "minor"),
            createRelease("v2.1.1"),
            createChanges([])
        )
    ).toBe("2.2.0");
    expect(
        calculateNextVersion(
            createOption(null),
            createConfig(undefined, undefined, "major"),
            createRelease("v2.1.1"),
            createChanges(["patch: fix", ["minor"]])
        )
    ).toBe("2.2.0");
    expect(
        calculateNextVersion(
            createOption(null),
            createConfig(undefined, undefined, "patch"),
            createRelease("v2.1.1"),
            createChanges(["patch: fix", ["minor"]])
        )
    ).toBe("2.2.0");

    /**
     * major bump
     */
    expect(
        calculateNextVersion(
            createOption(null),
            createConfig(undefined, undefined, "major"),
            createRelease("v2.1.1"),
            createChanges([])
        )
    ).toBe("3.0.0");
    expect(
        calculateNextVersion(
            createOption(null),
            createConfig(undefined, undefined, "patch"),
            createRelease("v2.1.1"),
            createChanges(["patch: fix", ["minor"], "major: fix"])
        )
    ).toBe("3.0.0");
});
