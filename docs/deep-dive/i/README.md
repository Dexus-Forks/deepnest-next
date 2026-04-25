# Deep dive — Group I: CI / release

> Per-file deep dives for the GitHub Actions workflows under
> `.github/workflows/`. These are the three pipelines that gate every
> commit to `main`, every PR, and every published release. Sibling of
> the [DEE-11](../../../) parent issue and tracked under [DEE-20](../../../).

## Files in this group

| File | Trigger | Deep dive |
|---|---|---|
| `.github/workflows/build.yml` | `push` to `main`, `pull_request`, `workflow_dispatch` | [.github__workflows__build.yml.md](./.github__workflows__build.yml.md) |
| `.github/workflows/build_release.yml` | `release: published`, `workflow_dispatch` | [.github__workflows__build_release.yml.md](./.github__workflows__build_release.yml.md) |
| `.github/workflows/playwright.yml` | `push` / `pull_request` to `main` (path-filtered), `workflow_dispatch` | [.github__workflows__playwright.yml.md](./.github__workflows__playwright.yml.md) |

## Filename discrepancy vs DEE-11 scope

The DEE-11 parent issue listed the release pipeline as
`.github/workflows/release.yml`. The actual filename in the repo is
**`build_release.yml`** (workflow `name:` is `build release` with a
space). The deep-dive filename in this group follows the actual
on-disk filename. See
[`build_release.yml` deep-dive § 1](./.github__workflows__build_release.yml.md)
for the full callout.

## Pipeline shape (what runs when)

```
                            +------------------------+
push to main / open PR ---->|       build.yml        |  matrix: 4 cells
                            |  (compile + package)   |  (Linux/Windows × Node 20/22)
                            +------------------------+   no artifacts uploaded
                                       |
                                       | path filter:
                                       |  **.json **.js **.ts **.jsx **.tsx **.yml
                                       v
                            +------------------------+
                            |     playwright.yml     |  matrix: 1 cell (ubuntu-latest)
                            |  (xvfb + Chromium E2E) |  uploads: playwright-report (7d)
                            +------------------------+

GitHub release published ---+------------------------+
                            |   build_release.yml    |  matrix: 5 cells
                            |  Linux x64 / arm64     |  (2 Linux + 2 macOS + 1 Windows)
                            |  macOS x64 / arm64     |
                            |  Windows x64           |  uploads: per-OS .zip → release assets
                            +------------------------+
                                       |
                                       v
                              [users download from
                               GitHub Releases page]
```

## Master job × runner × secret table

| Workflow | Job | Runners | Steps (high level) | Secrets read | Artifacts |
|---|---|---|---|---|---|
| `build.yml` | `build` | `windows-2022`, `ubuntu-22.04` × Node `20.x`, `22.x` | checkout · Boost (Ubuntu) · Node setup · `npm install && npm run build` · `npm run dist` | _none_ | _none_ |
| `build_release.yml` | `build-and-release-linux` | `ubuntu-24.04`, `ubuntu-24.04-arm` (Node 22.x) | checkout · Boost · Node setup · ARCH detect · `getLatestRelease` · `npm install && npm run build` · `npx @electron/packager` · `zip -r` · `upload-release-asset` | `secrets.GITHUB_TOKEN` | `deepnest-${TAG}-linux-x64.zip`, `deepnest-${TAG}-linux-arm64.zip` |
| `build_release.yml` | `build-and-release-macos` | `macos-13`, `macos-latest` (Node 22.x) | checkout · Node setup · ARCH detect · `getLatestRelease` · `npm install && npm run build` · `npx @electron/packager` · `zip -r` · `upload-release-asset` | `secrets.GITHUB_TOKEN` | `deepnest-${TAG}-darwin-x64.zip`, `deepnest-${TAG}-darwin-arm64.zip` |
| `build_release.yml` | `build-and-release-windows` | `windows-latest` (Node 22.x) | checkout · Node setup · ARCH=x64 · `getLatestRelease` · `npm install && npm run build` · `npx @electron/packager` + `7z a` · `upload-release-asset` | `secrets.GITHUB_TOKEN` | `deepnest-${TAG}-win32-x64.zip` |
| `playwright.yml` | `test` | `ubuntu-latest` (Node `lts/*`) | Boost · checkout · Node setup · `npm ci` · chrome-sandbox SUID fix · `npm run build` · `npx playwright install --with-deps chromium` · `xvfb-run npm test` (`DEBUG=pw:browser*`) · upload report | _none_ | `playwright-report/` (retention 7 d) |

## Cross-link: codesign hand-off (Group A)

