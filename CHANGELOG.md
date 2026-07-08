# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-07-08

### Added

- CLI tool with `generate-code`, `make-commitment`, and `script-wizard` commands
- `generate-code` produces a reusable Compact access-control module from a Cardano-style native script JSON input
- `make-commitment` generates secret/randomness pairs for participants
- `script-wizard` interactive prompt for building native script JSON files
- Compact contract circuits: `init()`, `commit()`, `verify()` with full multisig authorization logic
- Support for `allOf`, `anyOf`, and `atLeastNOfM` combinator clauses
- Time lock support (`after` / `before` clauses)
- E2E example: TokenSupply contract with witness, wallet, API, and CLI layers
- CI workflow (`lint.yml`) running format check, lint, and tests on pull requests
- Apache 2.0 license
- Global CLI installation via `pnpm link --global` (`warden-tool`)
- CONTRIBUTING.md with guidelines for bug reports, feature ideas, and pull requests
- CI and license badges in README

### Fixed

- atLeast circuit combinatorial explosion — replaced with a more efficient implementation
- Timelock tests aligned with stateless contract behavior
- Code generation for non-test cases
- Documentation inaccuracies around time constraint checks

### Documentation

- Architecture and schema design docs (`docs/design.md`, `docs/schema.md`)
- Project overview, prerequisites, and setup instructions in README
- Example inputs under `examples/inputs/`
