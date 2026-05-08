import type { NativeScriptSchema } from '../index.js';

const MODULE_DESCRIPTION = 'A contract library.';
const MODULE_EXTRA_COMMENTS = ' * Provides a mechanism to grant access to a circuit based on a set of commitments.';

export function generateCompact(
  script: NativeScriptSchema,
  languageVersion: string = '0.22.0'
): string {
  const initBody = '';
  const commitBody = '';
  const verifyBody = '';

  const formatCircuit = (body: string) => {
    if (!body.trim()) return '\n';
    return '\n    ' + body.split('\n').join('\n    ') + '\n  ';
  };

  return `// Compact Native Script Contract (access/Warden.compact)

pragma language_version ${languageVersion};

/**
 * @module Warden
 * @description ${MODULE_DESCRIPTION}
${MODULE_EXTRA_COMMENTS}
 */
export module Warden {
  import CompactStandardLibrary;

  /**
   * @description Store the IDs to which each committment has to be added.
   * @key commitment hash
   * @value set of IDs
   */
  export ledger commitmentsToIds: Map<Bytes<32>, Set<Bytes<16>>>;

  /**
   * @description Store commitments.
   * @key hash id of the set
   * @value set of commitments
   */
  export ledger idsToCommitments: Map<Bytes<16>, Set<Bytes<32>>>;

  /**
   * @description Witness function to fetch a secret from the wallet.
   * This secret will be used to obtain the commitment.
   */
  witness localSecret(): Bytes<32>;

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
  export circuit commit(): [] {${formatCircuit(commitBody)}
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
}`;
}
