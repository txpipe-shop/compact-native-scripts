import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import { NativeScriptSchema, collectCmtLeaves } from '../../src/index.js';
import { WardenSimulator } from './warden-simulator.js';
import { PrivateState } from './witnesses.js';

const input = NativeScriptSchema.parse(JSON.parse(readFileSync(process.env.TEST_INPUT!, 'utf-8')));
const cmtLeaves = collectCmtLeaves(input);
const hasCmt = cmtLeaves.length > 0;
const secretPairs = JSON.parse(readFileSync('examples/example-pairs.json', 'utf-8'));
const cmtHexSet = new Set(
  cmtLeaves.flatMap((l) => l.hashes).map((h) => Buffer.from(h).toString('hex'))
);
const matchingPairs = secretPairs.filter((p: any) => cmtHexSet.has(p.commitment));
const isAtLeast = input.type === 'atLeast';
const atLeastRequired = isAtLeast ? input.required : 0;
const isFlatAtLeast =
  isAtLeast &&
  (input.scripts as NativeScriptSchema[]).every(
    (c) => c.type === 'cmt' || c.type === 'after' || c.type === 'before'
  );

function hasTimeLocks(script: NativeScriptSchema): boolean {
  if (script.type === 'after' || script.type === 'before') return true;
  if ('scripts' in script) return script.scripts.some(hasTimeLocks);
  return false;
}

