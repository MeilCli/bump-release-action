import { parseCommits } from "../src/commit";

const text = `
c1 10 add ci
c2 11 add issue template
c3 12 add codeowner
c4 13 init`;

test("testParseCommits", () => {
    const commits = parseCommits(text);
    expect(commits.length).toBe(4);

    expect(commits[0].sha).toBe("c1");
    expect(commits[0].unixTime).toBe(10);
    expect(commits[0].message).toBe("add ci");

    expect(commits[1].sha).toBe("c2");
    expect(commits[1].unixTime).toBe(11);
    expect(commits[1].message).toBe("add issue template");

    expect(commits[2].sha).toBe("c3");
    expect(commits[2].unixTime).toBe(12);
    expect(commits[2].message).toBe("add codeowner");

    expect(commits[3].sha).toBe("c4");
    expect(commits[3].unixTime).toBe(13);
    expect(commits[3].message).toBe("init");
});
