import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { type WalletContext, createWalletAndMidnightProvider } from '@e2e/wallet';
import path from 'node:path';
import {
  TokenSupplyContractCircuitKeys,
  TokenSupplyContractProviders,
  PrivateStateId,
} from './types.js';

export type { TokenSupplyContractProviders };

const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');
export const contractConfig = {
  zkConfigPath: path.resolve(currentDir, 'managed', 'tokensupply'),
};

export const configureProviders = async (
  walletCtx: WalletContext,
  config: { indexer: string; indexerWS: string; proofServer: string },
  privateStateStoreName: string
): Promise<TokenSupplyContractProviders> => {
  const walletAndMidnightProvider = await createWalletAndMidnightProvider(walletCtx);
  const zkConfigProvider = new NodeZkConfigProvider<TokenSupplyContractCircuitKeys>(
    contractConfig.zkConfigPath
  );
  const storagePassword = process.env.MIDNIGHT_STORAGE_PASSWORD;
  if (!storagePassword) {
    throw new Error(
      'MIDNIGHT_STORAGE_PASSWORD is not set. Set it in e2e/packages/cli/.env (see .env.example). ' +
        'The level-private-state-provider requires it to encrypt private state on disk.',
    );
  }
  return {
    privateStateProvider: levelPrivateStateProvider<PrivateStateId>({
      privateStateStoreName: privateStateStoreName + '-midnight',
      privateStoragePasswordProvider: () => storagePassword,
      accountId: walletCtx.shieldedSecretKeys.coinPublicKey,
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider,
  };
};
