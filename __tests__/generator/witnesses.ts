export type PrivateState = {
  readonly secret: Uint8Array;
  readonly randomness: Uint8Array;
};

export const witnesses = {
  localSecret: (ctx: any): [any, Uint8Array] => [ctx.privateState, ctx.privateState.secret],
  randomness: (ctx: any): [any, Uint8Array] => [ctx.privateState, ctx.privateState.randomness],
};
