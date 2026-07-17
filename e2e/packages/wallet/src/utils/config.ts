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
    indexerHttpUrl: 'http://localhost:8088/api/v3/graphql',
    indexerWsUrl: 'ws://localhost:8088/api/v3/graphql/ws',
  },
  provingServerUrl: new URL('http://localhost:6300'),
  relayURL: new URL('ws://localhost:9944'),
  costParameters: {
    additionalFeeOverhead: 300_000_000_000_000n,
    feeBlocksMargin: 5,
  },
  txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
});
