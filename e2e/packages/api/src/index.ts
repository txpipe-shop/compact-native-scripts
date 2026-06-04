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
import { map, type Observable } from 'rxjs';

/** Rolling 30-minute TTL for all transactions. */
const TTL = () => new Date(Date.now() + 30 * 60 * 1_000);

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

  private constructor(
    providers: TokenSupplyContractProviders,
    deployedContract: TokenSupplyContractDeployed | null,
    state$: Observable<TokenSupplyDerivedState>
  ) {
    this.providers = providers;
    this.deployedContract = deployedContract;
    this.state$ = state$;
  }

  static async deploy(
    providers: TokenSupplyContractProviders,
    args: DeployArguments,
    psPair: SecretPair
  ): Promise<TokenSupplyContract> {
    console.log('[deploy] Starting contract deployment...');
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

    console.debug('Deployment fees: ', deployedContract.deployTxData.public.fees);
    return new TokenSupplyContract(providers, deployedContract, state$);
  }

  static async join(
    providers: TokenSupplyContractProviders,
    contractAddress: ContractAddress,
    psPair: SecretPair
  ): Promise<TokenSupplyContract> {
    console.log('[join] Finding existing contract...');
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

    console.log('[join] Contract joined');
    return new TokenSupplyContract(providers, deployedContract, state$);
  }

  async commit() {
    console.log('[commit] Building commit transaction...');
    const tx = await this.deployedContract?.callTx.commit();
    console.log(`[commit] Committed on tx: ${tx?.public.txHash}`);
  }

  async mint(amount: bigint, recipient: string) {
    console.log('[mint] Building mint transaction...');
    const tx = await this.deployedContract?.callTx.mint(amount, { bytes: fromHex(recipient) });

    console.log(
      `[mint] Minted ${tx?.private.newCoins[0].value} tokens on tx: ${tx?.public.txHash}`
    );
  }

  // TO-DO: add burn call

  async getCurrentState() {
    console.log('[getCurrentState] Fetching contract state...');
    let subscription: { unsubscribe: () => void } | null = null;

    subscription = this.state$.subscribe((state) => {
      // Ensure we only handle the first emission
      subscription?.unsubscribe();

      console.log('Total supply: ', state.cap);
      console.log('Current supply: ', state.currentSupply);
    });
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
