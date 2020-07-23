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

    return stdout;
}

export async function checkoutBranch(branch: string, create: boolean) {
    if (create) {
        await exec.exec(`git checkout -b ${branch}`);
    } else {
        await exec.exec(`git checkout ${branch}`);
    }
}

export async function pushVersionBranch(option: Option, config: Config, version: string) {
    if (config.branch.createMajorVersionBranch == false && config.branch.createMinorVersionBranch == false) {
        return;
    }
    await exec.exec(`git config --local user.name ${option.commitUser}`);
    await exec.exec(`git config --local user.email ${option.commitEmail}`);

    const remote = `https://x-access-token:${option.githubToken}@github.com/${option.repository}.git`;
    if (config.branch.createMajorVersionBranch) {
        const major = semver.major(version);
        const branch = `${config.branch.versionBranchPrefix}${major}${config.branch.versionBranchPostfix}`;
        const has = await hasBranch(branch);
        await checkoutBranch(branch, has == false);
        await exec.exec("git fetch -p");
        await mergeBranch(config.branch.baseBranch);
        await exec.exec(`git push ${remote} HEAD:${branch}`);
        await checkoutBranch(config.branch.baseBranch, false);
    }
    if (config.branch.createMinorVersionBranch) {
        const major = semver.major(version);
        const minor = semver.minor(version);
        const branch = `${config.branch.versionBranchPrefix}${major}.${minor}${config.branch.versionBranchPostfix}`;
        const has = await hasBranch(branch);
        await checkoutBranch(branch, has == false);
        await exec.exec("git fetch -p");
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
