# Commit calculating strategy

Pull request can recieved from other owner repository. In that case, we want not decided release note and version by others.  
So, default strategy is exclude pull request commit.

## Option
This option is set by `release: pull-request-commit:`

### `exclude`(default)

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

### `include`

```mermaid
gitGraph:
    commit id: "1"
    commit id: "2"
    branch pr
    commit id: "3"
    commit id: "4"
    checkout main
    merge pr id: "merge pull request" tag:"label"
    commit id: "5"
```

### `include_merge_commit_only`

```mermaid
gitGraph:
    commit id: "1"
    commit id: "2"
    branch pr
    commit id: "3" type:reverse
    commit id: "4" type:reverse
    checkout main
    merge pr id: "merge pull request" tag:"label"
    commit id: "5"
```

### `include_branch_commit_only`

```mermaid
gitGraph:
    commit id: "1"
    commit id: "2"
    branch pr
    commit id: "3"
    commit id: "4"
    checkout main
    merge pr id: "merge pull request" type:reverse tag:"label"
    commit id: "5"
```
