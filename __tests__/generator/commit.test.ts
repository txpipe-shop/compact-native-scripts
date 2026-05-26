import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import { NativeScriptSchema, collectCmtLeaves } from '../../src/index.js';
import { WardenSimulator } from './warden-simulator.js';

const input = NativeScriptSchema.parse(JSON.parse(readFileSync(process.env.TEST_INPUT!, 'utf-8')));
const cmtLeaves = collectCmtLeaves(input);
const cmtHashes = cmtLeaves.flatMap((leaf) => leaf.hashes);
const secretPairs = JSON.parse(readFileSync('examples/example-pairs.json', 'utf-8'));

const cmtHexSet = new Set(cmtHashes.map((h) => Buffer.from(h).toString('hex')));
const matchingPairs = secretPairs.filter((p) => cmtHexSet.has(p.commitment));

describe('Commit circuit', () => {
  it('prevents double commit of the same pair', () => {
    const { secret, randomness } = matchingPairs[0];
    const secretBytes = new Uint8Array(Buffer.from(secret, 'hex'));
    const randomnessBytes = new Uint8Array(Buffer.from(randomness, 'hex'));

    const sim = new WardenSimulator(secretBytes, randomnessBytes);
    sim.init();
    sim.commit();
    expect(() => sim.commit()).toThrow('already been registered');
  });

  it('rejects unauthorized secret', () => {
    const sim = new WardenSimulator();
    sim.init();
    expect(() => sim.commit()).toThrow('not authorized to commit');
  });

  it('rejects commit on uninitialized program', () => {
    const sim = new WardenSimulator();
    expect(() => sim.commit()).toThrow('Cannot commit to uninitialized contract');
  });

  it('inserts each commitment only into its authorized paths', () => {
    const allPaths = [...new Set(cmtLeaves.map((l) => l.path))];
    for (const { secret, randomness, commitment } of matchingPairs) {
      const authorizedLeaves = cmtLeaves.filter((l) =>
        l.hashes.some((h) => Buffer.from(h).toString('hex') === commitment)
      );
      const authorizedPaths = authorizedLeaves.map((l) => l.path);
      const otherPaths = allPaths.filter((p) => !authorizedPaths.includes(p));
      const secretBytes = new Uint8Array(Buffer.from(secret, 'hex'));
      const randomnessBytes = new Uint8Array(Buffer.from(randomness, 'hex'));
      const commitmentBytes = new Uint8Array(Buffer.from(commitment, 'hex'));
      const sim = new WardenSimulator(secretBytes, randomnessBytes);
      sim.init();
      const ledger = sim.commit();
      for (const path of authorizedPaths) {
        const pathBytes = new Uint8Array(Buffer.from(path.padEnd(8)));
        expect(ledger.idsToCommitments.lookup(pathBytes).member(commitmentBytes)).toBeTruthy();
      }
      for (const path of otherPaths) {
        const pathBytes = new Uint8Array(Buffer.from(path.padEnd(8)));
        expect(ledger.idsToCommitments.lookup(pathBytes).member(commitmentBytes)).toBeFalsy();
      }
    }
  });
});
