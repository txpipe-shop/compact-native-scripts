import { InMemoryTransactionHistoryStorage } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { DefaultConfiguration } from '@midnight-ntwrk/wallet-sdk-facade';

// Single unified configuration for all wallets
export const configuration: DefaultConfiguration = {
  networkId: 'undeployed',
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
  txHistoryStorage: new InMemoryTransactionHistoryStorage(),
};
