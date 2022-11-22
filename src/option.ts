import * as core from "@actions/core";
import { Version, versionList } from "./version";

export interface Option {
    githubToken: string;
    commitUser: string;
    commitEmail: string;
    repository: string;
    baseURL: string;
    configPath: string;
    bump: Version | null;
    dryRun: boolean;
    preRelease: boolean;
    draft: boolean;
}

export function getOption(): Option {
    return {
        repository: getInput("repository"),
        baseURL: getInputOrNull("base_url") ?? "github.com",
        githubToken: getInput("github_token"),
        commitUser: getInput("commit_user"),
        commitEmail: getInput("commit_email"),
        configPath: getInput("config_path"),
        bump: getVersionOrNull("bump"),
        dryRun: getInputOrNull("dry_run") == "true",
        preRelease: getInputOrNull("pre_release") == "true",
        draft: getInputOrNull("draft") == "true",
    };
}

function getInput(key: string): string {
    return core.getInput(key, { required: true });
}

function getInputOrNull(key: string): string | null {
    const result = core.getInput(key, { required: false });
    if (result.length == 0) {
        return null;
    }
    return result;
}

function getVersionOrNull(key: string): Version | null {
    const value = getInputOrNull(key);
    for (const version of versionList) {
        if (version == value) {
            return version;
        }
    }
    return null;
}
