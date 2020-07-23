import * as fs from "fs";
import * as yaml from "js-yaml";
import { Version, versionList } from "./version";

export const defaultBodyTitle = "What's Changed";
export const defaultBodyWhenEmptyChanges = "This release has not changes";
export const defaultInitialVersion = "1.0.0";
export const defaultBaseBranch = "master";
export const defaultCreateMajorVersionBranch = true;
export const defaultCreateMinorVersionBranch = false;
export const defaultCategoryTitle = "Changes";
export const defaultBump = "patch";

export interface Config {
    release: ConfigRelease;
    branch: ConfigBranch;
    categories: ConfigCategory[];
    bump: ConfigBump;
}

export interface ConfigRelease {
    titlePrefix: string | undefined;
    titlePostfix: string | undefined;
    bodyTitle: string;
    bodyWhenEmptyChanges: string;
    initialVersion: string;
    tagPrefix: string | undefined;
    tagPostfix: string | undefined;
}

export interface ConfigBranch {
    baseBranch: string;
    versionBranchPrefix: string | undefined;
    versionBranchPostfix: string | undefined;
    createMajorVersionBranch: boolean;
    createMinorVersionBranch: boolean;
}

export interface ConfigCategory {
    title: string;
    labels: string[];
    skipLabel: string | undefined;
    commits: string[];
    changesPrefix: string | undefined;
    changesPostfix: string | undefined;
}

export interface ConfigBump {
    default: Version;
    major: ConfigBumpVersion;
    minor: ConfigBumpVersion;
    patch: ConfigBumpVersion;
}

export interface ConfigBumpVersion {
    labels: string[];
    commits: string[];
}

interface YamlRoot {
    release: YamlRelease | undefined;
    branch: YamlBranch | undefined;
    categories: YamlCategory[] | undefined;
    bump: YamlBump | undefined;
}

interface YamlRelease {
    "title-prefix": string | undefined;
    "title-postfix": string | undefined;
    "body-title": string | undefined;
    "body-when-empty-changes": string | undefined;
    "initial-version": string | undefined;
    "tag-prefix": string | undefined;
    "tag-postfix": string | undefined;
}

interface YamlBranch {
    "base-branch": string | undefined;
    "version-branch-prefix": string | undefined;
    "version-branch-postfix": string | undefined;
    "create-major-version-branch": boolean | undefined;
    "create-minor-version-branch": boolean | undefined;
}

interface YamlCategory {
    title: string | undefined;
    labels: string[] | undefined;
    "skip-label": string | undefined;
    commits: string[] | undefined;
    "changes-prefix": string | undefined;
    "changes-postfix": string | undefined;
}

interface YamlBump {
    default: string | undefined;
    major: YamlBumpVersion | undefined;
    minor: YamlBumpVersion | undefined;
    patch: YamlBumpVersion | undefined;
}

interface YamlBumpVersion {
    labels: string[] | undefined;
    commits: string[] | undefined;
}

export function getConfigFromFile(filePath: string): Config {
    const text = fs.readFileSync(filePath).toString();
    return getConfigFromYaml(text);
}

export function getConfigFromYaml(text: string): Config {
    const root = yaml.load(text) as YamlRoot;
    const release: ConfigRelease = {
        titlePrefix: root?.release?.["title-prefix"],
        titlePostfix: root?.release?.["title-postfix"],
        bodyTitle: root?.release?.["body-title"] ?? defaultBodyTitle,
        bodyWhenEmptyChanges: root?.release?.["body-when-empty-changes"] ?? defaultBodyWhenEmptyChanges,
        initialVersion: root?.release?.["initial-version"] ?? defaultInitialVersion,
        tagPrefix: root?.release?.["tag-prefix"],
        tagPostfix: root?.release?.["tag-postfix"],
    };
    const branch: ConfigBranch = {
        baseBranch: root?.branch?.["base-branch"] ?? defaultBaseBranch,
        versionBranchPrefix: root?.branch?.["version-branch-prefix"],
        versionBranchPostfix: root?.branch?.["version-branch-postfix"],
        createMajorVersionBranch: root?.branch?.["create-major-version-branch"] ?? defaultCreateMajorVersionBranch,
        createMinorVersionBranch: root?.branch?.["create-minor-version-branch"] ?? defaultCreateMinorVersionBranch,
    };
    const categories: ConfigCategory[] = [];
    if (root?.categories != undefined) {
        for (const category of root.categories) {
            categories.push({
                title: category.title ?? defaultCategoryTitle,
                labels: category.labels ?? [],
                skipLabel: category["skip-label"],
                commits: category.commits ?? [],
                changesPrefix: category["changes-prefix"],
                changesPostfix: category["changes-postfix"],
            });
        }
    }
    const major: ConfigBumpVersion = {
        labels: root?.bump?.major?.labels ?? [],
        commits: root?.bump?.major?.commits ?? [],
    };
    const minor: ConfigBumpVersion = {
        labels: root?.bump?.minor?.labels ?? [],
        commits: root?.bump?.minor?.commits ?? [],
    };
    const patch: ConfigBumpVersion = {
        labels: root?.bump?.patch?.labels ?? [],
        commits: root?.bump?.patch?.commits ?? [],
    };
    let bumpDefault: Version = defaultBump;
    for (const version of versionList) {
        if (version == root?.bump?.default) {
            bumpDefault = version;
            break;
        }
    }
    const bump: ConfigBump = {
        default: bumpDefault,
        major: major,
        minor: minor,
        patch: patch,
    };
    return {
        release: release,
        branch: branch,
        categories: categories,
        bump: bump,
    };
}
