import type { NativeScriptSchema } from '../index.js';

const MODULE_DESCRIPTION = 'A contract library.';
const MODULE_EXTRA_COMMENTS = ' * Provides a mechanism to grant access to a circuit based on a set of commitments.';

export function generateCompact(
  script: NativeScriptSchema,
  languageVersion: string = '0.22.0'
): string {
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
module Warden {
  import CompactStandardLibrary;

  export circuit commit(): [] {${formatCircuit(commitBody)}
  }

  export circuit verify(): [] {${formatCircuit(verifyBody)}
  }
}`;
}
