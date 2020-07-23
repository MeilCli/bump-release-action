## bump-release-action
Bump version and publish release action

This action is bump version from latest release, publish release with changes note and push to version branch. Made it for the development of the action, but it can also be used for other purposes

## Example
```yaml
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

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v1
        with:
          node-version: 12
      - run: npm install
      - run: npm run build
      - run: npm run test
      - uses: MeilCli/bump-release-action@master
        with:
          config_path: '.github/bump.yml'
          bump: ${{ github.event.inputs.bump }}
          dry_run: ${{ github.event.inputs.dry_run }}
```

## License
MIT License

### Using
- [actions/toolkit](https://github.com/actions/toolkit), published by [MIT License](https://github.com/actions/toolkit/blob/master/LICENSE.md)
- [nodeca/js-yaml](https://github.com/nodeca/js-yaml), published by [MIT License](https://github.com/nodeca/js-yaml/blob/master/LICENSE)
- [npm/node-semver](https://github.com/npm/node-semver), published by [ISC License](https://github.com/npm/node-semver/blob/master/LICENSE)
