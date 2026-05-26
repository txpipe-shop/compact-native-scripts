import { CmtLeaf, formatBytes, collectUniquePaths } from './utils.js';

/**
 * Generates the body of the Compact `commit()` circuit.
 *
 * For each unique path in the commitment tree, emits an assertion that the
 * commitment hasn't already been registered at that path, followed by a
 * conditional insert if the commitment hash is authorized.
 *
 * @param leaves - Collection of commitment leaves from the script input
 * @returns Compact source code for the commit circuit body
 */
export function commitCircuitBody(leaves: CmtLeaf[]): string {
  const uniquePaths = collectUniquePaths(leaves);

  return Array.from(uniquePaths)
    .map((path) => {
      const pathPayload = formatBytes(path.padEnd(8));
      return `assert(!idsToCommitments.lookup(${pathPayload}).member(commitment), "This commitment has already been registered");
if (commitmentsToIds.lookup(commitment).member(${pathPayload})) { idsToCommitments.lookup(${pathPayload}).insert(commitment); }
`;
    })
    .join('');
}
