import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import { NativeScriptSchema, collectCmtLeaves } from '../../src/index.js';
import { WardenSimulator } from './warden-simulator.js';

const input = NativeScriptSchema.parse(JSON.parse(readFileSync(process.env.TEST_INPUT!, 'utf-8')));
const cmtLeaves = collectCmtLeaves(input);
const secretPairs = JSON.parse(readFileSync('examples/example-pairs.json', 'utf-8'));
const cmtHexSet = new Set(cmtLeaves.flatMap((l) => l.hashes).map((h) => Buffer.from(h).toString('hex')));
const matchingPairs = secretPairs.filter((p: any) => cmtHexSet.has(p.commitment));

function hasTimeLocks(script: NativeScriptSchema): boolean {
  if (script.type === 'after' || script.type === 'before') return true;
  if ('scripts' in script) return script.scripts.some(hasTimeLocks);
  return false;
}

function hasCmtLeaves(script: NativeScriptSchema): boolean {
  if (script.type === 'cmt') return true;
  if ('scripts' in script) return script.scripts.some(hasCmtLeaves);
  return false;
}

describe('Verify circuit', () => {
  it.runIf(hasCmtLeaves(input) && !hasTimeLocks(input))('passes when all matching commitments are committed', () => {
    const sim = new WardenSimulator();
    sim.init();
    for (const { secret, randomness } of matchingPairs) {
      sim.commitWith(
        new Uint8Array(Buffer.from(secret, 'hex')),
        new Uint8Array(Buffer.from(randomness, 'hex')),
      );
    }
    expect(() => sim.verify()).not.toThrow();
  });

  it('fails on uninitialized contract', () => {
    const sim = new WardenSimulator();
    expect(() => sim.verify()).toThrow();
  });

  it.runIf(!hasTimeLocks(input))('fails when no commitments are committed', () => {
    const sim = new WardenSimulator();
    sim.init();
    expect(() => sim.verify()).toThrow('Commitments or time-lock conditions not satisfied');
  });

  it.runIf(hasTimeLocks(input))('passes when current block meets time-lock conditions', () => {
    const sim = new WardenSimulator();
    sim.init();
    for (const { secret, randomness } of matchingPairs) {
      sim.commitWith(
        new Uint8Array(Buffer.from(secret, 'hex')),
        new Uint8Array(Buffer.from(randomness, 'hex')),
      );
    }
    sim.setBlockTime(1_000_000_000);
    expect(() => sim.verify()).not.toThrow();
  });

  it.runIf(hasTimeLocks(input))('fails when current block is before after threshold', () => {
    const sim = new WardenSimulator();
    sim.init();
    for (const { secret, randomness } of matchingPairs) {
      sim.commitWith(
        new Uint8Array(Buffer.from(secret, 'hex')),
        new Uint8Array(Buffer.from(randomness, 'hex')),
      );
    }
    sim.setBlockTime(0);
    expect(() => sim.verify()).toThrow();
  });

  it.runIf(hasCmtLeaves(input) && !hasTimeLocks(input))('fails when not enough commitments are committed', () => {
    if (matchingPairs.length < 2) return;
    const { secret, randomness } = matchingPairs[0];
    const sim = new WardenSimulator(
      new Uint8Array(Buffer.from(secret, 'hex')),
      new Uint8Array(Buffer.from(randomness, 'hex')),
    );
    sim.init();
    sim.commit();
    if (input.type === 'all' || (input.type === 'atLeast' && input.required > 1)) {
      expect(() => sim.verify()).toThrow();
    }
  });
});
