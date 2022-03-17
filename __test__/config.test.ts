import * as Config from "../src/config";

const testFull = `
release:
  title-prefix: 'v'
  title-postfix: ' Released!'
  body-title: 'Changed'
  body-when-empty-changes: 'No changes'
  initial-version: '0.0.1'
  tag-prefix: 'v'
  tag-postfix: '-stable'
  sort-by: 'note'
  sort-direction: 'ascending'
  commit-note-replacers:
    - replace-prefix: 'feature: '
      new-prefix: 'feature '
    - replace-prefix: 'document: '
      new-prefix: 'document '
  pull-request-commit: 'include_merge_commit_only'
branch:
  base-branch: 'develop'
  version-branch-prefix: 'v'
  version-branch-postfix: '-stable'
  create-major-version-branch: false
  create-minor-version-branch: true
  bump-version-commit-prefix: 'v'
  bump-version-commit-postfix: '-stable'
categories:
  - title: 'Feature'
    labels:
      - 'feature'
    skip-label: 'skip'
    commits:
      - 'feature:'
    changes-prefix: '🎁'
    changes-postfix: '😊'
bump:
  default: 'minor'
  major:
    labels:
      - 'major'
    commits:
      - 'major:'
  minor:
    labels:
      - 'minor'
    commits:
      - 'minor:'
  patch:
    labels:
      - 'patch'
    commits:
      - 'patch:'
files:
  - file-path: 'version1.txt'
    line: 1
    start: 10
  - file-path: 'version2.txt'
    line: 2
  - start: 5
`;

test("testFull", () => {
    const config = Config.getConfigFromYaml(testFull);

    expect(config.release.titlePrefix).toBe("v");
    expect(config.release.titlePostfix).toBe(" Released!");
    expect(config.release.bodyTitle).toBe("Changed");
    expect(config.release.bodyWhenEmptyChanges).toBe("No changes");
    expect(config.release.initialVersion).toBe("0.0.1");
    expect(config.release.tagPrefix).toBe("v");
    expect(config.release.tagPostfix).toBe("-stable");
    expect(config.release.sortBy).toBe("note");
    expect(config.release.sortDirection).toBe("ascending");
    expect(config.release.pullRequestCommit).toBe("include_merge_commit_only");

    expect(config.release.commitNoteReplacers.length).toBe(2);
    expect(config.release.commitNoteReplacers[0].replacePrefix).toBe("feature: ");
    expect(config.release.commitNoteReplacers[0].newPrefix).toBe("feature ");
    expect(config.release.commitNoteReplacers[1].replacePrefix).toBe("document: ");
    expect(config.release.commitNoteReplacers[1].newPrefix).toBe("document ");

    expect(config.branch.baseBranch).toBe("develop");
    expect(config.branch.versionBranchPrefix).toBe("v");
    expect(config.branch.versionBranchPostfix).toBe("-stable");
    expect(config.branch.createMajorVersionBranch).toBe(false);
    expect(config.branch.createMinorVersionBranch).toBe(true);
    expect(config.branch.bumpVersionCommitPrefix).toBe("v");
    expect(config.branch.bumpVersionCommitPostfix).toBe("-stable");

    expect(config.categories.length).toBe(1);
    expect(config.categories[0].title).toBe("Feature");
    expect(config.categories[0].labels).toEqual(["feature"]);
    expect(config.categories[0].skipLabel).toBe("skip");
    expect(config.categories[0].commits).toEqual(["feature:"]);
    expect(config.categories[0].changesPrefix).toBe("🎁");
    expect(config.categories[0].changesPostfix).toBe("😊");

    expect(config.bump.default).toBe("minor");
    expect(config.bump.major.labels).toEqual(["major"]);
    expect(config.bump.major.commits).toEqual(["major:"]);
    expect(config.bump.minor.labels).toEqual(["minor"]);
    expect(config.bump.minor.commits).toEqual(["minor:"]);
    expect(config.bump.patch.labels).toEqual(["patch"]);
    expect(config.bump.patch.commits).toEqual(["patch:"]);

    expect(config.files.length).toBe(2);
    expect(config.files[0].filePath).toBe("version1.txt");
    expect(config.files[0].line).toBe(1);
    expect(config.files[0].start).toBe(10);
    expect(config.files[1].filePath).toBe("version2.txt");
    expect(config.files[1].line).toBe(2);
});