The release pipeline **does not exercise** the Authenticode codesign
script in [`helper_scripts/sign_windows.js`](../a/helper_scripts__sign_windows.js.md):

- The script is wired into `package.json#build.win.signtoolOptions.sign`
  (`package.json:135-140`), which is `electron-builder` config.
- `build_release.yml` runs `npx @electron/packager`, which **does not**
  read `electron-builder`'s `signtoolOptions`.
- The `electron-builder` paths (`scripts.build-dist`,
  `scripts.build-dist-signed` — `package.json:23-24`) are not invoked
  from any workflow.

Net result: **published Windows release zips ship unsigned.** Group A's
deep-dive ([§ 2 _Wiring_](../a/helper_scripts__sign_windows.js.md)) has
the same finding from the script side. Full analysis and remediation
options in
[`build_release.yml` deep-dive § 6](./.github__workflows__build_release.yml.md).

The macOS jobs are also unsigned and un-notarised — there is no
`osxSign` / `osxNotarize` step and no Apple Developer secrets
configured.

## Branch protection / required checks

**Unverified — needs to be checked against repo settings** at
`github.com/deepnest-next/deepnest → Settings → Branches → Branch
protection rules`. The DEE-20 task brief asked to flag this if not
encoded in the YAML. From the workflow side the candidate check names are:

| Workflow | Likely required-check name |
|---|---|
| `build.yml` | `build (ubuntu-22.04, 20.x)`, `build (ubuntu-22.04, 22.x)`, `build (windows-2022, 20.x)`, `build (windows-2022, 22.x)` |
| `playwright.yml` | `test (ubuntu-latest)` |
| `build_release.yml` | _not a merge gate; `release` event only_ |

The release workflow can still be a *required deployment status* if a
GitHub Environment with reviewers is configured — that is also
unverified.

## Cross-workflow inconsistencies

| Property | `build.yml` | `build_release.yml` | `playwright.yml` |
|---|---|---|---|
| Lockfile install | `npm install` | `npm install` | `npm ci` |
| Node pin | `20.x`, `22.x` | `22.x` | `lts/*` (floating) |
| Submodule checkout | `recursive` | `recursive` | _none_ |
| Path filter on triggers | _none_ | `release` event only | `**.json/**.js/**.ts/**.jsx/**.tsx/**.yml` |
| Boost step | yes (Ubuntu) | yes (Linux jobs; dead `if:` in macOS job) | yes (Ubuntu) |
| `cache: npm` on `actions/setup-node` | _no_ | _no_ | _no_ |
| Artifact upload | _none_ | per-OS zip → release | `playwright-report/` |
| Codesign hook invoked | n/a (CI only) | **no** (`@electron/packager` bypasses `electron-builder` `signtoolOptions`) | n/a |

These divergences mean a transitive-dep regression that breaks `npm ci`
will be caught by `playwright.yml` but not by the build workflows;
conversely, a Node-LTS bump regression first appears in `playwright.yml`
because it is the only workflow not pinned.

## Per-file template

Each deep dive uses the `DEE-11` shared template
(see [Group D README](../d/README.md#per-file-template) for the
canonical narrative slots):

1. **Purpose** — opening paragraph
2. **Triggers** — `on:` events and filters
3. **Job table** — `job | runner | steps | secrets read | artifacts produced`
4. **Step-by-step** — what each step does and why (with line refs)
5. **Secrets and permissions** — explicit table
6. **Coverage gaps and smells** — what is *not* tested / what is
   inconsistent / what is dead config
7. **Branch protection / required check** — flagged "unverified" where
   it cannot be derived from the YAML
8. **References** — cross-links to sibling docs and source files

## Acceptance criteria coverage (DEE-20)

| DEE-20 requirement | Where it is covered |
|---|---|
| Filename discrepancy `release.yml` → `build_release.yml` flagged | Above (this README), [`build_release.yml` § 1](./.github__workflows__build_release.yml.md) |
| `job \| runner \| steps \| secrets read \| artifacts produced` table per workflow | Above (master table) and § 3 / § 4 of each per-file doc |
| Codesign hand-off to [`helper_scripts/sign_windows.js`](../a/helper_scripts__sign_windows.js.md) called out | [`build_release.yml` § 6](./.github__workflows__build_release.yml.md), this README "Cross-link: codesign hand-off" |
| Branch-protection / required-check status | Marked **"unverified — check repo settings"** in each per-file doc and in this README |
| Output filenames | `docs/deep-dive/i/.github__workflows__build.yml.md`, `docs/deep-dive/i/.github__workflows__build_release.yml.md`, `docs/deep-dive/i/.github__workflows__playwright.yml.md` ✅ |
