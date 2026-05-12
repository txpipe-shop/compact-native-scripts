# Compact native scripts

CLI-based application to generate compact code that checks commitments based on Cardano native scripts. Accepts JSON inputs structured around native script patterns, supporting nested conditions (`any`, `all`, `atLeast`).

The idea is that the CLI generates a Compact contract module that can be used to grant access to circuits based on a set of commitments. The contract has two exported circuits: `commit` and `verify`:

- `commit` is used by a user when it wants to add its commitment to the set to authorize a certain circuit running.
- `verify` is used within a circuit to ensure that it will be run if and only if the set of commitments present satisfies the predefined assertions.
  The predefined assertions are constructed based on Cardano native scripts.

## Prerequisites

- compact 0.4.0
- pnpm 10.30.1

## Usage

```bash
pnpm install
pnpm start -i <input-file>
```

Generates a Compact contract module from a JSON input file. The input file defines the script tree (commitment hashes, composite conditions, time locks)
following the schema documented below.

Output is written to generated/Warden.compact.

### Compile

```bash
pnpm compact
```

Compiles the generated Compact code and writes the artifacts into generated/managed.

### Test

```bash
pnpm test
```

Runs the test suite with Vitest.

## Documentation

See [docs/schema.md](docs/schema.md) for the complete schema design documentation, and [docs/design.md](docs/design.md) for a description of the Compact code that the CLI generates.
