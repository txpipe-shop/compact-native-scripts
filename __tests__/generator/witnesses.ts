import { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import { Ledger } from '../../generated/managed/warden/contract/index.js';

export type PrivateState = {
  readonly secret: Uint8Array;
  readonly randomness: Uint8Array;
};

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
