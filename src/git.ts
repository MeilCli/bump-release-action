import * as exec from "@actions/exec";
import * as semver from "semver";
import { Option } from "./option";
import { Config } from "./config";

export async function echoCurrentBranch(): Promise<string> {
    const execOption: exec.ExecOptions = { ignoreReturnCode: true };
    let stdout = "";
    execOption.listeners = {
        stdout: (data: Buffer) => {
            stdout += data.toString();
        },
    };

    await exec.exec("git symbolic-ref --short HEAD", undefined, execOption);

    return stdout.trim();
}

export async function checkoutBranch(branch: string, create: boolean) {
    if (create) {
        await exec.exec(`git checkout -b ${branch}`);
    } else {
        await exec.exec(`git checkout ${branch}`);
    }
}

export async function checkoutTargetBranch(branch: string, create: boolean, hasRemote: boolean) {
    if (create) {
        if (hasRemote) {
            await exec.exec(`git checkout --track origin/${branch}`);
        } else {
            await exec.exec(`git checkout -b ${branch}`);
        }
    } else {
        await exec.exec(`git checkout ${branch}`);
    }
}

export async function pushBaseBranch(option: Option, config: Config, version: string) {
    if (option.dryRun) {
        return;
    }
    await exec.exec(`git config --local user.name ${option.commitUser}`);
    await exec.exec(`git config --local user.email ${option.commitEmail}`);
    await exec.exec("git config pull.ff only");
    await checkoutBranch(config.branch.baseBranch, false);
    await exec.exec(`git pull origin ${config.branch.baseBranch}`);

    for (const file of config.files) {
        await exec.exec(`git add ${file.filePath}`);
    }
    const messagePrefix = `${config.branch.bumpVersionCommitPrefix ?? ""}`;
    const messagePostfix = `${config.branch.bumpVersionCommitPostfix ?? ""}`;
    const message = `${messagePrefix}${version}${messagePostfix}`;
    await exec.exec(`git commit --no-edit -m ${message}`);

    const remote = `https://x-access-token:${option.githubToken}@${option.baseURL}/${option.repository}.git`;
    await exec.exec(`git push ${remote} HEAD:${config.branch.baseBranch}`);
}

export async function pushVersionBranch(option: Option, config: Config, version: string) {
    if (option.dryRun) {
        return;
    }
    if (config.branch.createMajorVersionBranch == false && config.branch.createMinorVersionBranch == false) {
        return;
    }
    await exec.exec(`git config --local user.name ${option.commitUser}`);
    await exec.exec(`git config --local user.email ${option.commitEmail}`);

    const remote = `https://x-access-token:${option.githubToken}@${option.baseURL}/${option.repository}.git`;
    if (config.branch.createMajorVersionBranch) {
        const major = semver.major(version);
        const branchPrefix = `${config.branch.versionBranchPrefix ?? ""}`;
        const branchPostfix = `${config.branch.versionBranchPostfix ?? ""}`;
        const branch = `${branchPrefix}${major}${branchPostfix}`;
        await exec.exec("git fetch -p");
        const hasRemote = await hasRemoteBranch(branch);
        const has = await hasBranch(branch);
        await checkoutTargetBranch(branch, has == false, hasRemote);
        await mergeBranch(config.branch.baseBranch);
        await exec.exec(`git push ${remote} HEAD:${branch}`);
        await checkoutBranch(config.branch.baseBranch, false);
    }
    if (config.branch.createMinorVersionBranch) {
        const major = semver.major(version);
        const minor = semver.minor(version);
        const branchPrefix = `${config.branch.versionBranchPrefix ?? ""}`;
        const branchPostfix = `${config.branch.versionBranchPostfix ?? ""}`;
        const branch = `${branchPrefix}${major}.${minor}${branchPostfix}`;
        await exec.exec("git fetch -p");
        const hasRemote = await hasRemoteBranch(branch);
        const has = await hasBranch(branch);
        await checkoutTargetBranch(branch, has == false, hasRemote);
        await mergeBranch(config.branch.baseBranch);
        await exec.exec(`git push ${remote} HEAD:${branch}`);
        await checkoutBranch(config.branch.baseBranch, false);
    }
}

async function hasBranch(branch: string): Promise<boolean> {
    const execOption: exec.ExecOptions = { ignoreReturnCode: true };
    let stdout = "";
    execOption.listeners = {
        stdout: (data: Buffer) => {
            stdout += data.toString();
        },
    };

    await exec.exec("git branch", undefined, execOption);

    return (
        0 <=
        stdout
            .split(" ")
            .map((x) => x.trim())
            .indexOf(branch)
    );
}

async function hasRemoteBranch(branch: string): Promise<boolean> {
    const execOption: exec.ExecOptions = { ignoreReturnCode: true };
    let stdout = "";
    execOption.listeners = {
        stdout: (data: Buffer) => {
            stdout += data.toString();
        },
    };

    await exec.exec("git branch -r", undefined, execOption);

    return (
        0 <=
        stdout
            .split(" ")
            .map((x) => x.trim())
            .indexOf(`origin/${branch}`)
    );
}

async function mergeBranch(branch: string) {
    const execOption: exec.ExecOptions = { ignoreReturnCode: true };
    let output = "";
    execOption.listeners = {
        stdout: (data: Buffer) => {
            output += data.toString();
        },
        stderr: (data: Buffer) => {
            output += data.toString();
        },
    };

    await exec.exec(`git merge --no-edit ${branch}`, undefined, execOption);

    if (0 <= output.indexOf("merge failed")) {
        await exec.exec("git merge --abort");
        throw new Error("failed merge branch");
    }
}
