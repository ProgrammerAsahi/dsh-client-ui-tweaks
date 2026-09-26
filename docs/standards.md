# Standards and rules

The single source of truth for how this project is written, documented, and changed. Every rule cites its origin. When this document conflicts with older notes or frozen archives, this document wins.

## Precedence

Order decided by the project owner (2026-09-26):

1. **S1** — DeepSeek official plugin development guides (documents inside `deepseek-ai/deepseek-harness`).
2. **S2** — DeepSeek official plugin code and project style (the `@deepseek-ai/*` packages shipped inside DSH Desktop).
3. **S3** — Established third-party / open-source conventions.
4. **L** — Local conventions of this project, only where the above are silent or inapplicable. Every local convention names its owner decision.

When adding a rule, walk this list top-down and cite the first source that governs it. If none does, add it under L with the reason.

## Source catalog

### S1 — DeepSeek official guides

Repository: [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) (public, `master` branch; URLs below verified 2026-09-26).

| Id | Document | Governs |
|----|----------|---------|
| S1-a | [AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md) | Standing engineering rules: registration-as-effect, error handling, comment discipline, JSDoc export contract, model-visible ⟺ logged |
| S1-b | [packages/AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/AGENTS.md) | Package development hard rules: export forms, naming roles, tests layout |
| S1-c | [packages/client/AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/AGENTS.md) | Client UI plugin checklist: `dsh.client` manifest, locale-owned strings, styling tokens |
| S1-d | [docs/cookbook/adding-a-package.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/adding-a-package.md) | Package scaffolding: `package.json` invariants, README canonical section order |
| S1-e | [docs/AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/AGENTS.md) | Documentation tiers (one home per fact), prose rules |
| S1-f | [docs/testing.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/testing.md) | Testing policy: real entry paths, prefer real implementations over mocks |
| S1-g | [.agents/skills/dsh-prose-standard/SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/skills/dsh-prose-standard/SKILL.md) | Comment/JSDoc prose standard: non-obvious contracts only, complete propositions |
| S1-h | [.agents/skills/dsh-doc/SKILL.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/skills/dsh-doc/SKILL.md) | README kind system and metadata rules |
| S1-i | [.agents/skills/dsh-doc/references/review.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/skills/dsh-doc/references/review.md) | README review criteria: Summary word limit, limitation entry format |
| S1-j | [.agents/skills/dsh-doc/templates/package-reference.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/skills/dsh-doc/templates/package-reference.md) | The `package-reference` README template this project follows |
| S1-k | [docs/user/develop/basic/config.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/config.md) | Plugin config principles: no hardcoded tunables, fail loud on bad config |
| S1-l | [docs/user/develop/basic/publish.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md) | Third-party plugin packaging and installation |
| S1-m | [docs/cookbook/extension-cookbook.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/extension-cookbook.md) | Extension-point discipline: no row modifies the loop |
| S1-n | [CONTRIBUTING.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/CONTRIBUTING.md) | Ecosystem participation: publish plugins with the `dsh-plugin` GitHub topic |

### S2 — DeepSeek official plugin packages

Shipped inside DSH Desktop under `node_modules/@deepseek-ai/` (244 packages inspected 2026-09-26).

| Source | Governs |
|--------|---------|
| `@deepseek-ai/dsh-client-ui-workspace` | README section layout; `lib/client.js` naming and error-handling style |
| `@deepseek-ai/dsh-client-ui-primitives` | JSDoc `@param x - desc` format; SCREAMING constants; `README.i18n.yaml` bilingual pairing |
| all `@deepseek-ai/*` packages | `package.json` field conventions (description, files whitelist, exports, repository); MIT LICENSE text |

### S3 — Third-party conventions

