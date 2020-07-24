import { replaceVersion, splitLines } from "../src/file";

test("testSplitLines", () => {
    expect(splitLines("abc")).toEqual(["abc"]);
    expect(splitLines("a\nb\n")).toEqual(["a", "\n", "b", "\n"]);
    expect(splitLines("a\nb\na")).toEqual(["a", "\n", "b", "\n", "a"]);
    expect(splitLines("a\r\nb\r\n")).toEqual(["a", "\r\n", "b", "\r\n"]);
    expect(splitLines("a\r\nb\r\na")).toEqual(["a", "\r\n", "b", "\r\n", "a"]);
    expect(splitLines("a\rb\r")).toEqual(["a", "\r", "b", "\r"]);
    expect(splitLines("a\rb\ra")).toEqual(["a", "\r", "b", "\r", "a"]);
    expect(splitLines("abc\rab\nfk\r\nbc\n")).toEqual(["abc", "\r", "ab", "\n", "fk", "\r\n", "bc", "\n"]);
});

const test1 = `
version name: v1.10.0
version code: 1.10.0
`;
const expect1 = `
version name: v1.10.0
version code: 2.0.0
`;

test("testReplaceVersion1", () => {
    // matched
    expect(replaceVersion(test1, 3, undefined, "2.0.0")).toBe(expect1);
    expect(replaceVersion(test1, 3, 14, "2.0.0")).toBe(expect1);

    // matched and no replace
    expect(replaceVersion(test1, 3, undefined, "1.3.0")).toBe(test1);
    expect(replaceVersion(test1, 3, 14, "1.3.0")).toBe(test1);

    // nomatched
    expect(() => replaceVersion(test1, 1, undefined, "2.0.0")).toThrowError(/.+/);
    expect(() => replaceVersion(test1, 4, undefined, "2.0.0")).toThrowError(/.+/);
});

const test2 = "1.10.0";
const expect2 = "2.0.0";

test("testReplaceVersion2", () => {
    expect(replaceVersion(test2, 1, undefined, "2.0.0")).toBe(expect2);
    expect(replaceVersion(test2, 1, undefined, "1.3.0")).toBe(test2);
    expect(() => replaceVersion(test2, 1, 1, "2.0.0")).toThrowError(/.+/);
});
