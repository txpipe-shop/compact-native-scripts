import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { NativeScriptSchema } from '../src/schema.js';

const inputsDir = join(import.meta.dirname, '../examples/inputs');
const files = readdirSync(inputsDir).filter((f) => f.endsWith('.json'));

describe('Tests schema on example inputs', () => {
  for (const file of files) {
    it(`parses ${file} correctly`, () => {
      const raw = JSON.parse(readFileSync(join(inputsDir, file), 'utf-8'));
      const result = NativeScriptSchema.safeParse(raw);
      expect(result.success).toBe(true);
    });
  }
});
