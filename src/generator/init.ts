import { CmtLeaf } from './utils.js';

export function initCircuitBody(leaves: CmtLeaf[]): string {
  const cmtToIds = leaves
    .flatMap((leaf) =>
      leaf.hashes.map((hash) => ({
        key: Buffer.from(hash).toString('hex'),
        path: leaf.path,
      }))
    )
    .reduce((map, { key, path }) => {
      const existing = map.get(key);
      const path_bytes = Buffer.from(path.padEnd(8)).toJSON().data.join(', ');
      if (existing) {
        existing.push(`Bytes[${path_bytes}]`);
      } else {
        map.set(key, [`Bytes[${path_bytes}]`]);
      }
      return map;
    }, new Map<string, string[]>());

  const assertion = `assert(commitmentsToIds.isEmpty(), "Init circuit has already been called");\n`;

  const uniquePaths = [...new Set(leaves.map((leaf) => leaf.path))];

  return (
    assertion +
    Array.from(cmtToIds)
      .map(([cmt, paths]) => {
        const hash_bytes = Buffer.from(cmt, 'hex').toJSON().data.join(', ');
        return (
          `commitmentsToIds.insertDefault(Bytes[${hash_bytes}]);\n` +
          paths
            .map((path) => `commitmentsToIds.lookup(Bytes[${hash_bytes}]).insert(${path});\n`)
            .join('')
        );
      })
      .join('') +
    Array.from(uniquePaths)
      .map((path) => {
        const pathBytes = Buffer.from(path.padEnd(8)).toJSON().data.join(', ');
        return `idsToCommitments.insertDefault(Bytes[${pathBytes}]);\n`;
      })
      .join('')
  );
}
