# E2E Example: Token supply control

A Midnight smart contract that mints and burns a token, gated by the
**Warden** access-control module. It demonstrates how Warden can be plugged into
any contract to enforce arbitrary authorization policies (any, all,
atLeast, time locks, or combinations) without modifying the application logic.

## Architecture

The example consists of the following packages:

- **CLI**: Interactive menu to drive the contract end-to-end
- **Contract**: Smart contract source code and utilities, comprised itself of two modules:
  - **Warden** (`packages/contract/src/Warden.compact`) — access-control library generated
    from a native-script JSON input. Manages commitments and verifies that the
    current set of committed users satisfies the configured policy.
  - **TokenSupply** (`packages/contract/src/TokenSupply.compact`) — a token supply contract that imports Warden and
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

In the `e2e` directory, the following command compiles the contract and builds the packages:

```bash
pnpm build
```

Before running the example, start the local devnet services — a node, an indexer,
and the proof server needed for proof generation:

```bash
docker compose up -d
```

To start only the proof server (e.g. when connecting to a public network):

```bash
docker compose up proof-server
```

After finishing, make sure to shut down the services.

```bash
docker compose down --volumes
```

## Environment configuration

Before running the app, you need to set up an `.env` file at `packages/cli/.env`
with your wallet and contract details, and the network configuration.

Complete it with your wallet's mnemonic phrase, and the secret and randomness used
to create the commitment that was provided to initialize the Warden contract.

```env
WALLET_MNEMONIC=<your mnemonic>
WARDEN_SECRET=<your secret>
WARDEN_RANDOMNESS=<your randomness>
MIDNIGHT_STORAGE_PASSWORD=<password for encrypting private state on disk>
```

`MIDNIGHT_STORAGE_PASSWORD` is required to encrypt private state on disk via the
`level-private-state-provider`. See the
[`validatePassword` API reference](https://docs.midnight.network/api-reference/midnight-js/@midnight-ntwrk/midnight-js-utils/functions/validatePassword)
for the password strength policy.

When running on the local devnet, you can skip these values — the CLI offers
preset wallet options (1 through 4) with built-in credentials.

### Network

Below are the templates to connect with different networks. For the latest testnet endpoints, see
[Environments and endpoints](https://docs.midnight.network/relnotes/network).

### Local devnet

```env
NETWORK_TYPE=undeployed
NODE_URL=ws://127.0.0.1:9944
INDEXER_URL=http://127.0.0.1:8088/api/v3/graphql
INDEXER_WS_URL=ws://127.0.0.1:8088/api/v3/graphql/ws
PROOF_SERVER_URL=http://127.0.0.1:6300
```

### Preview

```env
NETWORK_TYPE=preview
NODE_URL=wss://rpc.preview.midnight.network/
INDEXER_URL=https://indexer.preview.midnight.network/api/v4/graphql
INDEXER_WS_URL=wss://indexer.preview.midnight.network/api/v4/graphql/ws
PROOF_SERVER_URL=http://127.0.0.1:6300
```

### Preprod

```env
NETWORK_TYPE=preprod
NODE_URL=wss://rpc.preprod.midnight.network/
INDEXER_URL=https://indexer.preprod.midnight.network/api/v4/graphql
INDEXER_WS_URL=wss://indexer.preprod.midnight.network/api/v4/graphql/ws
PROOF_SERVER_URL=http://127.0.0.1:6300
```

## Running the example

In the [`packages/cli`](packages/cli/) directory:

```bash
pnpm tsx src/index.ts
```

## References

Loosely based on the following [MIP](https://github.com/midnightntwrk/midnight-improvement-proposals/blob/main/mips/mip-0004-fungible-token-standard-with-utxo.md).
