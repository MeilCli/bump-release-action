import { parseCommits } from "../src/commit";

const text = `
c1 add ci
c2 add issue template
c3 add codeowner
c4 init`;

test("testParseCommits", () => {
    const commits = parseCommits(text);
    expect(commits.length).toBe(4);

    expect(commits[0].sha).toBe("c1");
    expect(commits[0].message).toBe("add ci");

    expect(commits[1].sha).toBe("c2");
    expect(commits[1].message).toBe("add issue template");

    expect(commits[2].sha).toBe("c3");
    expect(commits[2].message).toBe("add codeowner");

    expect(commits[3].sha).toBe("c4");
    expect(commits[3].message).toBe("init");
});
