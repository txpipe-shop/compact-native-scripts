import { ZswapSecretKeys, DustSecretKey } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { WalletFacade, type UnshieldedKeystore } from '@midnight-ntwrk/wallet-sdk';

export interface WalletContext {
  wallet: WalletFacade;
  shieldedSecretKeys: ZswapSecretKeys;
  dustSecretKey: DustSecretKey;
  unshieldedKeystore: UnshieldedKeystore;
}

export interface Config {
  readonly privateStateStoreName: string;
  readonly logDir: string;
  readonly zkConfigPath: string;
  readonly indexer: string;
  readonly indexerWS: string;
  readonly node: string;
  readonly proofServer: string;
  readonly networkId: string;
  readonly syncTimeoutMs?: number;
}
