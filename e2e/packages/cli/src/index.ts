#!/usr/bin/env node
import { Command } from 'commander';
import { stdin as input, stdout as output } from 'node:process';
import { buildWalletAndWaitForFunds } from '@e2e/wallet';
import { StandaloneConfig } from './config.js';
import { seeds } from './utils/constants.js';
import { runCli } from './cli.js';
import { createInterface } from 'readline/promises';

const config = new StandaloneConfig();

const program = new Command()
  .name('compact-e2e')
  .description('Interactive CLI for token supply contract')
  .version('0.0.1');

program
  .argument('[id]', 'Wallet ID (1-4)', '1')
  .option('--max-supply <value>', 'Maximum token supply', '1000000000000')
  .action(async (id, options) => {
    const n = Number(id);
    if (!Number.isInteger(n) || n < 1 || n > 4) {
      console.error('Error: wallet id must be 1, 2, 3, or 4');
      process.exit(1);
    }
    const maxSupply = BigInt(options.maxSupply);
    console.info('Building wallet %d...', n);
    const ctx = await buildWalletAndWaitForFunds(config, seeds[n - 1].seed);
    const rli = createInterface({ input, output, terminal: true });
    await runCli(config, ctx, seeds[n - 1], n - 1, maxSupply, rli).finally(
      ctx.wallet.stop.bind(ctx.wallet)
    );
    rli.close();
  });

program.parseAsync().catch((err) => {
  console.error(err);
  process.exit(1);
});
