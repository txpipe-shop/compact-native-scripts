import type { NativeScriptSchema } from '../index.js';
import { commitCircuitBody } from './commit.js';
import { initCircuitBody } from './init.js';
import { collectCmtLeaves } from './utils.js';
import { verifyCircuitBody } from './verify.js';

const MODULE_DESCRIPTION = 'A contract library.';
const MODULE_EXTRA_COMMENTS =
  ' * Provides a mechanism to grant access to a circuit based on a set of commitments.';

/**
 * Generates the complete Compact source code for a Warden native script contract.
 *
 * Orchestrates the generation of `init`, `commit`, and `verify` circuits from a
 * native script input and its commitment leaves, producing a ready-to-compile
 * Compact module.
 *
 * @param script - Native script input describing the access-control policy
 * @param languageVersion - Compact language version string (default `'0.23.0'`)
 * @returns Full Compact module source code as a string
 */
export function generateCompact(
  script: NativeScriptSchema,
  languageVersion: string = '0.23.0',
  testMode: boolean = false
): string {
  const cmtLeaves = collectCmtLeaves(script);
  const initBody = initCircuitBody(cmtLeaves);
  const commitBody = commitCircuitBody(cmtLeaves);
  const verifyBody = verifyCircuitBody(script, cmtLeaves);

  const formatCircuit = (body: string) => {
    if (!body.trim()) return '\n';
    return '\n    ' + body.trimEnd().split('\n').join('\n    ');
  };

  const testSuffix = testMode
    ? '\n\nimport Warden;\n\nexport { getCommitment, init, commit, verify, idsToCommitments, commitmentsToIds };\n'
    : '\n';

  return `// Compact Native Script Contract (access/Warden.compact)

pragma language_version ${languageVersion};

/**
 * @module Warden
 * @description ${MODULE_DESCRIPTION}
${MODULE_EXTRA_COMMENTS}
 */
module Warden {
  import CompactStandardLibrary;

  /**
   * @description Store the IDs to which each committment has to be added.
   * @key commitment hash
   * @value set of IDs
   */
  export ledger commitmentsToIds: Map<Bytes<32>, Set<Bytes<8>>>;

  /**
   * @description Store commitments.
   * @key hash id of the set
   * @value set of commitments
   */
  export ledger idsToCommitments: Map<Bytes<8>, Set<Bytes<32>>>;

  /**
   * @description Witness function to fetch a secret from the wallet.
   * This secret will be used to obtain the commitment.
   */
  witness localSecret(): Bytes<32>;

  /**
   * @description Witness function to fetch the randomness that along with a secret
   * generates a specific commitment.
   */
  witness randomness(): Bytes<32>;

  /**
   * @description Generates the commitment that will be added into the idsToCommitments ledger.
   */
  export pure circuit getCommitment(secret: Bytes<32>, randomness: Bytes<32>): Bytes<32> {
    return persistentCommit<Bytes<32>>(secret, randomness);
  }

  /**
   * @description Initialize state. Constructors are not available within
   * modules, so this circuit has to be called from the overall program's
   * top level constructor.
   */
  export circuit init(): [] {${formatCircuit(initBody)}
  }

  /**
   * @description Add a commitment if it is authorized (member of
   * commitmentsToIds).
   */
  export circuit commit(): [] {
    assert(!commitmentsToIds.isEmpty(), "Cannot commit to uninitialized contract");
    const commitment = getCommitment(localSecret(), randomness());
    assert(commitmentsToIds.member(commitment), "This key is not authorized to commit in this contract");
    assert(!commitmentsToIds.lookup(commitment).isEmpty(), "Commitment ID set is empty");${formatCircuit(commitBody)}
  }

  /**
   * @description Checks that the commitments currently present satisfy the
   * predefined conditions.
   *
   * @notice this is the access-control entry point that the application
   * has to call before execution.
   */
  export circuit verify(): [] {${formatCircuit(verifyBody)}
  }
}${testSuffix}`;
}

export { collectCmtLeaves };
