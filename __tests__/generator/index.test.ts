import { describe, it, expect } from 'vitest';
import { generateCompact } from '../../src/generator/index.js';

const minimalScript = {
  type: 'cmt' as const,
  hash: new Uint8Array(32).fill(0xab),
};

describe('generateCompact', () => {
  it('returns a non-empty string', () => {
    const result = generateCompact(minimalScript);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('contains the pragma with default language version', () => {
    const result = generateCompact(minimalScript);
    expect(result).toContain('pragma language_version 0.23.0');
  });

  it('uses the provided language version', () => {
    const result = generateCompact(minimalScript, '1.0.0');
    expect(result).toContain('pragma language_version 1.0.0');
  });

  it('contains module declaration', () => {
    const result = generateCompact(minimalScript);
    expect(result).toContain('module Warden');
  });

  it('declares the commitmentsToIds ledger', () => {
    const result = generateCompact(minimalScript);
    expect(result).toContain('export ledger commitmentsToIds');
  });

  it('declares the idsToCommitments ledger', () => {
    const result = generateCompact(minimalScript);
    expect(result).toContain('export ledger idsToCommitments');
  });

  it('declares the localSecret witness', () => {
    const result = generateCompact(minimalScript);
    expect(result).toContain('witness localSecret');
  });

  it('declares all three circuits', () => {
    const result = generateCompact(minimalScript);
    expect(result).toContain('export circuit init');
    expect(result).toContain('export circuit commit');
    expect(result).toContain('export circuit verify');
  });

  it('has empty circuit bodies (current stub behavior)', () => {
    const result = generateCompact(minimalScript);

    const initMatch = result.match(/export circuit init\(\)/);
    const commitMatch = result.match(/export circuit commit\(\)/);
    const verifyMatch = result.match(/export circuit verify\(\)/);

    expect(initMatch).toBeTruthy();
    expect(commitMatch).toBeTruthy();
    expect(verifyMatch).toBeTruthy();
  });

  it('includes the module description', () => {
    const result = generateCompact(minimalScript);
    expect(result).toContain('A contract library.');
  });

  it('works with a composite script', () => {
    const compositeScript = {
      type: 'all' as const,
      scripts: [
        { type: 'cmt' as const, hash: new Uint8Array(32).fill(0x01) },
        { type: 'cmt' as const, hash: new Uint8Array(32).fill(0x02) },
      ],
    };
    const result = generateCompact(compositeScript);
    expect(result).toContain('pragma language_version 0.23.0');
    expect(result).toContain('module Warden');
  });

  it('works with a deeply nested composite script', () => {
    const nestedScript = {
      type: 'atLeast' as const,
      required: 1,
      scripts: [
        {
          type: 'any' as const,
          scripts: [
            { type: 'cmt' as const, hash: new Uint8Array(32).fill(0xaa) },
            { type: 'after' as const, block: 100 },
          ],
        },
        { type: 'before' as const, block: 500 },
      ],
    };
    const result = generateCompact(nestedScript);
    expect(result).toContain('module Warden');
    expect(result).toContain('pragma language_version 0.23.0');
  });
});
