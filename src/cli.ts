import { program } from 'commander';
import { readFileSync } from 'fs';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NativeScriptSchema } from './schema.js';
import { generateCompact } from './generator/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
program.description('CLI-based tool to generate Compact code.');
program.requiredOption('-i, --input <path>', 'Path to input JSON file').parse();

const options = program.opts();

function main() {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(options.input, 'utf-8'));
  } catch (e) {
    console.error(`Failed to read/parse ${options.input}:`, e);
    process.exit(1);
  }

  const result = NativeScriptSchema.safeParse(raw);
  if (!result.success) {
    console.error('Validation failed:', result.error.format());
    process.exit(1);
  }

  const compactCode = generateCompact(result.data);
  const outputDir = path.resolve(__dirname, '../generated');
  mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'Warden.compact');
  writeFileSync(outputPath, compactCode, 'utf-8');

  console.log(`✅ Valid script. Output written to: ${outputPath}`);
}

main();
