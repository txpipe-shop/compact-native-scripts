#!/usr/bin/env node

import { program } from 'commander';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NativeScriptSchema } from './schema.js';
import { generateCompact } from './generator/index.js';
import { generateSecretPair, generateCommitment } from './pair.js';
import { scriptWizard } from './script-wizard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

program.description('CLI-based tool to generate Compact code, commitments and JSON inputs.');

program
  .command('generate-code')
  .description(
    'Generate Compact module that represents an authorization policy, from a JSON schema'
  )
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

    console.log(`✅ Authorization contract generated at ${outputPath}`);
    console.log(`   Import this module into your Compact program to enforce the policy.`);
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
      console.log(`✅ Secret pair and commitment written to ${options.output}`);
      console.log(`   Share this commitment with the script author: ${commitmentHex}`);
      console.log(`   ⚠️  Keep the secret and randomness private — they prove your identity.`);
      console.log(`   They'll include this commitment in the authorization policy.`);
    } else {
      console.log(`Secret (hex):      ${secretHex}`);
      console.log(`Randomness (hex):  ${randomnessHex}`);
      console.log(`Commitment (hex):  ${commitmentHex}`);
      console.log(`--- Share the "commitment" hex with the script author ---`);
      console.log(`⚠️  Keep the secret and randomness private — they prove your identity.`);
      console.log(`They'll include this commitment in the authorization policy.`);
    }
  });

program
  .command('script-wizard')
  .description('Interactively build a native script schema JSON file')
  .action(async () => {
    await scriptWizard();
  });

program.parse();
