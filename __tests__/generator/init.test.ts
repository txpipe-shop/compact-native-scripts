import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import { NativeScriptSchema, collectCmtLeaves } from '../../src/index.js';
import { WardenSimulator } from './warden-simulator.js';

const input = NativeScriptSchema.parse(JSON.parse(readFileSync(process.env.TEST_INPUT!, 'utf-8')));
const cmtLeaves = collectCmtLeaves(input);
const hasCmt = cmtLeaves.length > 0;
const cmtHashes = hasCmt ? cmtLeaves.flatMap((leaf) => leaf.hashes) : [];
const paths = hasCmt ? [...new Set(cmtLeaves.flatMap((leaf) => leaf.path))] : [];

describe('Init circuit', () => {
  it.runIf(hasCmt)('initialized commitmentToIds should not be empty', () => {
    const sim = new WardenSimulator();
    expect((sim.init() as any).commitmentsToIds.isEmpty()).toBeFalsy();
  });

  it.runIf(hasCmt)('initialized idsToCommitments should not be empty', () => {
    const sim = new WardenSimulator();
    expect((sim.init() as any).idsToCommitments.isEmpty()).toBeFalsy();
  });

  it.runIf(hasCmt)('initialized ledger state matches input', () => {
    const sim = new WardenSimulator();
    const updatedLedger = sim.init() as any;
    cmtHashes.forEach((hash) =>
      expect(updatedLedger.commitmentsToIds.lookup(hash).isEmpty()).toBeFalsy()
    );
  });

  it.runIf(hasCmt)('initialized idsToCommitments match amount of scripts', () => {
    const sim = new WardenSimulator();
    const updatedLedger = sim.init() as any;
    expect(updatedLedger.idsToCommitments.size()).toStrictEqual(BigInt(paths.length));
  });

  it.runIf(hasCmt)('double init throws', () => {
    const sim = new WardenSimulator();
    sim.init();
    expect(() => sim.init()).toThrow('Init circuit has already been called');
  });
});
