import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { TokenSupplyContractConstructor, TokenSupplyContractType } from './types.js';
import { witnesses } from './witnesses.js';

const tag = 'TokenSupplyContract';
export const CompactCompiledContract = CompiledContract.make<TokenSupplyContractType>(
  tag,
  TokenSupplyContractConstructor
).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(
    /* @vite-ignore */
    new URL('./managed/sentinel', import.meta.url).pathname
  )
);

export { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
export * from './managed/tokensupply/contract/index.js';
export { createPrivateState, type PrivateState } from './witnesses.js';
export { TokenSupplyContractPrivateStateKey } from './types.js';
export type {
  TokenSupplyContractCircuitKeys,
  TokenSupplyContractDeployed,
  TokenSupplyContractProviders,
  TokenSupplyContractType,
  PrivateStateId,
} from './types.js';
export { witnesses };
