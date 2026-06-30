# Compact Design

In this document we'll describe the design for the Compact module code that the CLI generates, and how to use in another Compact program.

## Compact Code Description

### `language version`

Every Compact contract starts with the `pragma` keyword to declare a constraint on the either the compiler or language version.
The generated Compact utilizes the `language_version` constraint and the version number is an optional parameter of the generator with the current latest version as default.

### `module Warden`

Modules allow namespace management. The `module` keyword creates a named collection of program elements such as ledger and circuit declarations. We define the contract as a module to have a library sort of access to it.

## Commitment-based contract

When the input script contains at least one `cmt` script, the contract manages a set of commitments on-chain. This section describes the ledger state, witness functions, and circuits that make up this configuration.

### Ledger

A field declared with `ledger` signifies that it is a part of the contract's public state.

#### `ledger idsToCommitments`

This ledger field stores the actual commitments that users have submitted. The keys are `8-byte` identifiers that uniquely represent each composite node's position within the script tree. The values are `sets of 32-byte` commitment hashes: one per user who has committed to that specific composite node.

Each key is derived by padding the node's dot-separated tree path (e.g. `"0"`, `"0_1"`) to 8 bytes. This structure directly supports nested scripts: each composite node (any, all, atLeast) gets its own entry so its set of commitments can be evaluated independently. The field starts empty and is populated incrementally by the `commit` circuit as users submit their commitments.

#### `ledger commitmentsToIds`

This ledger field encodes the static authorization rules derived from the input script. The keys are `32-byte` hashes of every commitment that the contract authorizes (each `cmt` field in the input JSON). The values are `sets of 8-byte` script-tree position identifiers (padded paths) where each commitment is expected to appear.

A single commitment hash may map to multiple path identifiers if it appears as a child of more than one composite node within the script tree. This field is populated once during `init` and remains read-only thereafter.

### Witness

The witness function `localSecret` fetches a secret `Bytes<32>` value from the wallet, and `randomness` fetches a specific random `Bytes<32>` value that was used when generating the initial commitment. These values will be used to recompute the commitment at execution time.

### Circuits

#### `init circuit`

This circuit initializes the ledger for the module. For each commitment hash, `commitmentsToIds` is pre-populated with hardcoded `insert` calls, mapping each hash to the set of IDs where that commitment is expected. The ID values match the keys in `idsToCommitments`. Meanwhile, `idsToCommitments` is initialized with the default empty set for each path ID.

#### `commit circuit`

This circuit adds a user's commitment to the contract's ledger. It mimics the behavior of a multisignature script in which each wallet adds their signature to a transaction. The circuit performs these checks:

1. **Contract initialized**: asserts the `init` circuit has been called (`commitmentsToIds` is not empty).
2. **Authorization**: computes the commitment from the user's secret and randomness via `getCommitment`, then asserts it exists in `commitmentsToIds`.
3. **Known path**: asserts the commitment maps to a non-empty set of path identifiers.
4. **No double-commit**: asserts the commitment hasn't already been registered in the target `idsToCommitments` entry.

If all checks pass, the commitment is inserted into the corresponding set in `idsToCommitments`. If any check fails, the circuit aborts so nothing is added.

##### `getCommitment circuit`

This pure circuit generates a commitment from a given secret and randomness using `persistentCommit<Bytes<32>>`. It is called by `commit` to produce the on-chain commitment hash.

#### `verify circuit`

This circuit verifies that all expected conditions are met:

- **Commitment clauses**:checks the commitments exist in the corresponding `idsToCommitments` set via `member()`.
- **Time-lock clauses**: compares the current block's time against the `after`/`before` thresholds using `blockTimeGte()` / `blockTimeLt()`.
- **Composite clauses**: combines child results with `&&` (all), `||` (any), or a summed ternary counter against the required threshold (`atLeast`).

If the root condition passes, the circuit resets all `idsToCommitments` entries to their default (empty) state via `resetToDefault()`. This ensures the same verified state cannot be replayed.

## Timelock-only contract

When the input script contains only time-lock clauses (`after` / `before`) with no `cmt` scripts, the contract is **stateless**: no ledger fields or witness functions are required, and only the `verify` circuit is generated.

### Circuits

`init` and `commit` circuits are not generated — there is no state to initialize or update.

#### `verify` circuit

This circuit checks only the time-lock conditions of the input script. It evaluates the clauses for the desired block time. On success, the circuit does not need to reset any state.

## Usage

To use the generated code in your own project, you need to add the `Warden.compact` file with your source code, and import it wherever you need it using:

```compact
import "<path_to_file>/Warden";
```

You can use the `prefix` keyword to have the circuits accessible as <prefix><circuit\*name>, e.g. `import "<path_to_file>/Warden" prefix Warden_;` means "Warden_init", "Warden_commit" and "Warden_verify" are in scope.

## Test Mode

Passing the `-t` (or `--test`) flag to `generate-code` produces the same Compact module but with additional exports that make the contract testable from an external test harness.

Two changes are made:

1. **Ledger visibility**: both `commitmentsToIds` and `idsToCommitments` are declared with the `export` modifier so they can be read and asserted in tests.
2. **Re-export block**: the module self-imports and re-exports all circuits and ledger fields:

```compact
import Warden;

export { getCommitment, init, commit, verify, idsToCommitments, commitmentsToIds };
```

When there are no commitment clauses (timelock-only), the re-export is limited to:

```compact
import Warden;

export { getCommitment, verify };
```
