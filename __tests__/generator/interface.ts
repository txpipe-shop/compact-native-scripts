import { CircuitContext, CircuitResults } from '@midnight-ntwrk/compact-runtime';
import { Contract, Ledger, ledger } from '../../generated/managed/warden/contract/index.js';

type PrivateStateOf<C> = C extends Contract<infer PS, any> ? PS : never;

type ImpureCircuitsLike<PS> = Partial<{
  init: (context: CircuitContext<PS>) => CircuitResults<PS, []>;
  commit: (context: CircuitContext<PS>) => CircuitResults<PS, []>;
}> & {
  verify: (context: CircuitContext<PS>) => CircuitResults<PS, []>;
};

export class Interface<C extends Contract<any, any>> {
  readonly contract: C;
  private _context: CircuitContext<PrivateStateOf<C>>;

  constructor(contract: C, context: CircuitContext<PrivateStateOf<C>>) {
    this.contract = contract;
    this._context = context;
  }

  get context(): CircuitContext<PrivateStateOf<C>> {
    return this._context;
  }

  set context(ctx: CircuitContext<PrivateStateOf<C>>) {
    this._context = ctx;
  }

  get ledger(): Ledger {
    return ledger(this._context.currentQueryContext.state);
  }

  get impureCircuits(): ImpureCircuitsLike<PrivateStateOf<C>> {
    return this.contract.impureCircuits as any;
  }
}
