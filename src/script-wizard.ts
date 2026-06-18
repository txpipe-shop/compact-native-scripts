import { select, input, number } from '@inquirer/prompts';
import { writeFileSync } from 'fs';

type ScriptNode = Record<string, unknown>;

const SCRIPT_TYPES = [
  {
    name: 'cmt',
    value: 'cmt',
    description: 'Commitment verification clause (signature-equivalent)',
  },
  {
    name: 'after',
    value: 'after',
    description: 'Transaction must be at or after the specified block',
  },
  {
    name: 'before',
    value: 'before',
    description: 'Transaction must be before the specified block',
  },
  {
    name: 'any',
    value: 'any',
    description: 'At least one sub-script must be satisfied',
  },
  {
    name: 'all',
    value: 'all',
    description: 'All sub-scripts must be satisfied',
  },
  {
    name: 'atLeast',
    value: 'atLeast',
    description: 'At least N of the sub-scripts must be satisfied',
  },
  {
    name: 'done',
    value: 'done',
    description: 'Finish building the script',
  },
] as const;

async function promptForScript(): Promise<ScriptNode | null> {
  const type = await select<'cmt' | 'after' | 'before' | 'any' | 'all' | 'atLeast' | 'done'>({
    message: 'Select script type:',
    choices: SCRIPT_TYPES,
  });

  switch (type) {
    case 'done':
      return null;
    case 'cmt': {
      const hash = await input({
        message: 'Enter commitment hash (64 hex characters):',
        validate: (v: string) =>
          /^[0-9a-f]{64}$/i.test(v) || 'Must be 64 hex characters',
      });
      return { type: 'cmt', hash: hash.toLowerCase() };
    }
    case 'after': {
      const block = await number({
        message: 'Enter block number:',
        required: true,
      });
      return { type: 'after', block };
    }
    case 'before': {
      const block = await number({
        message: 'Enter block number:',
        required: true,
      });
      return { type: 'before', block };
    }
    case 'any':
    case 'all': {
      const scripts = await collectScripts();
      return { type, scripts };
    }
    case 'atLeast': {
      const required = await number({
        message: 'Minimum number of scripts that must be satisfied:',
        required: true,
      });
      const scripts = await collectScripts();
      return { type: 'atLeast', required, scripts };
    }
  }
}

async function collectScripts(): Promise<ScriptNode[]> {
  const scripts: ScriptNode[] = [];
  while (true) {
    const node = await promptForScript();
    if (node === null) break;
    scripts.push(node);
  }
  return scripts;
}

export async function scriptWizard(): Promise<void> {
  console.log(
    'This wizard helps you interactively build a script JSON file. The output can be used as input to `pnpm generate-code -i <file>` to generate a Compact contract that checks commitments and/or time-lock conditions to authorize an operation.\n'
  );
  const schema = await promptForScript();
  const outputPath = await input({ message: 'Output file path:', default: 'script.json' });
  writeFileSync(outputPath, JSON.stringify(schema, null, 2) + '\n', 'utf-8');
  console.log(`Written to: ${outputPath}`);
}
