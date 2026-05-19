import {
  CircuitContext,
  CostModel,
  createConstructorContext,
  QueryContext,
  sampleContractAddress,
} from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger, Ledger } from '../../generated/managed/warden/contract/index.js';
import { PrivateState, witnesses } from './witnesses.js';

export class WardenSimulator {
  readonly contract: Contract<PrivateState>;
  circuitContext: CircuitContext<PrivateState>;

  constructor(secret?: Uint8Array, randomness?: Uint8Array) {
    this.contract = new Contract(witnesses);
    const { currentPrivateState, currentContractState, currentZswapLocalState } =
      this.contract.initialState(
        createConstructorContext(
          { secret: secret ?? new Uint8Array(32), randomness: randomness ?? new Uint8Array(32) },
          '0'.repeat(64)
        )
      );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(currentContractState.data, sampleContractAddress()),
    };
  }

  init(): Ledger {
    this.circuitContext = this.contract.impureCircuits.init(this.circuitContext).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }
}