| Id | Source | Governs |
|----|--------|---------|
| S3-a | [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) | `CHANGELOG.md` structure |
| S3-b | [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) | Version numbers |
| S3-c | [EditorConfig](https://editorconfig.org) | `.editorconfig` (the official harness repo ships one too) |

### L — Local conventions

| Id | Home | Owner decision |
|----|------|----------------|
| L-a | [AGENTS.md](../AGENTS.md) | Standing discipline: five-name consistency, fork anchors, test discipline, Chinese commit messages |
| L-b | [docs/pitfalls.md](pitfalls.md) | Hard constraints this plugin must respect |
| L-c | [docs/development.md](development.md) | Verification workflow and CDP regression checklist |

## Rules

### User documentation

1. **README follows the `package-reference` template**: frontmatter (`description`, `kind`) → H1 → language switch → Summary → Table of Contents → `-----` → Use this package → Understand the implementation (inside `<details>`) → Further Exploration → Model Experience → Known Limitations and Deferred Work → Dev Note → closing bold **Runtime invariant** line. — S1-j, S1-d
2. **Summary is ≤ 100 words**, present tense, and says what the reader can do with the package — not internal component names. — S1-i
3. **Known Limitations entries** use `- **Short name** — consequence`. Durable consumer-visible gaps go here; routine cleanups stay out. — S1-i
4. **Model Experience is written from the model's viewpoint**: per entry `What the model sees` / `Token effect` / `KV Cache effect`, with stable model-visible text quoted verbatim in a titled fenced block. — S1-d (README section spec), S1-h
5. **Bilingual pairing**: `README.md` and `README.zh.md` stay structurally aligned; `README.i18n.yaml` records both git blob hashes; edit both sides in the same change and re-record the hashes. — S2 (pairing sidecar in official packages), S1-h
6. **One home per fact** (documentation tiering): AGENTS.md = standing discipline; README = user documentation; `docs/` = developer guides; `.agents/notes/archived/` = frozen history that is never updated. — S1-e
7. **Prose states current state**, one paragraph per line, and never restates code. — S1-e, S1-g

### Comments and JSDoc

8. **Comments and JSDoc are English.** Chinese appears only in locale strings and model prompts. — S1-a (comment discipline), S2 (all package comments are English); adopted by owner decision 2026-09-26
9. **Comments explain the non-obvious**: contracts, failure modes, timing, ownership, and motives. Never narrate what the code already says. — S1-g
10. **Exported functions carry JSDoc** with `@param name - description` (no type prefixes) and `@returns`; add `@throws`, side effects, and timing when they are part of the contract. — S1-d/S1-g (`verify-export-jsdoc` contract), S2 (primitives JSDoc style)
11. **An empty `catch` names the swallowed error and why it is ignorable.** Keep the `try` to one statement where practical. — S1-a

### Naming and code style

12. **Constants are SCREAMING_SNAKE_CASE, functions camelCase, components PascalCase.** — S2 (official package code)
13. **ESM only** (`"type": "module"`). — S1-a, S1-d

### Package metadata

14. **`package.json` carries**: `name`, a one-sentence `description` ending in a period, `version`, `license: MIT`, `repository`/`bugs`/`homepage`, a `files` whitelist, and explicit `exports`. — S1-d (`package.json` invariants), S2 (package survey)
15. **The `dsh` manifest** declares `bundle.patch` and `client.{platform, inject}` as required by the loader. — S1-c

### Architecture and plugin behavior

16. **Registration is an effect**: everything is registered through `ctx.effect()` / `ctx.on()`, and disposal unregisters. — S1-a
17. **The plugin never rewrites conversation content**; mutations go only through documented session APIs (`fork`, `rename`, `updateQueue`), and user-pinned titles are never overwritten. — L-a (product contract, restated as README Runtime invariant); consistent with S1-m (extension points, no loop modification)
18. **Hard constraints of this plugin** (fork anchor semantics, title truth, credential read-only discipline, DOM anchor rules, loader-patch semantics) live in docs/pitfalls.md and are binding. — L-b

### Error handling

19. **Environmental failures skip silently** with a recorded reason; **configuration errors fail loud** at the earliest resolvable point. — S1-a (fail loud), L-a (skip policy for credential/log faults)

### Testing and verification

20. **Product-visible changes are verified through the real entry path** using disposable test sessions; user sessions and user data files are never touched. — S1-f (real entry paths, prefer real implementations), L-a (test discipline)
21. **Every change runs the checklist**: `node --check` on both halves, five-name consistency, reload smoke, then the CDP four-item regression for behavior changes. — L-c
22. **Every commit keeps the plugin working.** — L-a

### Repository hygiene

23. **LICENSE is MIT**, `Copyright (c) 2026 ProgrammerAsahi`. — S2 (all official packages are MIT), owner decision 2026-09-26
24. **CHANGELOG.md follows Keep a Changelog; versions follow SemVer.** — S3-a, S3-b
25. **`.editorconfig`**: UTF-8, LF, 2-space indent, final newline; trailing whitespace kept in Markdown. — S3-c
26. **Commit messages are Chinese, timestamps are real development time.** — L-a (owner decision)
27. **Public-release privacy gate**: before first push, every revision is scanned for secrets, personal information, and real user data (comments included); offending history is rewritten. User data files (`branches.json`, `autotitle.json`) stay git-ignored. — owner decision 2026-09-25
28. **The repository carries the `dsh-plugin` GitHub topic** for ecosystem discoverability. — S1-n

## Adaptations

Deliberate deviations from S1/S2, each with its reason. Do not "fix" these back without checking the reason first.

- **No monorepo, no CI.** S1's machine gates (`verify-export-jsdoc`, `verify-translation-pairing`, `verify-package-readme-*`, `verify-doc-budgets`) cannot run locally; their rules are followed as human-checkable conventions through the L-c checklist. If CI is ever added, wire these gates first.
- **Only the verified install path is documented.** `dsh plugin` CLI installation is not exercised on this machine; S1-i requires fact-checked commands, so the README documents `link:` install only.
- **Single-file, build-free layout** (`index.js` + `lib/client.js`) instead of the official TypeScript multi-file compiled packages. File organization is local (L-a); comment, naming, and JSDoc rules still follow S1/S2.
- **Testing is a manual CDP checklist**, not vitest suites: the plugin is a small DOM layer with no test harness available at this install shape. S1-f's "real entry path" principle is preserved by testing through DSH Desktop itself.
- **README `kind: package-reference`** is recorded for metadata discipline even though no gate reads it here.

## Changing this document

1. A new or changed rule must cite its source: an S1/S2/S3 identifier (with URL for S1) or an explicit "owner decision" note under L.
2. Behavior changes update `README.md` and `README.zh.md` in the same commit and re-record both hashes in `README.i18n.yaml`.
3. When an S1 document evolves (renamed sections, new gates), update the affected rule and note the date in the rule's citation.
4. Rules are removed only when their source is retracted or an owner decision supersedes them; record the supersession rather than silently deleting.