describe('Verify circuit', () => {
  it.runIf(hasCmt && !hasTimeLocks(input))(
    'passes when all matching commitments are committed',
    () => {
      const sim = new WardenSimulator();
      sim.init();
      for (const { secret, randomness } of matchingPairs) {
        sim.commitWith(
          new Uint8Array(Buffer.from(secret, 'hex')),
          new Uint8Array(Buffer.from(randomness, 'hex'))
        );
      }
      expect(() => sim.verify()).not.toThrow();
    }
  );

  it('fails on uninitialized contract', () => {
    const sim = new WardenSimulator();
    expect(() => sim.verify()).toThrow();
  });

  it.runIf(hasCmt)('fails when verifying with an unauthorized key', () => {
    const sim = new WardenSimulator();
    sim.init();
    for (const { secret, randomness } of matchingPairs) {
      sim.commitWith(
        new Uint8Array(Buffer.from(secret, 'hex')),
        new Uint8Array(Buffer.from(randomness, 'hex'))
      );
    }
    sim.contract.context = {
      ...sim.contract.context,
      currentPrivateState: {
        secret: new Uint8Array(32).fill(42),
        randomness: new Uint8Array(32).fill(99),
      } as PrivateState,
    };
    expect(() => sim.verify()).toThrow('This key is not authorized to verify this contract');
  });

  it.runIf(hasCmt && !hasTimeLocks(input))('fails when no commitments are committed', () => {
    const sim = new WardenSimulator();
    sim.init();
    expect(() => sim.verify()).toThrow('This key is not authorized to verify this contract');
  });

  it.runIf(hasTimeLocks(input))('passes when current block meets time-lock conditions', () => {
    const sim = new WardenSimulator();
    if (hasCmt) {
      sim.init();
      for (const { secret, randomness } of matchingPairs) {
        sim.commitWith(
          new Uint8Array(Buffer.from(secret, 'hex')),
          new Uint8Array(Buffer.from(randomness, 'hex'))
        );
      }
    }
    sim.setBlockTime(400);
    expect(() => sim.verify()).not.toThrow();
  });

  it.runIf(hasTimeLocks(input))('fails when current block is before after threshold', () => {
    const sim = new WardenSimulator();
    if (hasCmt) {
      sim.init();
      for (const { secret, randomness } of matchingPairs) {
        sim.commitWith(
          new Uint8Array(Buffer.from(secret, 'hex')),
          new Uint8Array(Buffer.from(randomness, 'hex'))
        );
      }
    }
    sim.setBlockTime(0);
    expect(() => sim.verify()).toThrow();
  });

  it.runIf(hasCmt)('cleans up idsToCommitments after successful verify', () => {
    const sim = new WardenSimulator();
    sim.init();
    for (const { secret, randomness } of matchingPairs) {
      sim.commitWith(
        new Uint8Array(Buffer.from(secret, 'hex')),
        new Uint8Array(Buffer.from(randomness, 'hex'))
      );
    }
    if (hasTimeLocks(input)) sim.setBlockTime(400);

    const paths = [...new Set(cmtLeaves.map((l) => l.path))];
    for (const p of paths) {
      expect(
        (sim.getLedger() as any).idsToCommitments.lookup(Buffer.from(p.padEnd(8))).isEmpty()
      ).toBe(false);
    }

    expect(() => sim.verify()).not.toThrow();

    for (const p of paths) {
      expect(
        (sim.getLedger() as any).idsToCommitments.lookup(Buffer.from(p.padEnd(8))).isEmpty()
      ).toBe(true);
    }
  });

  it.runIf(hasCmt && hasTimeLocks(input))(
    'leaves idsToCommitments unchanged when verify fails',
    () => {
      const sim = new WardenSimulator();
      sim.init();
      for (const { secret, randomness } of matchingPairs) {
        sim.commitWith(
          new Uint8Array(Buffer.from(secret, 'hex')),
          new Uint8Array(Buffer.from(randomness, 'hex'))
        );
      }

      const paths = [...new Set(cmtLeaves.map((l) => l.path))];
      const before: Record<string, string[]> = {};
      for (const p of paths) {
        const key = Buffer.from(p.padEnd(8));
        before[p] = [...(sim.getLedger() as any).idsToCommitments.lookup(key)]
          .map((b: Uint8Array) => Buffer.from(b).toString('hex'))
          .sort();
      }

      sim.setBlockTime(0);
      expect(() => sim.verify()).toThrow();

      for (const p of paths) {
        const key = Buffer.from(p.padEnd(8));
        const after = [...(sim.getLedger() as any).idsToCommitments.lookup(key)]
          .map((b: Uint8Array) => Buffer.from(b).toString('hex'))
          .sort();
        expect(after).toEqual(before[p]);
      }
    }
  );

  it.runIf(isFlatAtLeast && matchingPairs.length >= atLeastRequired)(
    'atLeast: passes when exactly required number of commitments are committed',
    () => {
      const sim = new WardenSimulator();
      sim.init();
      for (const { secret, randomness } of matchingPairs.slice(0, atLeastRequired)) {
        sim.commitWith(
          new Uint8Array(Buffer.from(secret, 'hex')),
          new Uint8Array(Buffer.from(randomness, 'hex'))
        );
      }
      expect(() => sim.verify()).not.toThrow();
    }
  );

  it.runIf(isFlatAtLeast && matchingPairs.length > atLeastRequired)(
    'atLeast: passes when more than required number are committed',
    () => {
      const sim = new WardenSimulator();
      sim.init();
      for (const { secret, randomness } of matchingPairs) {
        sim.commitWith(
          new Uint8Array(Buffer.from(secret, 'hex')),
          new Uint8Array(Buffer.from(randomness, 'hex'))
        );
      }
      expect(() => sim.verify()).not.toThrow();
    }
  );

  it.runIf(isFlatAtLeast && atLeastRequired > 1 && matchingPairs.length >= atLeastRequired)(
    'atLeast: fails when fewer than required are committed',
    () => {
      const sim = new WardenSimulator();
      sim.init();
      for (const { secret, randomness } of matchingPairs.slice(0, atLeastRequired - 1)) {
        sim.commitWith(
          new Uint8Array(Buffer.from(secret, 'hex')),
          new Uint8Array(Buffer.from(randomness, 'hex'))
        );
      }
      expect(() => sim.verify()).toThrow('Commitments or time-lock conditions not satisfied');
    }
  );

  it.runIf(isAtLeast && hasCmt)('atLeast: fails when no commitments are committed', () => {
    const sim = new WardenSimulator();
    sim.init();
    expect(() => sim.verify()).toThrow('This key is not authorized to verify this contract');
  });

  it.runIf(isAtLeast)('atLeast: fails on uninitialized contract', () => {
    const sim = new WardenSimulator();
    expect(() => sim.verify()).toThrow();
  });

  it.runIf(isFlatAtLeast && matchingPairs.length >= atLeastRequired)(
    'atLeast: cleans up idsToCommitments after successful verify',
    () => {
      const sim = new WardenSimulator();
      sim.init();
      for (const { secret, randomness } of matchingPairs.slice(0, atLeastRequired)) {
        sim.commitWith(
          new Uint8Array(Buffer.from(secret, 'hex')),
          new Uint8Array(Buffer.from(randomness, 'hex'))
        );
      }

      const paths = [...new Set(cmtLeaves.map((l) => l.path))];
      for (const p of paths) {
        expect(
          (sim.getLedger() as any).idsToCommitments.lookup(Buffer.from(p.padEnd(8))).isEmpty()
        ).toBe(false);
      }

      expect(() => sim.verify()).not.toThrow();

      for (const p of paths) {
        expect(
          (sim.getLedger() as any).idsToCommitments.lookup(Buffer.from(p.padEnd(8))).isEmpty()
        ).toBe(true);
      }
    }
  );

  it.runIf(isAtLeast && hasTimeLocks(input))(
    'atLeast: passes when time-lock conditions are met',
    () => {
      const sim = new WardenSimulator();
      if (hasCmt) {
        sim.init();
        for (const { secret, randomness } of matchingPairs) {
          sim.commitWith(
            new Uint8Array(Buffer.from(secret, 'hex')),
            new Uint8Array(Buffer.from(randomness, 'hex'))
          );
        }
      }
      sim.setBlockTime(400);
      expect(() => sim.verify()).not.toThrow();
    }
  );
});
