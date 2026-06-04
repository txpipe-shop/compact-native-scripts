import { TokenSupplyContractPrivateStateKey } from '@e2e/contract';
import path from 'node:path';

export interface Config {
  readonly privateStateStoreName: string;
  readonly logDir: string;
  readonly zkConfigPath: string;
  readonly indexer: string;
  readonly indexerWS: string;
  readonly node: string;
  readonly proofServer: string;
}

export const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');
// TODO: fix harcoded values
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
  indexer = 'http://127.0.0.1:8088/api/v3/graphql';
  indexerWS = 'ws://127.0.0.1:8088/api/v3/graphql/ws';
  node = 'http://127.0.0.1:9944';
  proofServer = 'http://127.0.0.1:6300';
}
