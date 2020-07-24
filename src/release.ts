import * as core from "@actions/core";
import { GitHub } from "@actions/github/lib/utils";
import { Option } from "./option";
import { Config, ConfigCategory } from "./config";
import { Changes } from "./calculate";
import { PullRequest } from "./pull_request";
import { Commit } from "./commit";

export interface Release {
    tagName: string;
    commitSha: string;
}

export async function getLatestRelease(client: InstanceType<typeof GitHub>, option: Option): Promise<Release | null> {
    const owner = option.repository.split("/")[0];
    const repository = option.repository.split("/")[1];
    const response = await client.repos.getLatestRelease({ owner: owner, repo: repository });
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
}

async function getTagCommitSha(
    client: InstanceType<typeof GitHub>,
    owner: string,
    repository: string,
    tagName: string
): Promise<string | null> {
    const response = await client.git.getRef({ owner: owner, repo: repository, ref: `tags/${tagName}` });
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
        core.info(`title: ${title}`);
        core.info(`tag: ${tag}`);
        core.info("body:");
        core.info(body);
        return "";
    }
    const response = await client.repos.createRelease({
        owner: owner,
        repo: repository,
        name: title,
        body: body,
        tag_name: tag,
        target_commitish: config.branch.baseBranch,
        draft: false,
        prerelease: false,
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

    const releaseNotes = aggregateReleaseNotes(option, categories);
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

function aggregateReleaseNotes(option: Option, categories: [ConfigCategory, Changes[]][]): [string, string[]][] {
    const releaseNotes: [string, string[]][] = [];

    for (const category of categories) {
        let releaseNoteRoot: [string, string[]] = [category[0].title, []];
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
            releaseNoteRoot[1].push(`${releaseNotePrefix}${createReleaseNote(option, change)}${releaseNotePostfix}`);
        }
    }

    return releaseNotes;
}

function createReleaseNote(option: Option, change: Changes): string {
    if (change.type == "pull_request") {
        const pullRequest = change.value as PullRequest;
        return `${pullRequest.title} ([#${pullRequest.number}](${pullRequest.htmlUrl})) @${pullRequest.user.login}`;
    }
    if (change.type == "commit") {
        const commit = change.value as Commit;
        return `${commit.message} (https://github.com/${option.repository}/commit/${commit.sha})`;
    }
    return "";
}
