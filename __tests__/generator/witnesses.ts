export type PrivateState = {
  readonly secret: Uint8Array;
  readonly randomness: Uint8Array;
};

export const witnesses = {
  wardenSecret: (ctx: any): [any, Uint8Array] => [ctx.privateState, ctx.privateState.secret],
  wardenRandomness: (ctx: any): [any, Uint8Array] => [
    ctx.privateState,
    ctx.privateState.randomness,
  ],
};
