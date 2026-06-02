import type { ContractProviders } from '@midnight-ntwrk/midnight-js-contracts';
import { type DeployedContract, type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import { Contract } from './managed/tokensupply/contract/index.js';
import { PrivateState } from './witnesses.js';

export const TokenSupplyContractConstructor = Contract<PrivateState>;
export type TokenSupplyContractType = InstanceType<typeof TokenSupplyContractConstructor>;

export type TokenSupplyContractDeployed =
  | DeployedContract<TokenSupplyContractType>
  | FoundContract<TokenSupplyContractType>;

export const TokenSupplyContractPrivateStateKey = 'TokenSupplyContractPrivateState';
export type PrivateStateId = typeof TokenSupplyContractPrivateStateKey;

export type TokenSupplyContractCircuitKeys = Exclude<
  keyof TokenSupplyContractType['impureCircuits'],
  number | symbol
>;

export type TokenSupplyContractProviders = ContractProviders<TokenSupplyContractType>;
