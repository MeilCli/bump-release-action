import * as fs from "fs";
import * as semver from "semver";
import * as core from "@actions/core";
import { Option } from "./option";
import { Config } from "./config";

export function replaceVersions(option: Option, config: Config, version: string): boolean {
    let changed = false;

    // <file path, [raw file, calculated file]>
    const files = new Map<string, [string, string]>();

    // read files
    for (const file of config.files) {
        const text = fs.readFileSync(file.filePath).toString();
        files.set(file.filePath, [text, text]);
    }

    // replace versions
    for (const file of config.files) {
        const texts = files.get(file.filePath);
        if (texts == undefined) {
            continue;
        }
        const newText = replaceVersion(texts[1], file.line, file.start, version);
        files.set(file.filePath, [texts[0], newText]);
    }

    // write or output content
    if (option.dryRun) {
        core.info("");
        core.info("--- Dry Run Change Version ---");
    }

    const filePaths: string[] = [];
    files.forEach((_, key) => {
        filePaths.push(key);
    });
    for (const filePath of filePaths) {
        const texts = files.get(filePath);
        if (texts == undefined) {
            continue;
        }
        if (option.dryRun) {
            const diffs = calculateDiff(texts[0], texts[1]);
            if (diffs.length == 0) {
                core.info(`will not change ${filePath}`);
            } else {
                for (const diff of diffs) {
                    core.info(`will change ${filePath}:${diff[2]}`);
                    core.info(`before: ${diff[0]}`);
                    core.info(`after: ${diff[1]}`);
                }
            }
        } else {
            const diff = calculateDiff(texts[0], texts[1]);
            changed = changed || diff.length != 0;
            fs.writeFileSync(filePath, texts[1]);
        }
    }

    return changed;
}

export function replaceVersion(text: string, line: number, start: number | undefined, version: string): string {
    const lines = splitLines(text);
    const result: string[] = [];
    let replaced = false;

    for (let i = 0; i < lines.length; i++) {
        if (i % 2 == 1) {
            // is lineBreak
            result.push(lines[i]);
            continue;
        }
        const lineNumber = i / 2 + 1;
        if (lineNumber != line) {
            result.push(lines[i]);
            continue;
        }

        const searchStart = start ?? 0;
        const searchText = lines[i].slice(searchStart, lines[i].length);
        const match = searchText.match(/\d+\.\d+\.\d+/);
        if (match == null) {
            throw new Error(`cannot find replace version, ${line}:${start ?? 0} \n${text}`);
        }
        const matchedVersion = match[0];
        const matchedIndex = match.index;
        if (matchedIndex == null) {
            throw new Error("cannot find replace version index");
        }

        if (semver.lte(version, matchedVersion)) {
            result.push(lines[i]);
            replaced = true;
            continue;
        }
        result.push(
            lines[i].slice(0, searchStart + matchedIndex) +
                version +
                lines[i].slice(searchStart + matchedIndex + matchedVersion.length, lines[i].length)
        );
        replaced = true;
    }

    if (replaced == false) {
        throw new Error("did not replaced version");
    }

    return result.join("");
}

export function splitLines(text: string): string[] {
    const result: string[] = [];
    for (let i = 0; i < text.length; ) {
        const [index, lineBreakSize] = indexOfLine(text, i);
        if (index < 0) {
            const line = text.slice(i, text.length);
            result.push(line);
            i += line.length;
            continue;
        }
        const line = text.slice(i, index);
        const lineBreak = text.slice(index, index + lineBreakSize);
        result.push(line);
        result.push(lineBreak);
        i += line.length + lineBreak.length;
    }
    return result;
}

// return [index, size]
function indexOfLine(text: string, start: number): [number, number] {
    const rn = text.indexOf("\r\n", start);
    const r = text.indexOf("\r", start);
    const n = text.indexOf("\n", start);
    const index = min(rn, r, n, 0);
    if (index == rn) {
        return [index, 2];
    } else {
        return [index, 1];
    }
}

function min(i1: number, i2: number, i3: number, lowerLimit: number): number {
    if (lowerLimit <= i2 && (i1 < lowerLimit || i2 < i1) && (i3 < lowerLimit || i2 < i3)) {
        return i2;
    }
    if (lowerLimit <= i3 && (i1 < lowerLimit || i3 < i1) && (i2 < lowerLimit || i3 < i2)) {
        return i3;
    }
    return i1;
}

function calculateDiff(text1: string, text2: string): [string, string, number][] {
    const lines1 = splitLines(text1);
    const lines2 = splitLines(text2);
    if (lines1.length != lines2.length) {
        throw new Error("not equal lines length");
    }

    const result: [string, string, number][] = [];
    for (let i = 0; i < lines1.length; i++) {
        if (i % 2 == 1) {
            continue;
        }
        const lineNumber = i / 2 + 1;

        if (lines1[i] != lines2[i]) {
            result.push([lines1[i], lines2[i], lineNumber]);
        }
    }

    return result;
}
