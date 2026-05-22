export {
  NativeScriptSchema,
  type BaseScriptSchema,
  type CommitmentSchema,
  type AfterClauseSchema,
  type BeforeClauseSchema,
  type AnyScriptSchema,
  type AllScriptSchema,
  type AtLeastScriptSchema,
  type Uint8ArraySchema,
} from './schema.js';

export { generateCompact, collectCmtLeaves } from './generator/index.js';
export { generateSecretPair, generateCommitment } from './pair.js';
export type { SecretPair } from './pair.js';
