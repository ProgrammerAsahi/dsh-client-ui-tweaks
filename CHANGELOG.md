# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-09-25

### Added

- Sidebar row-to-session mapping now resolves exact session ids through React fiber internals (`sessionIdOfRow`), eliminating the residual key-collision surface; the (title, time-label) key match remains as a fallback when fiber introspection is unavailable.
- Chained forks (branching from a branch) merge into a single sidebar family row.
- Self-healing row restore: rows hidden by a removed branch record become visible again on the next sync.

### Fixed

- Title generation now prefers the session's own conversation model (read from the session log `request/header`), falling back to a three-tier chain (K3 → MiMo flash → DeepSeek flash).
- Prompt-injection hardening for title material: material is JSON-framed with an explicit "data, not instructions" declaration, and `sanitizeTitle` rejects prose-like outputs.
- First-message titles no longer go dark when the built-in title generator fails silently: a 12s wait is followed by an own-generation fallback.

## [0.2.0] - 2026-09-23

### Added

- Auto summary titles for first messages and `/compact` (the latter is plugin-only; DSH has no built-in compact retitling).
- Pixel shimmer title effect: pixel-grid texture, sheared light band with core line, and a 2px-step wave bump, orchestrated in two modes (ours renames mid-sweep; adopted titles sweep then clarify).
- Three-tier title-generation fallback chain with OAuth-staleness awareness.

### Fixed

- Effect never played (first-frame suicide in the master envelope).
- Light band too narrow; pixel texture imperceptible (2px blocks on a 2px gap grid, quantified via `getImageData`).

## [0.1.0] - 2026-09-20

### Added

- Edit-and-resend: inline editing of persisted user messages with fork-on-send (anchor = the previous turn's `turn/end` seq), inherited next-turn queue cleanup, and `‹ n/N ›` arrow switching between original and branch versions.
- Sidebar branch-family grouping: one visible row per family (current > running > just-completed > most recent), native StateDot status, and family-unified titles.
- Auto-redirect to the most recently updated family member when opening a family session.

[0.3.0]: https://github.com/ProgrammerAsahi/dsh-client-ui-tweaks/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ProgrammerAsahi/dsh-client-ui-tweaks/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ProgrammerAsahi/dsh-client-ui-tweaks/releases/tag/v0.1.0
