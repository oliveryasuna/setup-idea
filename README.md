# setup-idea

A GitHub Action that installs IntelliJ IDEA on a Linux runner, caches it between runs, and tells you where the launcher landed.

It resolves the exact release through the JetBrains releases API, so `latest` gives you a real, pinned archive and the cache key is tied to that archive. When `latest` moves, the key changes and the cache refreshes on its own. When you pin a version, the cache hits every time. Downloads are checked against the SHA-256 that JetBrains publishes before anything is extracted.

## Usage

```yaml
- id: idea
  uses: oliveryasuna/setup-idea@v1
  with:
    edition: community
    version: latest

- name: Run an inspection
  run: |
    "${{ steps.idea.outputs.binary }}" inspect \
      "$GITHUB_WORKSPACE" \
      .idea/inspectionProfiles/Project_Default.xml \
      inspection-results
```

With `add-to-path` left on (the default), `idea` is already on `PATH`, so you can also just call it directly in later steps:

```yaml
- uses: oliveryasuna/setup-idea@v1
- run: idea --help
```

## Inputs

| Name | Default | Description |
| --- | --- | --- |
| `version` | `latest` | The IDEA version to install, for example `2024.3.1`, or `latest`. |
| `edition` | `community` | `community` or `ultimate`. |
| `cache` | `true` | Cache the installation between runs, keyed to the resolved archive. |
| `cache-key-prefix` | `idea` | Prefix for the cache key. Change it to namespace or bust the cache. |
| `add-to-path` | `true` | Prepend the IDEA `bin` directory to `PATH`. |
| `verify-checksum` | `true` | Verify the download against the published SHA-256 before extracting. |
| `install-dir` | `${RUNNER_TEMP}/idea` | Where to install. |

## Outputs

| Name | Description |
| --- | --- |
| `binary` | Absolute path to the resolved IDEA launcher. |
| `install-dir` | Absolute path to the installation root. |
| `version` | Resolved version, exact even when you asked for `latest`. |
| `build` | Resolved build number. |
| `archive` | The downloaded archive file name, which is what the cache key is built from. |
| `cache-hit` | `true` if the installation came from the cache, otherwise `false`. |

## Notes

- This action targets Linux runners (`x64` and `arm64`). It fails with a clear message on other platforms.
- Ultimate downloads without a license, but you still need one to actually use it. Community does not.
- Turning off `verify-checksum` skips the integrity check. Leave it on unless you have a reason not to.

## Development

The action ships as a single bundled file in `dist/`, which is committed to the repository because GitHub runs it directly with no install step. After changing anything under `src/`, rebuild and commit the result:

```sh
bun install
bun run build
```

CI rejects a pull request whose `dist/` does not match a fresh build, so a stale bundle cannot slip in.

```sh
bun run check   # bun version, lint, package format
bun run build   # bundle to dist/
```

## License

setup-idea is licensed under Apache 2.0. [Full license text](./LICENSE).
