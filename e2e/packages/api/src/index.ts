import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import {
  CompactCompiledContract,
  createPrivateState,
  ledger,
  TokenSupplyContractDeployed,
  TokenSupplyContractPrivateStateKey,
  TokenSupplyContractProviders,
  TokenSupplyContractType,
  type ContractAddress,
  type PrivateState,
} from '@e2e/contract';
import { fromHex } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { EmptyError, firstValueFrom, map, type Observable } from 'rxjs';
import { ShieldedCoinInfo } from '@midnight-ntwrk/midnight-js-protocol/ledger';

const DEFAULT_TIMEOUT_MS = 300_000;

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);

/** Rolling 30-minute TTL for all transactions. */
export const TTL = () => new Date(Date.now() + 30 * 60 * 1_000);

export const toHex = (arr: Uint8Array) =>
  '0x' +
  Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

export interface TokenSupplyDerivedState {
  domain: string;
  cap: bigint;
  currentSupply: bigint;
}

export type DeployArguments = {
  maxSupply: bigint;
  tokenDomain: Uint8Array;
  initNonce: Uint8Array;
};

export type SecretPair = {
  secret: string;
  randomness: string;
};

export class TokenSupplyContract {
  readonly providers: TokenSupplyContractProviders;
  readonly deployedContract: TokenSupplyContractDeployed | null;
  readonly state$: Observable<TokenSupplyDerivedState>;
  mintedCoinInfo: ShieldedCoinInfo[];

  private constructor(
    providers: TokenSupplyContractProviders,
    deployedContract: TokenSupplyContractDeployed | null,
    state$: Observable<TokenSupplyDerivedState>
  ) {
    this.providers = providers;
    this.deployedContract = deployedContract;
    this.state$ = state$;
    this.mintedCoinInfo = [];
  }

  static async deploy(
    providers: TokenSupplyContractProviders,
    args: DeployArguments,
    psPair: SecretPair,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ): Promise<TokenSupplyContract> {
    if (args.maxSupply <= 0n) {
      throw new Error('maxSupply must be greater than zero');
    }
    if (args.tokenDomain.length === 0) {
      throw new Error('tokenDomain must not be empty');
    }
    if (args.initNonce.length === 0) {
      throw new Error('initNonce must not be empty');
    }

    console.log('[api] Starting contract deployment...');
    const deployedContract = await withTimeout(
      deployContract<TokenSupplyContractType>(providers, {
        compiledContract: CompactCompiledContract,
        privateStateId: TokenSupplyContractPrivateStateKey,
        initialPrivateState: await this.getPrivateState(psPair, providers, ''),
        args: [args.maxSupply, args.tokenDomain, args.initNonce],
      }),
      timeoutMs,
      'Contract deployment'
    );

    const contractAddress = deployedContract.deployTxData.public.contractAddress;
    const state$ = providers.publicDataProvider
      .contractStateObservable(contractAddress, { type: 'latest' })
      .pipe(
        map((contractState) => {
          const ledgerState = ledger(contractState.data);
          return {
            domain: toHex(ledgerState.domain),
            cap: ledgerState.cap,
            currentSupply: ledgerState.currentSupply,
          };
        })
      );

    console.debug('[api] Deployment fees: ', deployedContract.deployTxData.public.fees);
    return new TokenSupplyContract(providers, deployedContract, state$);
  }

  static async join(
    providers: TokenSupplyContractProviders,
    contractAddress: ContractAddress,
    psPair: SecretPair,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ): Promise<TokenSupplyContract> {
    if (!contractAddress) {
      throw new Error('contractAddress must not be empty');
    }

    console.log('[api] Finding existing contract...');
    const deployedContract = await withTimeout(
      findDeployedContract<TokenSupplyContractType>(providers, {
        contractAddress,
        compiledContract: CompactCompiledContract,
        privateStateId: TokenSupplyContractPrivateStateKey,
        initialPrivateState: await this.getPrivateState(psPair, providers, contractAddress),
      }),
      timeoutMs,
      'Contract lookup'
    );

    const state$ = providers.publicDataProvider
      .contractStateObservable(contractAddress, { type: 'latest' })
      .pipe(
        map((contractState) => {
          const ledgerState = ledger(contractState.data);
          return {
            domain: toHex(ledgerState.domain),
            cap: ledgerState.cap,
            currentSupply: ledgerState.currentSupply,
          };
        })
      );

    console.log('[api] Contract joined');
    return new TokenSupplyContract(providers, deployedContract, state$);
  }

  async commit() {
    if (!this.deployedContract) {
      throw new Error('Cannot commit: no deployed contract. Call deploy() or join() first.');
    }
    console.log('[api] Building commit transaction...');
    const tx = await withTimeout(
      this.deployedContract.callTx.commit(),
      DEFAULT_TIMEOUT_MS,
      'Commit transaction'
    );
    console.log(`[api] Committed on tx: ${tx.public.txHash}`);
  }

  async mint(amount: bigint, recipient: string) {
    if (!this.deployedContract) {
      throw new Error('Cannot mint: no deployed contract. Call deploy() or join() first.');
    }
    if (amount <= 0n) {
      throw new Error('Mint amount must be greater than zero');
    }
    if (!recipient) {
      throw new Error('Recipient must not be empty');
    }

    console.log('[api] Building mint transaction...');
    const tx = await withTimeout(
      this.deployedContract.callTx.mint(amount, { bytes: fromHex(recipient) }),
      DEFAULT_TIMEOUT_MS,
      'Mint transaction'
    );
    const minted = tx.private.newCoins[0];
    if (!minted) {
      throw new Error('Mint transaction completed but produced no coins');
    }
    console.log(`[api] Minted ${minted.value} tokens on tx: ${tx.public.txHash}`);
    this.mintedCoinInfo.push(minted);
  }

  async burn(type: string, value: bigint) {
    if (!this.deployedContract) {
      throw new Error('Cannot burn: no deployed contract. Call deploy() or join() first.');
    }
    if (value <= 0n) {
      throw new Error('Burn amount must be greater than zero');
    }

    const burnCoin = this.mintedCoinInfo.find((coin) => coin.type == type);
    if (!burnCoin) {
      throw new Error(`No minted coin found with type '${type}'`);
    }

    console.log('[api] Building burn transaction...');
    const tx = await withTimeout(
      this.deployedContract.callTx.burn({
        nonce: fromHex(burnCoin.nonce),
        color: fromHex(burnCoin.type),
        value,
      }),
      DEFAULT_TIMEOUT_MS,
      'Burn transaction'
    );
    console.log(`[api] Burned ${value} token on tx: ${tx.public.txHash}`);
  }

  async getCurrentState() {
    console.log('[api] Fetching contract state...');
    let state: TokenSupplyDerivedState;
    try {
      state = await firstValueFrom(this.state$);
    } catch (e) {
      if (e instanceof EmptyError) {
        throw new Error('Failed to fetch contract state: no state available from the network');
      }
      throw e;
    }
    console.log('[api] Total supply: ', state.cap);
    console.log('[api] Current supply: ', state.currentSupply);
  }

  private static async getPrivateState(
    pair: SecretPair,
    providers: TokenSupplyContractProviders,
    contractAddress: string
  ): Promise<PrivateState> {
    providers.privateStateProvider.setContractAddress(contractAddress);
    const existingPrivateState = await providers.privateStateProvider.get(
      TokenSupplyContractPrivateStateKey
    );
    return (
      existingPrivateState ?? createPrivateState(fromHex(pair.secret), fromHex(pair.randomness))
    );
  }
}
