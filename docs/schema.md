# Compact Native Scripts - Schema Design

## Overview

This project provides Zod schemas for parsing and validating JSON inputs similar to Cardano native scripts, with input normalization (hex strings → Uint8Array via `fromHex` from `@midnight-ntwrk/compact-runtime`).

`NativeScriptSchema` is the top-level entry point for validation. It accepts only composite script types (`any`, `all`, `atLeast`), rejecting standalone commitment scripts at the root level. This enforces that native scripts always contain nested logic rather than a single condition.

The schemas are organized into three layers, and this document follows the same structure:

- **Base** — primitive types used by other schemas (e.g. `Uint8ArraySchema` for hex normalization)
- **Leaf** — terminal clauses that cannot contain other clauses (e.g. `CommmitmentSchema`)
- **Composite** — scripts that contain a `scripts` array of nested clauses or scripts, enabling arbitrary nesting

---

## Base Schemas

### Uint8ArraySchema

**Purpose**: Normalize various input types to `Uint8Array`.

**Accepted inputs**:

- `Uint8Array` instances (passed through)
- 64-character lowercase hex strings → transformed to 32-byte `Uint8Array` via `fromHex`

**Not accepted**: `number[]`, uppercase hex, wrong length.

---

## Leaf Clause: CommmitmentSchema

**Purpose**: Commitment verification against a commitment hash, functioning as a signature-equivalent verifier. Rather than checking a cryptographic signature, it validates that the transaction was authorized by proving knowledge of a secret corresponding to the commitment hash.

**Shape**:

```typescript
{
  type: "cmt",
  hash: Uint8Array  // 32 bytes (64 hex chars)
}
```

**Fields**:

- `type`: Literal `"cmt"`
- `hash`: A `Uint8ArraySchema` value (32-byte commitment hash as Uint8Array)

---

## Composite Scripts

All composite scripts contain a `scripts` array that can hold nested scripts (leaf or composite).

### AnyScriptSchema

**Purpose**: At least one contained script must be satisfied.

**Shape**:

```typescript
{
  type: "any",
  scripts: BaseScriptSchema[]  // any one must satisfy
}
```

### AllScriptSchema

**Purpose**: All contained scripts must be satisfied.

**Shape**:

```typescript
{
  type: "all",
  scripts: BaseScriptSchema[]  // all must satisfy
}
```

### AtLeastScriptSchema

**Purpose**: At least N contained scripts must be satisfied.

**Shape**:

```typescript
{
  type: "atLeast",
  required: number,  // minimum number of scripts (integer >= 1)
  scripts: BaseScriptSchema[]  // at least N must satisfy
}
```

**Fields**:

- `required`: Integer ≥ 1, specifies minimum number of scripts that must be satisfied.

---

## Composite Schemas (Recursive)

### BaseScriptSchema

**Purpose**: Union of all script types for use inside `scripts` arrays.

**Includes**: `CommmitmentSchema`, `AnyScriptSchema`, `AllScriptSchema`, `AtLeastScriptSchema`

**Type**: Recursive (`scripts` arrays can contain `BaseScriptSchema` instances)

### NativeScriptSchema

**Purpose**: Top-level schema — only allows composite script types.

**Includes**: `AnyScriptSchema`, `AllScriptSchema`, `AtLeastScriptSchema`

**Note**: Standalone `{ type: "cmt", hash: "..." }` objects are rejected at the top level.

---

## Example Valid JSON (Input)

### Any type

```json
{
  "type": "any",
  "scripts": [
    {
      "type": "cmt",
      "hash": "a1b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01"
    },
    { "type": "cmt", "hash": "b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01" }
  ]
}
```

### AtLeast type

```json
{
  "type": "atLeast",
  "required": 2,
  "scripts": [
    { "type": "cmt", "hash": "d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef012345" },
    { "type": "cmt", "hash": "e5f6789012345678abcdef0123456789abcdef0123456789abcdef01234501" },
    { "type": "cmt", "hash": "f6789012345678abcdef0123456789abcdef0123456789abcdef0123456789" }
  ]
}
```

### Nested script

```json
{
  "type": "atLeast",
  "required": 2,
  "scripts": [
    {
      "type": "all",
      "scripts": [
        {
          "type": "cmt",
          "hash": "a1b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01"
        },
        {
          "type": "cmt",
          "hash": "b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01"
        }
      ]
    },
    { "type": "cmt", "hash": "c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01" }
  ]
}
```

---

## Parsed Output Shape

After validation with `NativeScriptSchema` or `BaseScriptSchema`:

- All `hash` fields are `Uint8Array` (32 bytes)
- `scripts` arrays contain nested script objects
- Hex strings are transformed via `fromHex` from `@midnight-ntwrk/compact-runtime`

---

## Implementation Notes

- **Recursion**: `BaseScriptSchema` uses `z.lazy()` to handle circular references in `scripts` arrays
- **Code reuse**: Composite schemas (`AnyScriptSchema`, etc.) are defined once and reused in both `BaseScriptSchema` and `NativeScriptSchema`
- **Discriminated union**: Uses `type` field to discriminate between script variants
- **Input normalization**: Hex strings and `Uint8Array` inputs are normalized to `Uint8Array` instances

---