test("testEmpty", () => {
    const config = Config.getConfigFromYaml("");

    expect(config.release.titlePrefix).toBeUndefined();
    expect(config.release.titlePostfix).toBeUndefined();
    expect(config.release.bodyTitle).toBe(Config.defaultBodyTitle);
    expect(config.release.bodyWhenEmptyChanges).toBe(Config.defaultBodyWhenEmptyChanges);
    expect(config.release.initialVersion).toBe(Config.defaultInitialVersion);
    expect(config.release.tagPrefix).toBeUndefined();
    expect(config.release.tagPostfix).toBeUndefined();
    expect(config.release.sortBy).toBe("commit_at");
    expect(config.release.sortDirection).toBe("descending");

    expect(config.release.commitNoteReplacers.length).toBe(0);

    expect(config.branch.baseBranch).toBe(Config.defaultBaseBranch);
    expect(config.branch.versionBranchPrefix).toBeUndefined();
    expect(config.branch.versionBranchPostfix).toBeUndefined();
    expect(config.branch.createMajorVersionBranch).toBe(Config.defaultCreateMajorVersionBranch);
    expect(config.branch.createMinorVersionBranch).toBe(Config.defaultCreateMinorVersionBranch);
    expect(config.branch.bumpVersionCommitPrefix).toBeUndefined();
    expect(config.branch.bumpVersionCommitPostfix).toBeUndefined();

    expect(config.categories.length).toBe(0);

    expect(config.bump.default).toBe(Config.defaultBump);
    expect(config.bump.major.labels.length).toBe(0);
    expect(config.bump.major.commits.length).toBe(0);
    expect(config.bump.minor.labels.length).toBe(0);
    expect(config.bump.minor.commits.length).toBe(0);
    expect(config.bump.patch.labels.length).toBe(0);
    expect(config.bump.patch.commits.length).toBe(0);

    expect(config.files.length).toBe(0);
});

const testEmptyCategoryTitle = `
categories:
  - labels:
      - 'changes'
`;

test("testEmptyCategory", () => {
    const config = Config.getConfigFromYaml(testEmptyCategoryTitle);

    expect(config.release.titlePrefix).toBeUndefined();
    expect(config.release.titlePostfix).toBeUndefined();
    expect(config.release.bodyTitle).toBe(Config.defaultBodyTitle);
    expect(config.release.bodyWhenEmptyChanges).toBe(Config.defaultBodyWhenEmptyChanges);
    expect(config.release.initialVersion).toBe(Config.defaultInitialVersion);
    expect(config.release.tagPrefix).toBeUndefined();
    expect(config.release.tagPostfix).toBeUndefined();
    expect(config.release.sortBy).toBe("commit_at");
    expect(config.release.sortDirection).toBe("descending");

    expect(config.release.commitNoteReplacers.length).toBe(0);

    expect(config.branch.baseBranch).toBe(Config.defaultBaseBranch);
    expect(config.branch.versionBranchPrefix).toBeUndefined();
    expect(config.branch.versionBranchPostfix).toBeUndefined();
    expect(config.branch.createMajorVersionBranch).toBe(Config.defaultCreateMajorVersionBranch);
    expect(config.branch.createMinorVersionBranch).toBe(Config.defaultCreateMinorVersionBranch);
    expect(config.branch.bumpVersionCommitPrefix).toBeUndefined();
    expect(config.branch.bumpVersionCommitPostfix).toBeUndefined();

    expect(config.categories.length).toBe(1);
    expect(config.categories[0].title).toBe(Config.defaultCategoryTitle);
    expect(config.categories[0].labels).toEqual(["changes"]);
    expect(config.categories[0].skipLabel).toBeUndefined();
    expect(config.categories[0].commits.length).toBe(0);
    expect(config.categories[0].changesPrefix).toBeUndefined();
    expect(config.categories[0].changesPostfix).toBeUndefined();

    expect(config.bump.default).toBe(Config.defaultBump);
    expect(config.bump.major.labels.length).toBe(0);
    expect(config.bump.major.commits.length).toBe(0);
    expect(config.bump.minor.labels.length).toBe(0);
    expect(config.bump.minor.commits.length).toBe(0);
    expect(config.bump.patch.labels.length).toBe(0);
    expect(config.bump.patch.commits.length).toBe(0);

    expect(config.files.length).toBe(0);
});
