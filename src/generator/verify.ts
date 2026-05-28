import type { NativeScriptSchema } from '../index.js';
import { formatBytes, collectUniquePaths } from './utils.js';
import type { CmtLeaf } from './utils.js';

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  return [
    ...combinations(rest, k - 1).map((c) => [first, ...c]),
    ...combinations(rest, k),
  ];
}

type GenResult = {
  expr: string;
  lines: string[];
};

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
    case 'any':
    case 'all':
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

      let combined: string;

      if (script.type === 'atLeast') {
        combined = combinations(parts, script.required)
          .map((c) => `(${c.join(' && ')})`)
          .join(' || ');
      } else {
        const op = script.type === 'all' ? ' && ' : ' || ';
        combined = parts.join(op);
      }

      lines.push(`const id_${path} = ${combined};`);
      return { expr: `id_${path}`, lines };
    }
  }
}

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