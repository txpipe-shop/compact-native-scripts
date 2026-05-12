# Compact Design

In this document we'll describe the design for the Compact module code that the CLI generates, and how to use in another Compact program.

## Compact Code Description

### `language version`

Every Compact contract starts with the `pragma` keyword to declare a constraint on the either the compiler or language version.
The generated Compact utilizes the `language_version` constraint and the version number is an optional parameter of the generator with the current latest as default.

### `module Warden`

Modules allow namespace management. The `module` keyword creates a named collection of program elements such as ledger and circuit declarations. We define the contract as a module to have a library sort of access to it.

### Ledger

A field declared with `ledger` signifies that it is a part of the contract's public state.

#### `ledger idsToCommitments`

This ledger field stores the actual commitments that users have submitted. The keys are `16-byte` hashes that uniquely identify each composite node within the input script. The values are `sets of 32-byte` commitment hashes: one per user who has committed to that specific composite node.

This structure directly supports nested scripts: each composite script (any, all, atLeast) gets its own entry in the map so that its set of commitments can be evaluated independently. The field starts empty and is populated incrementally by the commit circuit as users submit their commitments.

#### `ledger commitmentsToIds`

This ledger field encodes the static authorization rules derived from the input script. The keys are the `32-byte` hashes of every commitment that the contract authorizes (each `cmt` field in the input JSON). The values are the `sets of 16-byte` script identifiers where each commitment is expected to appear.
A single commitment hash may map to multiple set IDs if it appears as a child of more than one composite node within the script tree.

### Witness

The witness function `localSecret` aims to obtain a secret `Bytes<32>` value from the wallet. This value will be used to hash the commitment that will be stored, so it shouldn't change.

### Circuits

#### `init circuit`

This circuit initializes the ledger for the module. For each commitment hash, `commitmentsToIds` is pre-populated with hardcoded `insert` calls, mapping each hash to the set of IDs where that commitment is expected. The ID values match the keys in `idsToCommitments`. Meanwhile, `idsToCommitments` is initialized empty.

#### `commit circuit`

This circuit adds a users commitment to the contract's ledger. This aims to mimic the behavior of a multisignature script in which each wallet adds their signature to a transaction. The circuit checks a provided commitment (obtained via a witness or a builtin function) against the ledger's `commitmentsToIds`: if it belongs, it adds the commitment to the respective sets in `idsToCommitments`, if it doesn't, the commitment wasn't authorized and nothing is added.

#### `verify circuit`

This circuit verifies that all of the expected conditions are met. These conditions include:

- the commitments present in the ledger satisfy the predetermined clauses,
- and the block corresponds with the desired height, if any.

## Usage

To use the generated code in your own project, you need to add the `Warden.compact` file with your source code, and import it wherever you need it using:

```compact
import "<path_to_file>/Warden";
```

You can use the `prefix` keyword to have the circuits accessible as <prefix><circuit*name>, e.g. `import "<path_to_file>/Warden" prefix Warden*;` means "Warden_init", "Warden_commit" and "Warden_verify" are in scope.
