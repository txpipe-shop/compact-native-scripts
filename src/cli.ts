import { program } from 'commander';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NativeScriptSchema } from './schema.js';
import { generateCompact } from './generator/index.js';
import { generateSecretPair, generateCommitment } from './pair.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

program.description('CLI-based tool to generate Compact code and commitments.');

program
  .command('generate-code')
  .description('Generate Compact code from a JSON schema')
  .requiredOption('-i, --input <path>', 'Path to input JSON file')
  .option(
    '-o, --output <path>',
    'Directory to write the generated Compact code (default: <project>/generated)'
  )
  .option('-t, --test', 'Include exports for unit testing')
  .action((options) => {
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

    const compactCode = generateCompact(result.data, undefined, options.test);
    const outputDir = options.output || path.resolve(__dirname, '../generated');
    mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, 'Warden.compact');
    writeFileSync(outputPath, compactCode, 'utf-8');

    console.log(`✅ Valid script. Output written to: ${outputPath}`);
  });

program
  .command('make-commitment')
  .description('Generate a secret pair and its commitment')
  .option('-s, --seed <hex>', '64-character hex seed for the secret (optional)')
  .option('-o, --output <path>', 'Path to write the result as JSON (optional)')
  .action((options) => {
    const pair = generateSecretPair(options.seed);
    const commitment = generateCommitment(pair);

    const toHex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');

    const secretHex = toHex(pair.secret);
    const randomnessHex = toHex(pair.randomness);
    const commitmentHex = toHex(commitment);

    if (options.output) {
      writeFileSync(
        options.output,
        JSON.stringify(
          {
            secret: secretHex,
            randomness: randomnessHex,
            commitment: commitmentHex,
          },
          null,
          2
        ),
        'utf-8'
      );
      console.log(`Written to: ${options.output}`);
    } else {
      console.log(`Secret (hex):      ${secretHex}`);
      console.log(`Randomness (hex):  ${randomnessHex}`);
      console.log(`Commitment (hex):  ${commitmentHex}`);
    }
  });

program.parse();
