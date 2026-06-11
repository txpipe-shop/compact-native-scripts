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
import { fromHex } from '@midnight-ntwrk/compact-runtime';
import { firstValueFrom, map, type Observable } from 'rxjs';
import { ShieldedCoinInfo } from '@midnight-ntwrk/ledger-v8';

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
    psPair: SecretPair
  ): Promise<TokenSupplyContract> {
    console.log('[api] Starting contract deployment...');
    const deployedContract = await deployContract<TokenSupplyContractType>(providers, {
      compiledContract: CompactCompiledContract,
      privateStateId: TokenSupplyContractPrivateStateKey,
      initialPrivateState: await this.getPrivateState(psPair, providers, ''),
      args: [args.maxSupply, args.tokenDomain, args.initNonce],
    });

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
    psPair: SecretPair
  ): Promise<TokenSupplyContract> {
    console.log('[api] Finding existing contract...');
    const deployedContract = await findDeployedContract<TokenSupplyContractType>(providers, {
      contractAddress,
      compiledContract: CompactCompiledContract,
      privateStateId: TokenSupplyContractPrivateStateKey,
      initialPrivateState: await this.getPrivateState(psPair, providers, contractAddress),
    });

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
    console.log('[api] Building commit transaction...');
    const tx = await this.deployedContract?.callTx.commit();
    console.log(`[api] Committed on tx: ${tx?.public.txHash}`);
  }

  async mint(amount: bigint, recipient: string) {
    console.log('[api] Building mint transaction...');
    const tx = await this.deployedContract?.callTx.mint(amount, { bytes: fromHex(recipient) });
    const minted = tx?.private.newCoins[0];
    if (minted) {
      console.log(`[api] Minted ${minted.value} tokens on tx: ${tx?.public.txHash}`);
      this.mintedCoinInfo.push(minted);
    }
  }

  async burn(type: string, value: bigint) {
    console.log('[api] Building burn transaction...');
    const burnCoin = this.mintedCoinInfo.find((coin) => coin.type == type);
    if (burnCoin) {
      const tx = await this.deployedContract?.callTx.burn({
        nonce: fromHex(burnCoin.nonce),
        color: fromHex(burnCoin.type),
        value,
      });
      console.log(`[api] Burned ${value} token on tx: ${tx?.public.txHash}`);
    } else {
      console.log(`[api] Failed to find token of type ${type} to burn.`);
    }
  }

  async getCurrentState() {
    console.log('[api] Fetching contract state...');
    const state = await firstValueFrom(this.state$);
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
