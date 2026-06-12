import {
  CostModel,
  createConstructorContext,
  QueryContext,
  sampleContractAddress,
} from '@midnight-ntwrk/compact-runtime';
import { Contract as ContractT, Ledger } from '../../generated/managed/warden/contract/index.js';
import { PrivateState, witnesses } from './witnesses.js';
import { Interface } from './interface.js';

export class WardenSimulator {
  readonly contract: Interface<ContractT<PrivateState>>;

  constructor(secret?: Uint8Array, randomness?: Uint8Array) {
    const contractT = new ContractT(witnesses) as ContractT<PrivateState>;
    const { currentPrivateState, currentContractState, currentZswapLocalState } =
      contractT.initialState(
        createConstructorContext(
          { secret: secret ?? new Uint8Array(32), randomness: randomness ?? new Uint8Array(32) },
          '0'.repeat(64)
        )
      );
    const context = {
      currentPrivateState,
      currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(currentContractState.data, sampleContractAddress()),
    };
    this.contract = new Interface(contractT, context);
  }

  init(): Ledger {
    const circuits = this.contract.impureCircuits;
    if (!('init' in circuits)) throw new Error('No init circuit');
    this.contract.context = circuits.init!(this.contract.context).context;
    return this.contract.ledger;
  }

  commit(): Ledger {
    const circuits = this.contract.impureCircuits;
    if (!('commit' in circuits)) throw new Error('No commit circuit');
    this.contract.context = circuits.commit!(this.contract.context).context;
    return this.contract.ledger;
  }

  commitWith(secret: Uint8Array, randomness: Uint8Array): Ledger {
    this.contract.context = {
      ...this.contract.context,
      currentPrivateState: { secret, randomness } as PrivateState,
    };
    return this.commit();
  }

  verify(): Ledger {
    this.contract.context = this.contract.impureCircuits.verify(this.contract.context).context;
    return this.contract.ledger;
  }

  setBlockTime(seconds: number): void {
    this.contract.context.currentQueryContext.block = {
      ...this.contract.context.currentQueryContext.block,
      secondsSinceEpoch: BigInt(seconds),
    };
  }

  getLedger(): Ledger {
    return this.contract.ledger;
  }
}
