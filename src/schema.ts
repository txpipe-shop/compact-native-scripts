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

const CommmitmentSchema = Uint8ArraySchema.describe(
  'A commitment value (public key hash) as Uint8Array'
);

// Sig script (leaf, no recursion needed)
const SigScriptSchema = z
  .object({
    type: z.literal('sig').describe('Signature verification script type'),
    keyHash: CommmitmentSchema.describe('Public key hash (32 bytes)'),
  })
  .describe('Signature script - verifies a transaction against a public key hash');

// Composite script schemas - defined once, reused in both BaseScriptSchema and NativeScriptSchema
const AnyScriptSchema = z
  .object({
    type: z.literal('any').describe('Any-of script type'),
    scripts: z
      .lazy(() => z.array(BaseScriptSchema))
      .describe('Scripts to evaluate (any one must satisfy)'),
  })
  .describe('Any script - at least one of the contained scripts must be satisfied');

const AllScriptSchema = z
  .object({
    type: z.literal('all').describe('All-of script type'),
    scripts: z
      .lazy(() => z.array(BaseScriptSchema))
      .describe('Scripts to evaluate (all must satisfy)'),
  })
  .describe('All script - all of the contained scripts must be satisfied');

const AtLeastScriptSchema = z
  .object({
    type: z.literal('atLeast').describe('At-least-N script type'),
    required: z
      .number()
      .int()
      .min(1, 'Required must be at least 1')
      .describe('Minimum number of scripts that must be satisfied'),
    scripts: z.lazy(() => z.array(BaseScriptSchema)).describe('Scripts to evaluate'),
  })
  .describe('AtLeast script - at least N of the contained scripts must be satisfied');

// Base script schema - includes all types (leaf + composite) for use inside scripts arrays
const BaseScriptSchema: z.ZodType<unknown> = z.lazy(() =>
  z
    .discriminatedUnion('type', [
      SigScriptSchema,
      AnyScriptSchema,
      AllScriptSchema,
      AtLeastScriptSchema,
    ])
    .describe('Native script (leaf or composite) for use inside scripts arrays')
);

// Top-level schema - only composite types allowed (no standalone sig scripts)
const NativeScriptSchema = z
  .discriminatedUnion('type', [AnyScriptSchema, AllScriptSchema, AtLeastScriptSchema])
  .describe('Top-level native script - composite types only (no standalone signature scripts)');

export {
  Uint8ArraySchema,
  CommmitmentSchema,
  SigScriptSchema,
  AnyScriptSchema,
  AllScriptSchema,
  AtLeastScriptSchema,
  BaseScriptSchema,
  NativeScriptSchema,
};
