import { CmtLeaf } from './utils.js';

export function commitCircuitBody(leaves: CmtLeaf[]): string {
  const uniquePaths = [...new Set(leaves.map((leaf) => leaf.path))];

  return Array.from(uniquePaths)
    .map((path) => {
      const pathPayload = `Bytes[${Buffer.from(path.padEnd(8)).toJSON().data.join(', ')}]`;
      return `assert(!idsToCommitments.lookup(${pathPayload}).member(commitment), "This commitment has already been registered");
if (commitmentsToIds.lookup(commitment).member(${pathPayload})) { idsToCommitments.lookup(${pathPayload}).insert(commitment); }
`;
    })
    .join('');
}
