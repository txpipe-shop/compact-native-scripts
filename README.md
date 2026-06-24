# Warden tool

CLI-based application to generate compact code that checks commitments and time-lock conditions based on multisignature scripts. Accepts JSON inputs structured around Cardano native script patterns, supporting nested conditions (`any`, `all`, `atLeast`).

The idea is that the CLI generates a Compact contract module that can be used to grant access to circuits based on a set of commitments. The contract has three exported circuits: `init`, `commit` and `verify`:

- `init` is used to initalize the contract's state
- `commit` is used by a user when it wants to add its commitment to the set to authorize a certain circuit running.
- `verify` is used within a circuit to ensure that it will be run if and only if the set of commitments present satisfies the predefined assertions.
  The predefined assertions are constructed based on Cardano native scripts.

## Table of Contents

- [Warden tool](#warden-tool)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
    - [Install CLI globally](#install-cli-globally)
  - [Documentation](#documentation)
  - [Authorization workflow](#authorization-workflow)
    - [Participant](#participant)
    - [Script author](#script-author)
  - [Commands](#commands)
    - [Commitment generator](#commitment-generator)
    - [Script wizard](#script-wizard)
  - [Usage](#usage)
    - [Compact code generator](#compact-code-generator)
    - [Compile](#compile)
    - [Test](#test)
  - [E2E example](#e2e-example)

## Prerequisites

- Compact Devtools 0.4.0 (check with `compact --version`)
- Compact Toolchain 0.31.0 (check with `compact compile --version`)
- PNPM 10.30.1

## Setup

Install dependencies

```bash
pnpm install
```

### Install CLI globally

Build the project, then register the `warden-tool` binary on your PATH:

```bash
pnpm build
pnpm link --global
```

Now `warden-tool` is available as a system-wide command:

```bash
warden-tool --help
warden-tool generate-code -i <input-file>
warden-tool make-commitment -s <seed>
```

> **Note:** `pnpm link --global` creates a symlink to your local build. After pulling changes or rebuilding, the command reflects updates automatically.

## Documentation

See [docs/schema.md](docs/schema.md) for the complete schema design documentation, and [docs/design.md](docs/design.md) for a description of the Compact code that the CLI generates and usage instructions.

## Authorization workflow

This tool involves two distinct roles:

### Participant

Each person who needs to authorize operations runs `make-commitment` to generate their **secret pair** (`secret` + `randomness`) and the corresponding **commitment** which will be present in the Compact code.

```bash
pnpm make-commitment -o my-pair.json
```

This produces a file like:

```json
{
  "secret": "ed192a825b79d3602cd82cdf0c15ad7accfdc06f32bc0062f89a6c09edaf964b",
  "randomness": "1a0a174c772ee1556bf1b980475eaffe2b4bb8112e82f5348e612b93804405da",
  "commitment": "21f314e3679165f234fe8a986f60d2a0308e4b846415fe68f4bf9d3d194ea74c"
}
```

> **Keep your `secret` and `randomness` private** — they prove your identity at circuit execution time.
> **Share only the `commitment` hex** with the script author so it can be included in the authorization policy.

### Script author

The person in charge of building the authorization policy collects the commitments from all participants and runs `generate-code` to produce the Compact contract.

```
Commitments from participants     Native script definition
         │                                 │
         ▼                                 ▼
    ┌──────────────────────────────────────────┐
    │          pnpm generate-code              │
    │          -i script.json                  │
    └──────────────────────────────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │ Warden.compact   │
              │ (authorization   │
              │  contract)       │
              └──────────────────┘
```

**Step 1 — Collect commitments**

Ask each participant to run `make-commitment` and share the `commitment` hex with you.

**Step 2 — Build the native script**

Write a JSON file describing the authorization conditions. You can either:

- Use the interactive wizard:
  ```bash
  pnpm script-wizard
  ```
- Write the JSON manually (see [the schema docs](docs/schema.md) and the [examples directory](examples/inputs/)).

The script references each commitment by its hex hash:

```json
{
  "type": "all",
  "scripts": [
    { "type": "cmt", "hash": "21f314e3679165f234fe8a986f60d2a0308e4b846415fe68f4bf9d3d194ea74c" },
    { "type": "cmt", "hash": "9517dcb986da18099688e88b6fe1fce568fd0eeb7ddbba86a8263dc489f85783" }
  ]
}
```

**Step 3 — Generate the contract**

```bash
pnpm generate-code -i script.json -o generated/
```

This creates `generated/Warden.compact` — a Compact module with the authorization logic baked in.

**Step 4 — Import into your project**

```compact
import "generated/Warden";
```

Use `verify()` as a guard before any protected operation.

## Commands

### Commitment generator

```bash
pnpm make-commitment -s <seed_hex> -o <output-file>
```

Generates a SecretPair comprised of a `secret` and a `randomness`, and the corresponding `commitment` product of these two.
Optional parameters are:

- -s, --seed <hex> 64-character hex seed for the secret
- -o, --output <path> Path to write the result as JSON

### Script wizard

```bash
pnpm script-wizard
```

Launches an interactive wizard that builds a native script schema JSON file
that can be used as input to the `generate-code` command.
Walks through script node types — commitment (`cmt`), time locks (`after`/`before`),
and composites (`any`/`all`/`atLeast`) — and writes the result to a JSON file
(defaults to `script.json`).
Ensure all commitments required have been gathered prior to running this command.

## Usage

### Compact code generator

```bash
pnpm generate-code -i <input-file>
pnpm generate-code -i <input-file> -o <output-dir>
pnpm generate-code -i <input-file> -o <output-dir> -t
```

Generates a Compact contract module (`Warden.compact`) from a JSON input file.
The input file defines the script tree (commitment hashes, composite conditions,
time locks) following the schema documented below.

Optional parameters are:

- `-o, --output <path>` Directory to write the generated Compact code (default: `generated/`)
- `-t, --test` Include import/export boilerplate for unit testing

### Compile

```bash
pnpm compact
```

Compiles the generated Compact code and writes the artifacts into `generated/managed`.

### Test

```bash
pnpm test
```

It generates the code, compiles it and runs the test suite with Vitest. The default command uses `all-5` from the [examples/inputs](./examples/inputs/) as the input to generate the code.

To use another example, the command must be run like:

```bash
TEST_INPUT=examples/inputs/<example.json> pnpm test
```

## E2E example

A complete [end-to-end example](e2e/) demonstrating Warden in action — a token
supply contract that uses Warden to gate mint and burn operations by an
authorization policy (any, all, atLeast, time locks, or combinations).

The flow: **deploy** → participants **commit** → **mint/burn** guarded by
`verify()`. See the [e2e README](e2e/README.md) for setup and usage.
