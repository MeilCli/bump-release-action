import * as exec from "@actions/exec";
import * as core from "@actions/core";
import { Config } from "./config";

export interface Commit {
    sha: string;
    unixTime: number;
    message: string;
}

export async function listCommits(config: Config): Promise<Commit[]> {
    const option: exec.ExecOptions = { ignoreReturnCode: true };
    let text = "";
    option.listeners = {
        stdout: (data: Buffer) => {
            text += data.toString();
        },
    };

    await exec.exec(`git --no-pager log ${config.branch.baseBranch} --pretty=format:"%H %at %s"`, undefined, option);

    // write line break
    core.info("");

    return parseCommits(text);
}

export function parseCommits(text: string) {
    const commitCreator: (line: string) => Commit = (line) => {
        const value = line.trim();
        const spaceIndex1 = value.indexOf(" ");
        const spaceIndex2 = value.indexOf(" ", spaceIndex1 + 1);
        const sha = value.slice(0, spaceIndex1);
        const unixTime = parseInt(value.slice(spaceIndex1 + 1, spaceIndex2));
        const message = value.slice(spaceIndex2 + 1, value.length);
        return { sha, unixTime, message };
    };

    return text
        .split(/[\r\n]/)
        .map((x) => x.trim())
        .filter((x) => 0 < x.length)
        .map(commitCreator);
}
