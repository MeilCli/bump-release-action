import * as core from "@actions/core";
import * as github from "@actions/github";
import { getOption } from "./option";
import { getConfigFromFile } from "./config";
import { listCommits } from "./commit";
import { getLatestRelease, createRelease } from "./release";
import { listPullRequests } from "./pull_request";
import { calculateChanges } from "./calculate";
import { calculateNextVersion, calculateCurrentVersion } from "./version";
import { echoCurrentBranch, pushVersionBranch, pushBaseBranch } from "./git";
import { replaceVersions } from "./file";

async function run() {
    try {
        const option = getOption();
        const config = getConfigFromFile(option.configPath);
        const client = github.getOctokit(option.githubToken);

        const currentBranch = await echoCurrentBranch();
        if (currentBranch != config.branch.baseBranch) {
            throw new Error(`current branch(${currentBranch}) is not base branch(${config.branch.baseBranch})`);
        }

        let commits = await listCommits(config);
        const latestRelease = await getLatestRelease(client, option);
        if (latestRelease != null) {
            const index = commits.map((x) => x.sha).indexOf(latestRelease.commitSha);
            if (0 <= index) {
                commits = commits.slice(0, index);
            }
        }
        const commitAndPullRequests = await listPullRequests(client, option, config, commits);
        const changes = calculateChanges(config, commitAndPullRequests);
        const currentVersion = calculateCurrentVersion(config, latestRelease);
        const nextVersion = calculateNextVersion(option, config, latestRelease, changes);

        const hasChanges = replaceVersions(option, config, nextVersion);
        if (hasChanges) {
            await pushBaseBranch(option, config, nextVersion);
        }
        await pushVersionBranch(option, config, nextVersion);
        const createdReleaseJson = await createRelease(client, option, config, nextVersion, changes);

        core.info("");
        if (option.dryRun) {
            core.info("--- Dry Run Result ---");
        } else {
            core.info("--- Result ---");
        }
        core.info(`current version: ${currentVersion}`);
        core.info(`next version: ${nextVersion}`);

        core.setOutput("current_version", currentVersion);
        core.setOutput("next_version", nextVersion);
        core.setOutput("release", createdReleaseJson);
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
}

run();
