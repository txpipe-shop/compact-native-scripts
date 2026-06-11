import { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import { Ledger } from './managed/tokensupply/contract/index.js';

export type PrivateState = {
  readonly secret: Uint8Array;
  readonly randomness: Uint8Array;
};

export const createPrivateState = (secret: Uint8Array, randomness: Uint8Array): PrivateState => ({
  secret,
  randomness,
});

export type Witnesses<PrivateState> = {
  localSecret(context: WitnessContext<Ledger, PrivateState>): [PrivateState, Uint8Array];
  randomness(context: WitnessContext<Ledger, PrivateState>): [PrivateState, Uint8Array];
};

export const witnesses = {
  localSecret: ({
    privateState,
  }: WitnessContext<Ledger, PrivateState>): [PrivateState, Uint8Array] => [
    privateState,
    privateState.secret,
  ],
  randomness: ({
    privateState,
  }: WitnessContext<Ledger, PrivateState>): [PrivateState, Uint8Array] => [
    privateState,
    privateState.randomness,
  ],
};
