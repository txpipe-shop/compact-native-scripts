# Midnight: Warden Tool

CLI-based code generation tool that produces a **reusable Compact access-control module** from JSON inputs modeled on Cardano native scripts. The generated `Warden.compact` can be imported by any Midnight contract to gate circuits behind multisig-equivalent authorization policies (commitment sets, time locks, and nested combinators).

## Table of Contents

- [Midnight: Warden Tool](#midnight-warden-tool)
  - [Table of Contents](#table-of-contents)
  - [Motivation](#motivation)
  - [How It Works](#how-it-works)
  - [Limitations](#limitations)
  - [Authorization workflow](#authorization-workflow)
    - [Participant](#participant)
    - [Script author](#script-author)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
    - [Install CLI globally](#install-cli-globally)
  - [Usage](#usage)
    - [Compile](#compile)
    - [Test](#test)
  - [E2E Example: TokenSupply](#e2e-example-tokensupply)
  - [Future work](#future-work)

## Motivation

It is desirable to have contracts in Midnight that handle multisignature scripts like in Cardano. In these scripts the authorization condition is that the transaction has signatures from multiple cryptographic keys, according to a requirement that can be "allOf", "anyOf" or "atLeastNOfM".

The goal is to have Midnight contracts that provide access control to circuits following these well-known multisignature patterns. Whereas a common multisignature script involves multiple signatures being gathered on a single transaction before submission, an implementation in Midnight must be different because of the blockchain's own design and limitations.

Midnight doesn't use signatures for transactions involving contracts, so instead the prototype is built on commitments. Commitments are a cryptographic primitive that allows one to commit to a value without revealing it.

In other blockchains, multisignature scripts work by gathering signatures off-chain and submitting a single fully-signed transaction. In Midnight, proofs are what guarantee correctness when a transaction is submitted, but obtaining partial proofs is not feasible and also introduces a problem with the order of authorizations. This is why this implementation uses commitments instead of proofs: a user can commit in one transaction, and the contract later verifies that the required set of commitments has been accumulated across multiple transactions before allowing the protected operation.

There are two other core concerns as well: making the solution simple for the end user, and engaging developers coming from the Cardano ecosystem. Because of these, the usage of this implementation is based on Cardano native scripts, which are scripts composed of clauses like `any`, `all` and `atLeastNOfM`, that refer to the signatures, `after` and `before`, which are time conditions, and regular signature expressions. These scripts can be written using JSON syntax, and the format used here is largely similar to the one accepted by the `cardano-cli` as described in IntersectMBO's Cardano node reference. This simplifies the input to lists of commitments and condition descriptors, and also provides familiarity for Cardano developers. Nevertheless, the usage is different since in Cardano native scripts create script addresses, and in this implementation the authorization functions are Compact circuits that have to be called from within other Compact contracts.

## How It Works

The tool reads a JSON file describing the authorization policy (commitment hashes, time locks, composite conditions) and generates a Compact module called **Warden** with three exported circuits. See [docs/schema.md](docs/schema.md) for the complete schema design documentation, and [docs/design.md](docs/design.md) for a description of the generated Compact code and usage instructions.

| Circuit | Purpose |
|---------|---------|
| `init()` | Initializes the on-ledger maps that encode the policy |
| `commit()` | A user registers their commitment (proves knowledge of a secret + randomness) |
| `verify()` | Checks that the set of committed commitments satisfies the policy conditions |

Any contract that needs access control **imports** `Warden`, calls `init()` in its constructor, exposes `commit()` to participants, and calls `verify()` before any protected operation:

```compact
import "generated/Warden" prefix Warden_;

constructor() {
  Warden_init();
  // ... other initialization logic
}

export circuit protectedAction(): [] {
  Warden_verify();
  // ... application logic
}
```

## Limitations

The compilation of Compact code creates some restrictions: the circuits are compiled into fixed ZK circuits, so every aspect must be determined at compile time. Because of this, abstract data structures with arbitrary or undetermined values are not accepted. Our workaround for these constraints was to hard code the clauses and expected commitments into the circuits. This represents a limitation because the conditions and commitments cannot be changed without recompiling and redeploying the contract.

## Authorization workflow

This tool involves two distinct roles:

### Participant

Each person who needs to authorize operations runs `make-commitment` to generate their **secret pair** (`secret` + `randomness`) and the corresponding **commitment** which will be present in the Compact code.

```bash
pnpm make-commitment -o my-pair.json
```

Optional parameters:
- `-s, --seed <hex>` — 64-character hex seed (deterministic secret generation)
- `-o, --output <path>` — Path to write the result as JSON (if omitted, prints to stdout)

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

Ask each participant to run `pnpm make-commitment` (or `warden-tool make-commitment`) and share the `commitment` hex with you.

**Step 2 — Build the native script**

Write a JSON file describing the authorization conditions. You can either:

- Use the interactive wizard:
  ```bash
  pnpm script-wizard
  ```
  Walks through script node types — commitment (`cmt`), time locks (`after`/`before`), and composites (`any`/`all`/`atLeast`) — and writes the result to a JSON file (defaults to `script.json`).
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

Equivalently, using the global CLI: `warden-tool generate-code -i script.json -o generated/`

This creates `generated/Warden.compact` — a Compact module with the authorization logic baked in.

Optional parameters:
- `-o, --output <path>` — Output directory (default: `generated/`)
- `-t, --test` — Include import/export boilerplate for unit testing

**Step 4 — Import into your project**

```compact
import "generated/Warden";
```

Use `verify()` as a guard before any protected operation.

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

## Usage

### Compile

```bash
pnpm compact
```

Compiles `generated/Warden.compact` and writes the artifacts into `generated/managed`.
To compile from or to a different location, use `compact compile` directly:

```bash
compact compile path/to/Contract.compact path/to/output-dir/contract
```

### Test

```bash
pnpm test
```

It generates the code, compiles it and runs the test suite with Vitest. The default command uses `all-5` from the [examples/inputs](./examples/inputs/) as the input to generate the code.

To use another example, the command must be run like:

```bash
TEST_INPUT=examples/inputs/<example.json> pnpm test
```

## E2E Example: TokenSupply

A complete end-to-end example demonstrating how any application contract can import and use the Warden access-control module.

The top-level contract is **TokenSupply**, which exposes `mint` and `burn` circuits. Both call `Warden_verify()` to check that the required ledger commitments satisfy the configured policy before proceeding. This separation keeps the application logic entirely agnostic to the authorization strategy.

**Authorization flow:**

```
  1. Deploy:    TokenSupply.constructor()  →  Warden.init() populates authorized users
  2. Commit:    Users call TokenSupply.commit() which delegates to Warden.commit()
                to register their secret commitments on-ledger
  3. Mint/Burn: TokenSupply.mint(amount, recipient) calls Warden_verify() internally.
                Only if the committed users satisfy the native script policy
                does the mint proceed
```

The **initial policy** is an `all` of four commitments — all four must be registered before any mint/burn is allowed.

The example includes:
- **Contract** — `TokenSupply.compact` imports `Warden.compact` and wires the guards
- **Witness + private state** — TypeScript implementations for `localSecret()` and `randomness()`
- **Wallet** — Account setup and node connection via the Midnight Wallet SDK
- **API** — Layer that wraps deployment, commit, mint, burn, and state observation
- **CLI** — Interactive menu to drive the dApp end-to-end on a local devnet or Midnight Preview testnet

See the [e2e README](e2e/README.md) for full setup and usage instructions.

## Future work

There are a few ideas on how the project can be improved. First, the inclusion of an "owner" that is the only one authorized to perform operations like initializing the contract and verifying. The current implementation allows anyone who can commit to call the other circuits, which is consistent with how multisignature scripts work in other blockchains. An optional owner role could be added for use cases that need a designated administrator.

Another line of work is evaluating alternative implementations to guarantee the best performance.


