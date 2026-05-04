import { z } from 'zod';
import { fromHex } from '@midnight-ntwrk/compact-runtime';

const Uint8ArraySchema = z
  .union([
    z.instanceof(Uint8Array),
    z
      .string()
      .regex(/^[0-9a-f]{64}$/, 'Invalid format (must be 64 lowercase hex characters)')
      .transform((hex) => fromHex(hex)),
  ])
  .describe('Uint8Array or 64-char lowercase hex string, transformed to Uint8Array');
export type Uint8ArraySchema = z.infer<typeof Uint8ArraySchema>;

// Commitment clause (leaf, signature-equivalent)
const CommmitmentSchema = z
  .object({
    type: z.literal('cmt').describe('Commitment verification clause type'),
    hash: Uint8ArraySchema.describe('Commitment hash (32 bytes)'),
  })
  .describe('Commitment clause - signature-equivalent verification against a commitment hash');
export type CommmitmentSchema = z.infer<typeof CommmitmentSchema>;

// Time lock clauses (leaf, no recursion needed)
const AfterClauseSchema = z
  .object({
    type: z.literal('after').describe('Time-after clause type'),
    block: z
      .number()
      .int()
      .min(0, 'Block must be a non-negative integer')
      .describe('Block number (transaction must be at or after)'),
  })
  .describe('After clause - validates that the current block is at or after the specified block');
export type AfterClauseSchema = z.infer<typeof AfterClauseSchema>;

const BeforeClauseSchema = z
  .object({
    type: z.literal('before').describe('Time-before clause type'),
    block: z
      .number()
      .int()
      .min(0, 'Block must be a non-negative integer')
      .describe('Block number (transaction must be before)'),
  })
  .describe('Before clause - validates that the current block is before the specified block');
export type BeforeClauseSchema = z.infer<typeof BeforeClauseSchema>;

// Composite script schemas - defined once, reused in both BaseScriptSchema and NativeScriptSchema
const AnyScriptSchema = z
  .object({
    type: z.literal('any').describe('Any-of script type'),
    scripts: z
      .lazy(() => z.array(BaseScriptSchema))
      .describe('Scripts to evaluate (any one must satisfy)'),
  })
  .describe('Any script - at least one of the contained scripts must be satisfied');
export type AnyScriptSchema = z.infer<typeof AnyScriptSchema>;

const AllScriptSchema = z
  .object({
    type: z.literal('all').describe('All-of script type'),
    scripts: z
      .lazy(() => z.array(BaseScriptSchema))
      .describe('Scripts to evaluate (all must satisfy)'),
  })
  .describe('All script - all of the contained scripts must be satisfied');
export type AllScriptSchema = z.infer<typeof AllScriptSchema>;

const AtLeastScriptSchema = z
  .object({
    type: z.literal('atLeast').describe('At-least-N script type'),
    required: z
      .number()
      .int()
      .min(1, 'Required must be at least 1')
      .describe(
        'Minimum number of scripts that must be satisfied, must be equal to or less than the amount of scripts'
      ),
    scripts: z.lazy(() => z.array(BaseScriptSchema)).describe('Scripts to evaluate'),
  })
  .refine((obj) => obj.required <= obj.scripts.length)
  .describe('AtLeast script - at least N of the contained scripts must be satisfied');
export type AtLeastScriptSchema = z.infer<typeof AtLeastScriptSchema>;

// Base script schema - includes all types (leaf + composite) for use inside scripts arrays
const BaseScriptSchema: z.ZodType<unknown> = z.lazy(() =>
  z
    .discriminatedUnion('type', [
      CommmitmentSchema,
      AfterClauseSchema,
      BeforeClauseSchema,
      AnyScriptSchema,
      AllScriptSchema,
      AtLeastScriptSchema,
    ])
    .describe('Native script (leaf or composite) for use inside scripts arrays')
);
export type BaseScriptSchema = z.infer<typeof BaseScriptSchema>;

// Top-level entry point — alias of BaseScriptSchema with its own description
const NativeScriptSchema = BaseScriptSchema.describe(
  'Native script - top-level entry point (all clause types allowed)'
);
export type NativeScriptSchema = z.infer<typeof NativeScriptSchema>;

export {
  Uint8ArraySchema,
  CommmitmentSchema,
  AfterClauseSchema,
  BeforeClauseSchema,
  AnyScriptSchema,
  AllScriptSchema,
  AtLeastScriptSchema,
  BaseScriptSchema,
  NativeScriptSchema,
};
