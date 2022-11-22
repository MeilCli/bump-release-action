import * as core from "@actions/core";
import { GitHub } from "@actions/github/lib/utils";
import { Option } from "./option";
import { Config, ConfigCategory } from "./config";
import { Changes } from "./calculate";
import { PullRequest } from "./pull_request";
import { Commit } from "./commit";

export const releaseSortByList = ["note", "commit_at"] as const;
export const releaseSortDirectionList = ["ascending", "descending"] as const;

export type ReleaseSortBy = typeof releaseSortByList[number];

export type ReleaseSortDirection = typeof releaseSortDirectionList[number];

export interface Release {
    tagName: string;
    commitSha: string;
}

export async function getLatestRelease(client: InstanceType<typeof GitHub>, option: Option): Promise<Release | null> {
    try {
        const owner = option.repository.split("/")[0];
        const repository = option.repository.split("/")[1];
        const response = await client.rest.repos.getLatestRelease({ owner: owner, repo: repository });
        if (400 <= response.status) {
            return null;
        }
        const tagName = response.data.tag_name;
        const commitSha = await getTagCommitSha(client, owner, repository, tagName);
        if (commitSha == null) {
            return null;
        }
        return {
            tagName,
            commitSha,
        };
    } catch (error) {
        return null;
    }
}

async function getTagCommitSha(
    client: InstanceType<typeof GitHub>,
    owner: string,
    repository: string,
    tagName: string
): Promise<string | null> {
    const response = await client.rest.git.getRef({ owner: owner, repo: repository, ref: `tags/${tagName}` });
    if (400 <= response.status) {
        return null;
    }
    return response.data.object.sha;
}

export async function createRelease(
    client: InstanceType<typeof GitHub>,
    option: Option,
    config: Config,
    nextVersion: string,
    changes: Changes[]
): Promise<string> {
    const owner = option.repository.split("/")[0];
    const repository = option.repository.split("/")[1];
    const title = `${config.release.titlePrefix ?? ""}${nextVersion}${config.release.titlePostfix ?? ""}`;
    const body = createReleaseBody(option, config, changes);
    const tag = `${config.release.tagPrefix ?? ""}${nextVersion}${config.release.tagPostfix ?? ""}`;
    if (option.dryRun) {
        core.info("");
        core.info("--- Dry Run Create Release ---");
        core.info(`draft: ${option.draft}`);
        core.info(`preRelease: ${option.preRelease}`);
        core.info(`title: ${title}`);
        core.info(`tag: ${tag}`);
        core.info("body:");
        core.info(body);
        return "";
    }
    const response = await client.rest.repos.createRelease({
        owner: owner,
        repo: repository,
        name: title,
        body: body,
        tag_name: tag,
        target_commitish: config.branch.baseBranch,
        draft: option.draft,
        prerelease: option.preRelease,
    });

    if (400 <= response.status) {
        throw new Error("cannot create release");
    }
    return JSON.stringify(response.data);
}

export function createReleaseBody(option: Option, config: Config, changes: Changes[]): string {
    const categories = aggregateCategories(config, changes);

    if (categories.length == 0 || categories.map((x) => x[1].length).reduce((sum, current) => sum + current, 0) == 0) {
        return config.release.bodyWhenEmptyChanges;
    }

    const releaseNotes = aggregateReleaseNotes(option, config, categories);
    let result = `## ${config.release.bodyTitle}\n`;
    for (const releaseNote of releaseNotes) {
        if (releaseNote[1].length == 0) {
            continue;
        }
        result += `### ${releaseNote[0]}\n`;
        for (const note of releaseNote[1]) {
            result += `- ${note}\n`;
        }
    }

    if (result.endsWith("\n")) {
        result = result.slice(0, result.length - 1);
    }

    return result;
}

function aggregateCategories(config: Config, changes: Changes[]): [ConfigCategory, Changes[]][] {
    const categories: [ConfigCategory, Changes[]][] = [];
    for (const category of config.categories) {
        categories.push([category, []]);
    }

    for (const change of changes) {
        for (const category of categories) {
            let found = false;
            if (change.type == "pull_request") {
                const pullRequest = change.value as PullRequest;
                if (
                    category[0].skipLabel != undefined &&
                    pullRequest.labels.map((x) => x.name).includes(category[0].skipLabel)
                ) {
                    continue;
                }
                for (const label of pullRequest.labels.map((x) => x.name)) {
                    if (category[0].labels.includes(label)) {
                        category[1].push(change);
                        found = true;
                        break;
                    }
                }
            } else if (change.type == "commit") {
                const commit = change.value as Commit;
                for (const prefix of category[0].commits) {
                    if (commit.message.startsWith(prefix)) {
                        category[1].push(change);
                        found = true;
                        break;
                    }
                }
            }
            if (found) {
                break;
            }
        }
    }

    return categories;
}

function aggregateReleaseNotes(
    option: Option,
    config: Config,
    categories: [ConfigCategory, Changes[]][]
): [string, string[]][] {
    const releaseNotes: [string, [string, number][]][] = [];

    for (const category of categories) {
        let releaseNoteRoot: [string, [string, number][]] = [category[0].title, []];
        const findReleaseNoteRoot = releaseNotes.find((x) => x[0] == category[0].title);
        if (findReleaseNoteRoot == undefined) {
            releaseNotes.push(releaseNoteRoot);
        } else {
            releaseNoteRoot = findReleaseNoteRoot;
        }
        const changes = category[1];
        for (const change of changes) {
            const releaseNotePrefix = category[0].changesPrefix ?? "";
            const releaseNotePostfix = category[0].changesPostfix ?? "";
            releaseNoteRoot[1].push([
                `${releaseNotePrefix}${createReleaseNote(option, config, change)}${releaseNotePostfix}`,
                change.unixTime,
            ]);
        }
    }

    return releaseNotes.map((x) => {
        const notes: [string, number][] = x[1];

        if (config.release.sortBy == "commit_at") {
            if (config.release.sortDirection == "descending") {
                notes.sort((a, b) => (a[1] < b[1] ? 1 : -1));
            }
            if (config.release.sortDirection == "ascending") {
                notes.sort((a, b) => (a[1] < b[1] ? -1 : 1));
            }
        }
        if (config.release.sortBy == "note") {
            if (config.release.sortDirection == "descending") {
                notes.sort((a, b) => b[0].localeCompare(a[0]));
            }
            if (config.release.sortDirection == "ascending") {
                notes.sort((a, b) => a[0].localeCompare(b[0]));
            }
        }

        return [x[0], notes.map((y) => y[0])];
    });
}

function createReleaseNote(option: Option, config: Config, change: Changes): string {
    if (change.type == "pull_request") {
        const pullRequest = change.value as PullRequest;
        return `${pullRequest.title} ([#${pullRequest.number}](${pullRequest.htmlUrl})) @${pullRequest.user.login}`;
    }
    if (change.type == "commit") {
        const commit = change.value as Commit;
        let commitMessage = commit.message;
        for (const replacer of config.release.commitNoteReplacers) {
            const replacePrefix = replacer.replacePrefix;
            if (commitMessage.startsWith(replacePrefix)) {
                commitMessage = replacer.newPrefix + commitMessage.slice(replacePrefix.length, commitMessage.length);
                break;
            }
        }
        return `${commitMessage} (https://${option.baseURL}/${option.repository}/commit/${commit.sha})`;
    }
    return "";
}
