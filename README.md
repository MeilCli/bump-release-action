## bump-release-action
[![CI-Master](https://github.com/MeilCli/bump-release-action/actions/workflows/ci-master.yml/badge.svg)](https://github.com/MeilCli/bump-release-action/actions/workflows/ci-master.yml)  
Bump version and publish release action

This action is bump version from latest release, publish release with changes note and push to version branch. Made it for the development of the action, but it can also be used for other purposes

Features:
- Calculate next version from latest release, Commit and PullRequest
- Create release note by Commit and PullRequest
- Publish release
- Push commits to version branch
- Change the version written in the file

## Table of Contents
- [Example](README.md#example)
- [Input](README.md#input)
- [Output](README.md#output)
- [Configuration](README.md#configuration)
  - [Overview](README.md#overview)
  - [Release](README.md#release)
  - [Branch](README.md#branch)
  - [Categories](README.md#categories)
  - [Bump](README.md#bump)
  - [Files](README.md#files)
- [Attention](README.md#attention)
- [License](README.md#license)

## Example
<div align="center">
<img src="documents/release.png">
</div>

```yaml
# .github/workflows/release.yml:
name: Release

on:
  workflow_dispatch:
    inputs:
      bump:
        description: 'bump type, major or minor or patch or empty string'
        default: ''
      dry_run:
        description: 'dry run, true or false'
        default: 'false'
      draft:
        description: 'draft, true or false'
        default: 'false'
      pre_release:
        description: 'pre release, true or false'
        default: 'false'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run build
      - run: npm run test
      - uses: MeilCli/bump-release-action@v2
        with:
          config_path: '.github/bump.yml'
          bump: ${{ github.event.inputs.bump }}
          dry_run: ${{ github.event.inputs.dry_run }}
          draft: ${{ github.event.inputs.draft }}
          pre_release: ${{ github.event.inputs.pre_release }}
```
You can also pin to a [specific release](https://github.com/MeilCli/bump-release-action/releases) version in the format `@v2.x.x`

```yaml
# .github/bump.yml
release:
  title-prefix: 'v'
  initial-version: '0.0.1'
  tag-prefix: 'v'
  commit-note-replacers:
    - replace-prefix: 'breaking: '
      new-prefix: ''
    - replace-prefix: 'feature: '
      new-prefix: ''
    - replace-prefix: 'change: '
      new-prefix: ''
    - replace-prefix: 'fix: '
      new-prefix: ''
    - replace-prefix: 'document: '
      new-prefix: ''
    - replace-prefix: 'dependency: '
      new-prefix: ''
branch:
  version-branch-prefix: 'v'
  bump-version-commit-prefix: 'v'
categories:
  - title: 'Breaking Changes!'
    labels:
      - 'BreakingChange'
    commits:
      - 'breaking:'
    changes-prefix: ':warning: '
  - title: 'Changes'
    labels:
      - 'Feature'
    commits:
      - 'feature:'
    changes-prefix: ':gift: '
  - title: 'Changes'
    labels:
      - Maintenance
    commits:
      - 'change:'
    changes-prefix: ':hammer: '
  - title: 'Bug Fixes'
    labels:
      - 'Bug'
    commits:
      - 'fix:'
    changes-prefix: ':ambulance: '
  - title: 'Changes'
    labels:
      - 'Documentation'
    commits:
      - 'document:'
    changes-prefix: ':blue_book: '
  - title: 'Dependency Updates'
    labels:
      - 'Dependencies'
    skip-label: 'Development'
    commits:
      - 'dependency:'
    changes-prefix: ':green_book: '
bump:
  default: 'patch'
  major:
    labels:
      - 'BreakingChange'
    commits:
      - 'breaking:'
  minor:
    labels:
      - 'Feature'
    commits:
      - 'feature:'
files:
  - file-path: 'package.json'
    line: 3
  - file-path: 'package-lock.json'
    line: 3

```

### Default commit calculating strategy
```mermaid
gitGraph:
    commit id: "1"
    commit id: "2"
    branch pr
    commit id: "3" type:reverse
    commit id: "4" type:reverse
    checkout main
    merge pr id: "merge pull request" type:reverse tag:"label"
    commit id: "5"
```
Pull request commit is excluded on commit calculating about release note and version.

[more information](./documents/commit-calculating-strategy.md)


## Input
- `repository`
  - required
  - running repository, format: owner/repository
  - default: `${{ github.repository }}`
- `base_url`
  - the URL of where the repository is hosted
  - default: `github.com`
- `github_token`
  - required
  - github token, using to read and write repository
  - default: `${{ github.token }}`
- `commit_user`
  - required
  - the commit user
  - default: `github-action`
- `commit_email`
  - required
  - the commit user`s email
  - default: `41898282+github-actions[bot]@users.noreply.github.com`
- `config_path`
  - required
  - config file path
- `bump`
  - how to bump version, value: `major` or `minor` or `patch` or empty string
  - if set `major`, `minor` or `patch`, priority execute to bump version
- `dry_run`
  - if `true`, not create and push this changes, and output release informations
- `draft`
  - if `true`, create release as draft
- `pre_release`
  - if `true`, create release as pre release

## Output
- `current_version`
  - calculated current version
- `next_version`
  - calculated next version
- `release`
  - the response json of created release

## Configuration
### Overview
```yaml
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
  pull-request-commit: 'exclude'
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
```

### Release
- `title-prefix`
  - prefix of release title
- `title-postfix`
  - postfix of release title
- `body-title`
  - title of release body
  - default: `What's Changed`
- `body-when-empty-changes`
  - body of release when empty changes
  - default: `This release has not changes`
- `initial-version`
  - resolved version if cannot get latest release
  - default: `1.0.0`
- `tag-prefix`
  - prefix of tag
- `tag-postfix`
  - postfix of tag
- `sort-by`
  - sort release notes by `note` or `commit_at`
  - default: `commit_at`
- `sort-direction`
  - sort release notes direction `descending` or `ascending`
  - default: `descending`
- `commit-note-replacers`
  - replacer of release note from Commit
- `commit-note-replacers.replace-prefix`
  - replace prefix string
- `commit-note-replacers.new-prefix`
  - new prefix string
- `pull-request-commit`
  - option of including PullRequest's commit to release note
  - `exclude`: don't include PullRequest's commit
  - `include`: include PullRequest's commit(merge commit and branch commit)
  - `include_merge_commit_only`: include PullRequest's merge commit
  - `include_branch_commit_only`: include PullRequest's branch commit
  - default: `exclude`
  - [more information](./documents/commit-calculating-strategy.md)
### Branch
- `base-branch`
  - base branch of running this action
  - default: `master`
- `version-branch-prefix`
  - prefix of version branch name
- `version-branch-postfix`
  - postfix of version branch name
- `create-major-version-branch`
  - if `true`, create major version branch and push commit to it
  - default: `true`
  - example: 
    - published version(`1.2.3`) => major version branch(`${version-branch-prefix}1${version-branch-postfix}`)
    - published version(`1.2.3`) and prefix `v` => major version branch(`v1`)
- `create-minor-version-branch`
  - if `true`, create minor version branch and push commit to it
  - default: `false`
  - example:
    - published version(`1.2.3`) => minor version branch(`${version-branch-prefix}1.2${version-branch-postfix}`)
    - published version(`1.2.3`) and prefix `v` => minor version branch(`v1.2`)
- `bump-version-commit-prefix`
  - prefix of bump version commit
  - using only when provided `files` configurations
- `bump-version-commit-postfix`
  - postfix of bump version commit
  - using only when provided `files` configurations

### Categories
This configuration is array value, and Judgment is given priority in order from the top

- `title`
  - title of this categories
  - default: `Changes`
- `labels`
  - exact match label to determine this category
  - value: array of string
- `skip-label`
  - exact match label to determine skip
- `commits`
  - prefix match commit message to determine this category
  - value: array of string
- `changes-prefix`
  - prefix of this changes, using when release note creation
- `changes-postfix`
  - postfix of this changes, using when release note creation

### Bump
- `default`
  - default bump type
  - value: `major`, `minor` or `patch`
  - default: `patch`
- `major`
  - condition to judge as major bump
  - if it is determined, it will be executed in preference to minor bump and patch bump
- `major.labels`
  - exact match label to determine this bump
  - value: array of string
- `major.commits`
  - prefix match commit message to determine this bump
  - value: array of string
- `minor`
  - condition to judge as minor bump
  - if it is determined, it will be executed in preference to patch bump
- `minor.labels`
  - exact match label to determine this bump
  - value: array of string
- `minor.commits`
  - prefix match commit message to determine this bump
  - value: array of string
- `patch`
  - condition to judge as patch bump
- `patch.labels`
  - exact match label to determine this bump
  - value: array of string
- `patch.commits`
  - prefix match commit message to determine this bump
  - value: array of string

### Files
This configuration is array value, if provide configuration, commit version up and push commit to base branch

- `file-path`
  - file that want version up
- `line`
  - number of lines containing the version want to version up
- `start`
  - start of line containing the version want to version up
  - optional
  - note: use when contained multiple version in single line

## Attention
Currently, cannot publish action to Marketplace using API. So, if you publish action to Marketplace, open release that published by this action, click edit release, and click update release button. If you are using a version branch, it is enough to do it only when the version branch changes or when the README is updated.

## Contributes
[<img src="https://gist.github.com/MeilCli/55d5d8274a7be00b4ff9f32b618a911e/raw/774ebc82e5fd1cde2e1d2dce77cd92b720861fea/metrics_contributors.svg">](https://github.com/MeilCli/bump-release-action/graphs/contributors)

### Could you want to contributes?
see [Contributing.md](./.github/CONTRIBUTING.md)

## License
[<img src="https://gist.github.com/MeilCli/55d5d8274a7be00b4ff9f32b618a911e/raw/774ebc82e5fd1cde2e1d2dce77cd92b720861fea/metrics_licenses.svg">](LICENSE.txt)

### Using
- [actions/toolkit](https://github.com/actions/toolkit), published by [MIT License](https://github.com/actions/toolkit/blob/master/LICENSE.md)
- [nodeca/js-yaml](https://github.com/nodeca/js-yaml), published by [MIT License](https://github.com/nodeca/js-yaml/blob/master/LICENSE)
- [npm/node-semver](https://github.com/npm/node-semver), published by [ISC License](https://github.com/npm/node-semver/blob/master/LICENSE)
