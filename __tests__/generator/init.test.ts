import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import { NativeScriptSchema, collectCmtLeaves } from '../../src/index.js';
import { WardenSimulator } from './warden-simulator.js';

const input = NativeScriptSchema.parse(JSON.parse(readFileSync(process.env.TEST_INPUT!, 'utf-8')));
const cmtLeaves = collectCmtLeaves(input);
const cmtHashes = cmtLeaves.flatMap((leaf) => leaf.hashes);
const paths = [...new Set(cmtLeaves.flatMap((leaf) => leaf.path))];

describe('Init circuit', () => {
  it('initialized commitmentToIds should not be empty', () => {
    const sim = new WardenSimulator();
    expect(sim.init().commitmentsToIds.isEmpty()).toBeFalsy();
  });

  it('initialized idsToCommitments should not be empty', () => {
    const sim = new WardenSimulator();
    expect(sim.init().idsToCommitments.isEmpty()).toBeFalsy();
  });

  it('initialized ledger state matches input', () => {
    const sim = new WardenSimulator();
    const updatedLedger = sim.init();
    cmtHashes.forEach((hash) =>
      expect(updatedLedger.commitmentsToIds.lookup(hash).isEmpty()).toBeFalsy()
    );
  });

  it('initialized idsToCommitments match amount of scripts', () => {
    const sim = new WardenSimulator();
    const updatedLedger = sim.init();
    expect(updatedLedger.idsToCommitments.size()).toStrictEqual(BigInt(paths.length));
  });

  it('double init throws', () => {
    const sim = new WardenSimulator();
    sim.init();
    expect(() => sim.init()).toThrow('Init circuit has already been called');
  });
});
