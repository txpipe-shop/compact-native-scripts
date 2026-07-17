import 'dotenv/config';
import { TokenSupplyContractPrivateStateKey } from '@e2e/contract';
import { SecretPair } from '@e2e/api';
import path from 'node:path';

export interface Config {
  readonly privateStateStoreName: string;
  readonly logDir: string;
  readonly zkConfigPath: string;
  readonly indexer: string;
  readonly indexerWS: string;
  readonly node: string;
  readonly proofServer: string;
  readonly networkId: string;
}

export const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');

export const getWalletMnemonic = (): string | undefined => process.env.WALLET_MNEMONIC;

export const getWardenSecretPair = (): SecretPair | undefined => {
  const secret = process.env.WARDEN_SECRET;
  const randomness = process.env.WARDEN_RANDOMNESS;
  if (!secret || !randomness) return undefined;
  return { secret, randomness };
};

export class StandaloneConfig implements Config {
  privateStateStoreName = TokenSupplyContractPrivateStateKey;
  logDir = path.resolve(currentDir, '..', 'logs', 'standalone', `${new Date().toISOString()}.log`);
  zkConfigPath = path.resolve(
    currentDir,
    '..',
    '..',
    'packages',
    'contract',
    'dist',
    'managed',
    'sentinel'
  );
  networkId = process.env.NETWORK_TYPE ?? 'undeployed';
  indexer = process.env.INDEXER_URL ?? 'http://127.0.0.1:8088/api/v3/graphql';
  indexerWS = process.env.INDEXER_WS_URL ?? 'ws://127.0.0.1:8088/api/v3/graphql/ws';
  node = process.env.NODE_URL ?? 'ws://127.0.0.1:9944';
  proofServer = process.env.PROOF_SERVER_URL ?? 'http://127.0.0.1:6300';
  syncTimeoutMs = Number(process.env.SYNC_TIMEOUT_MS) || 300_000;
}
