import { InMemoryTransactionHistoryStorage } from '@midnight-ntwrk/wallet-sdk';
import {
  DefaultConfiguration,
  mergeWalletEntries,
  WalletEntrySchema,
} from '@midnight-ntwrk/wallet-sdk/facade';
import { Config } from './types.js';

export const createConfiguration = (config: Config): DefaultConfiguration => ({
  networkId: config.networkId,
  indexerClientConnection: {
    indexerHttpUrl: config.indexer,
    indexerWsUrl: config.indexerWS,
  },
  provingServerUrl: new URL(config.proofServer),
  relayURL: new URL(config.node),
  costParameters: {
    additionalFeeOverhead: 300_000_000_000_000n,
    feeBlocksMargin: 5,
  },
  txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
});
