import * as exec from "@actions/exec";
import * as os from "os";
import { Config } from "./config";

export interface Commit {
    sha: string;
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

    await exec.exec(`git --no-pager log ${config.branch.baseBranch} --pretty=format:"%H %s"`, undefined, option);

    return parseCommits(text);
}

export function parseCommits(text: string) {
    const commitCreator: (line: string) => Commit = (line) => {
        const value = line.trim();
        const spaceIndex = value.indexOf(" ");
        const sha = value.slice(0, spaceIndex);
        const message = value.slice(spaceIndex + 1, value.length);
        return { sha, message };
    };

    return text
        .split(/[\r\n]/)
        .map((x) => x.trim())
        .filter((x) => 0 < x.length)
        .map(commitCreator);
}
