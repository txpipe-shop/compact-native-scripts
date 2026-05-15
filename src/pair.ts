import { CompactTypeBytes, persistentCommit } from '@midnight-ntwrk/compact-runtime';

/**
 * Pair of secret and randomness values used to generate a commitment.
 * Both should be 32-bytes.
 */
export type SecretPair = {
  secret: Uint8Array;
  randomness: Uint8Array;
};

/**
 * Generates a secret/randomness pair. If a 64-char hex seed is provided, it's used
 * as the secret; otherwise a random 32-byte secret is generated.
 */
export function generateSecretPair(seed?: string): SecretPair {
  let secret;
  if (!seed) {
    secret = crypto.getRandomValues(new Uint8Array(32));
  } else {
    if (seed.length !== 64) throw new Error('Seed must be 64 hex characters (32 bytes)');
    secret = new Uint8Array(Buffer.from(seed, 'hex'));
  }

  const randomness = crypto.getRandomValues(new Uint8Array(32));

  return {
    secret,
    randomness,
  };
}

/**
 * Generates a persistent commitment from a `SecretPair`.
 */
export function generateCommitment(pair: SecretPair) {
  const bytes_ctype = new CompactTypeBytes(32);
  const commitment = persistentCommit(bytes_ctype, pair.secret, pair.randomness);
  return commitment;
}
