import { NativeScriptSchema } from '../index.js';

export type CmtLeaf = {
  hashes: Uint8Array[];
  path: string;
};

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
        nested.push(...collectFromComposite(child, path ? `${path}.${i}` : `${i}`));
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
