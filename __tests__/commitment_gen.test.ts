import { describe, it, expect } from 'vitest';
import { pureCircuits } from '../generated/managed/warden/contract/index.js';
import { generateSecretPair, generateCommitment } from '../src/index.js';

describe('getCommitment', () => {
  it('Typescript commitment matches Compact', () => {
    const secretPair = generateSecretPair();
    expect(generateCommitment(secretPair)).toStrictEqual(
      pureCircuits.getCommitment(secretPair.secret, secretPair.randomness)
    );
  });

  it('Typescript commitment matches Compact w fixed seed', () => {
    const seedBytes = crypto.getRandomValues(new Uint8Array(32));
    const seed = Buffer.from(seedBytes).toString('hex');

    const secretPair = generateSecretPair(seed);
    expect(generateCommitment(secretPair)).toStrictEqual(
      pureCircuits.getCommitment(secretPair.secret, secretPair.randomness)
    );
  });
});
