# E2E Example: Token supply control

A Midnight smart contract that mints and burns a token, gated by the
**Warden** access-control module. It demonstrates how Warden can be plugged into
any contract to enforce arbitrary authorization policies (any, all,
atLeast, time locks, or combinations) without modifying the application logic.

## Architecture

The example consists of the following packages:

- **CLI**: CLI-based application to interact with the contract
- **Contract**: Smart contract source code and utilities, comprised itself of two modules:
  - **Warden** (`generated/Warden.compact`) — access-control library generated
    from a native-script JSON input. Manages commitments and verifies that the
    current set of committed users satisfies the configured policy.
  - **TokenSupply** (`e2e/TokenSupply.compact`) — a token supply contract that imports Warden and
    calls `Warden_verify()` before allowing `mint` or `burn`.
- **API**: Classes and methods that interface the CLI and the compact contract.
- **Wallet**: Wallet setup and utilities.

## Authorization flow

```
  1. Deploy:    TokenSupply.constructor()  →  Warden.init() populates authorized users
  2. Commit:    Users call TokenSupply.commit() which delegates to Warden.commit()
                to register their secret commitments on-ledger
  3. Mint/Burn: TokenSupply.mint(amount, recipient) calls Warden_verify() internally.
                Only if the committed users satisfy the native script policy
                does the mint proceed
```

## Purpose

- Warden as a **reusable access-control library** — the same Warden module works
  with `any`, `all`, `atLeast`, time locks, and nested combinations
- **Separation of concerns** — application logic (token supply) is decoupled
  from authorization logic (Warden)
- **End-to-end flow** — from contract init through user commitments to a
  policy-gated state transition

## Set up

In the `e2e` directory, build the packages:

```bash
pnpm build
```

and before running the example, start the services that Midnight requires: a node and an indexer,
to run the undeployed network, and the proof-server necessary for proof generation.

```bash
docker compose up -d
```

After finishing, make sure to shut down the services.

```bash
docker compose down --volumes
```

## Running the example

TO DO

## References

Loosely based on the following [MIP](https://github.com/midnightntwrk/midnight-improvement-proposals/blob/main/mips/mip-0004-fungible-token-standard-with-utxo.md).
