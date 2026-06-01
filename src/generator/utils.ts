import { NativeScriptSchema } from '../index.js';

/**
 * Formats a byte array or string as a Compact `Bytes[...]` literal.
 *
 * @param input - Raw bytes as a `Uint8Array`, or a string whose UTF-8 encoding is used
 * @returns Compact byte literal, e.g. `Bytes[72, 101, 108, 108, 111]`
 */
export function formatBytes(input: Uint8Array | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : Buffer.from(input);
  return `Bytes[${buf.toJSON().data.join(', ')}]`;
}

/**
 * Collects the set of unique path strings from the given commitment leaves.
 *
 * Each leaf has a `.path` property like `"0"` or `"0.1"` identifying its
 * position in the script tree.
 *
 * @param leaves - Commitment leaves to extract paths from
 * @returns Unique path strings
 */
export function collectUniquePaths(leaves: CmtLeaf[]): string[] {
  return [...new Set(leaves.map((leaf) => leaf.path))];
}

/**
 * A commitment leaf in the script tree.
 *
 * @property hashes - Commitment hashes (32 bytes each) at this position
 * @property path - Dot-separated tree path, e.g. `"0"` or `"0.1"`
 */
export type CmtLeaf = {
  hashes: Uint8Array[];
  path: string;
};

/**
 * Walks the script tree and returns the maximum `block` value from all `after` clauses.
 *
 * Used by tests to determine the required block time so that time-lock
 * conditions are satisfied during verification.
 *
 * @param script - The native script tree
 * @returns The maximum after-block value, or `0n` if no after clauses exist
 */
export function collectMaxAfterBlock(script: NativeScriptSchema): bigint {
  switch (script.type) {
    case 'after':
      return BigInt(script.block);
    case 'before':
    case 'cmt':
      return 0n;
    case 'any':
    case 'all':
    case 'atLeast':
      return script.scripts.reduce((max: bigint, child) => {
        const val = collectMaxAfterBlock(child);
        return val > max ? val : max;
      }, 0n);
  }
}

/**
 * Collects all commitment leaves from the script input.
 *
 * Walks the tree recursively, aggregating `cmt` nodes into `CmtLeaf` entries
 * grouped by their composite parent path.
 *
 * @param script - The native script input
 * @returns Commitment leaves with their tree paths
 */
export function collectCmtLeaves(script: NativeScriptSchema): CmtLeaf[] {
  switch (script.type) {
    case 'cmt':
      return [{ hashes: [script.hash], path: '0' }];
    case 'after':
    case 'before':
      return [];
    case 'any':
    case 'all':
    case 'atLeast':
      return collectFromComposite(script, '0');
  }
}

function collectFromComposite(
  script: Extract<NativeScriptSchema, { type: 'any' | 'all' | 'atLeast' }>,
  path: string
): CmtLeaf[] {
  const directCmts: Uint8Array[] = [];
  const nested: CmtLeaf[] = [];

  for (let i = 0; i < script.scripts.length; i++) {
    const child = script.scripts[i];
    switch (child.type) {
      case 'cmt':
        directCmts.push(child.hash);
        break;
      case 'after':
      case 'before':
        break;
      case 'any':
      case 'all':
      case 'atLeast':
        nested.push(...collectFromComposite(child, path ? `${path}_${i}` : `${i}`));
        break;
    }
  }

  const result: CmtLeaf[] = [];
  if (directCmts.length > 0) {
    result.push({ hashes: directCmts, path });
  }
  result.push(...nested);
  return result;
}
