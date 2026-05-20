import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import { NativeScriptSchema, collectCmtLeaves } from '../../src/index.js';
import { WardenSimulator } from './warden-simulator.js';

const input = NativeScriptSchema.parse(JSON.parse(readFileSync(process.env.TEST_INPUT!, 'utf-8')));
const cmtHashes = collectCmtLeaves(input).flatMap((leaf) => leaf.hashes);

describe('Init circuit', () => {
  it('initialized commitmentToIds shouldnt be empty', () => {
    const sim = new WardenSimulator();
    expect(sim.init().commitmentsToIds.isEmpty()).toBeFalsy();
  });

  it('initialized idsToCommitments should be empty', () => {
    const sim = new WardenSimulator();
    expect(sim.init().idsToCommitments.isEmpty()).toBeTruthy();
  });

  it('initialized ledger state matches input', () => {
    const sim = new WardenSimulator();
    const updatedLedger = sim.init();
    cmtHashes.forEach((hash) =>
      expect(updatedLedger.commitmentsToIds.lookup(hash).isEmpty()).toBeFalsy()
    );
  });

  it('double init throws', () => {
    const sim = new WardenSimulator();
    sim.init();
    expect(() => sim.init()).toThrow('Init circuit has already been called');
  });
});
