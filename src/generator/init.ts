import { CmtLeaf, formatBytes, collectUniquePaths } from './utils.js';

/**
 * Generates the body of the Compact `init()` circuit.
 *
 * Populates the `commitmentsToIds` and `idsToCommitments` ledger maps with the
 * initial state derived from the script input. Each commitment hash is mapped to
 * its authorized path IDs, and each path ID gets an empty set ready for commit.
 *
 * @param leaves - Collection of commitment leaves from the script input
 * @returns Compact source code for the init circuit body
 */
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
      const formatted = formatBytes(path.padEnd(8));
      if (existing) {
        existing.push(formatted);
      } else {
        map.set(key, [formatted]);
      }
      return map;
    }, new Map<string, string[]>());

  const assertion = `assert(commitmentsToIds.isEmpty(), "Init circuit has already been called");\n`;

  const uniquePaths = collectUniquePaths(leaves);

  return (
    assertion +
    Array.from(cmtToIds)
      .map(([cmt, paths]) => {
        const formattedHash = formatBytes(Buffer.from(cmt, 'hex'));
        return (
          `commitmentsToIds.insertDefault(${formattedHash});\n` +
          paths
            .map((path) => `commitmentsToIds.lookup(${formattedHash}).insert(${path});\n`)
            .join('')
        );
      })
      .join('') +
    Array.from(uniquePaths)
      .map((path) => {
        return `idsToCommitments.insertDefault(${formatBytes(path.padEnd(8))});\n`;
      })
      .join('')
  );
}
