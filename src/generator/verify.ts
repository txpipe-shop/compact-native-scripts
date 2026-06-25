import type { NativeScriptSchema } from '../index.js';
import { formatBytes, collectUniquePaths } from './utils.js';
import type { CmtLeaf } from './utils.js';

/**
 * Result of recursively generating a Compact expression from a script subtree.
 *
 * @property expr - Variable name that holds this subtree's result
 * @property lines - Compact source lines emitted so far
 */
type GenResult = {
  expr: string;
  lines: string[];
};

/**
 * Recursively generates Compact expressions for a native script subtree.
 *
 * Walks the tree and emits constraint expressions for commitment lookups,
 * time-lock checks, and combinators (`any`, `all`, `atLeast`).
 *
 * @param script - Script subtree to generate expressions for
 * @param path - Dot-separated tree path identifying this node's position
 * @returns Expression result with the variable reference and generated lines
 */
function genExpr(script: NativeScriptSchema, path: string): GenResult {
  switch (script.type) {
    case 'cmt': {
      const hash = formatBytes(script.hash);
      const id = formatBytes(path.padEnd(8));
      const expr = `idsToCommitments.lookup(${id}).member(${hash})`;
      return { expr: `id_${path}`, lines: [`const id_${path} = ${expr};`] };
    }
    case 'after': {
      return {
        expr: `id_${path}`,
        lines: [`const id_${path} = blockTimeGte(${script.block});`],
      };
    }
    case 'before': {
      return {
        expr: `id_${path}`,
        lines: [`const id_${path} = blockTimeLt(${script.block});`],
      };
    }
    /**
     * Generates a linear counter sum for atLeast N-of-M conditions.
     *
     * Each child expression is converted to a boolean via ternary (`? 1 : 0`),
     * summed with `+`, and compared against the required threshold.
     * This is O(n) in the number of children, avoiding the combinatorial
     * explosion of generating all k-combinations.
     */
    case 'atLeast': {
      const children: GenResult[] = [];
      const inlineExprs: string[] = [];
      const lines: string[] = [];

      for (let i = 0; i < script.scripts.length; i++) {
        const child = script.scripts[i];
        if (child.type === 'cmt') {
          const hash = formatBytes(child.hash);
          const id = formatBytes(path.padEnd(8));
          inlineExprs.push(`idsToCommitments.lookup(${id}).member(${hash})`);
        } else if (child.type === 'after') {
          inlineExprs.push(`blockTimeGte(${child.block})`);
        } else if (child.type === 'before') {
          inlineExprs.push(`blockTimeLt(${child.block})`);
        } else if (child.type === 'any' || child.type === 'all' || child.type === 'atLeast') {
          const childPath = path ? `${path}_${i}` : `${i}`;
          const childResult = genExpr(child, childPath);
          if (childResult.expr === '') continue;
          children.push(childResult);
          lines.push(...childResult.lines);
        }
      }

      const parts = [...inlineExprs, ...children.map((c) => c.expr)];
      if (parts.length === 0) return { expr: '', lines };

      const sum = parts.map((p) => `(${p} ? 1 : 0)`).join(' + ');
      lines.push(`const id_${path} = (${sum}) >= ${script.required};`);
      return { expr: `id_${path}`, lines };
    }
    case 'any':
    case 'all': {
      const children: GenResult[] = [];
      const inlineExprs: string[] = [];
      const lines: string[] = [];

      for (let i = 0; i < script.scripts.length; i++) {
        const child = script.scripts[i];
        if (child.type === 'cmt') {
          const hash = formatBytes(child.hash);
          const id = formatBytes(path.padEnd(8));
          inlineExprs.push(`idsToCommitments.lookup(${id}).member(${hash})`);
        } else if (child.type === 'after') {
          inlineExprs.push(`blockTimeGte(${child.block})`);
        } else if (child.type === 'before') {
          inlineExprs.push(`blockTimeLt(${child.block})`);
        } else if (child.type === 'any' || child.type === 'all' || child.type === 'atLeast') {
          const childPath = path ? `${path}_${i}` : `${i}`;
          const childResult = genExpr(child, childPath);
          if (childResult.expr === '') continue;
          children.push(childResult);
          lines.push(...childResult.lines);
        }
      }

      const parts = [...inlineExprs, ...children.map((c) => c.expr)];
      if (parts.length === 0) return { expr: '', lines };

      const op = script.type === 'all' ? ' && ' : ' || ';
      lines.push(`const id_${path} = ${parts.join(op)};`);
      return { expr: `id_${path}`, lines };
    }
  }
}

/**
 * Generates the Compact `verify()` circuit body.
 *
 * Asserts that either the required commitments are committed or time-lock
 * conditions are satisfied. After a successful assertion, resets the
 * `idsToCommitments` map entries to their default (empty) state.
 *
 * @param script - Native script input
 * @param cmtLeaves - Commitment leaves from the script tree
 * @returns Compact source code for the verify circuit body
 */
export function verifyCircuitBody(script: NativeScriptSchema, cmtLeaves: CmtLeaf[]): string {
  const result = genExpr(script, '0');
  if (result.expr === '') return '';
  const paths = collectUniquePaths(cmtLeaves);
  const cleanup = paths
    .map((p) => `idsToCommitments.lookup(${formatBytes(p.padEnd(8))}).resetToDefault();`)
    .join('\n');
  return (
    result.lines.join('\n') +
    '\nassert(id_0, "Commitments or time-lock conditions not satisfied");\n' +
    (cleanup ? cleanup + '\n' : '')
  );
}
