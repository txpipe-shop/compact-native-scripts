#!/usr/bin/env node
import { Command } from 'commander';
import { stdin as input, stdout as output } from 'node:process';
import { buildWalletAndWaitForFunds } from '@e2e/wallet';
import { StandaloneConfig, getWalletMnemonic, getWardenSecretPair } from './config.js';
import { seeds, SeedAndSecretPair } from './utils/constants.js';
import { runCli } from './cli.js';
import { createInterface } from 'readline/promises';
import { mnemonicToSeedSync } from '@scure/bip39';

const config = new StandaloneConfig();
const networkId = config.networkId;

const program = new Command()
  .name('compact-e2e')
  .description('Interactive CLI for token supply contract')
  .version('0.0.1');

program
  .argument('[id]', 'Wallet ID (1-4, undeployed only)')
  .option('--max-supply <value>', 'Maximum token supply', '1000000000000')
  .action(async (id, options) => {
    const isTestnet = networkId !== 'undeployed';
    let walletDetails: SeedAndSecretPair;

    if (id !== undefined) {
      if (isTestnet) {
        console.error('Error: wallet id argument is not supported on testnet');
        process.exit(1);
      }
      const n = Number(id);
      if (!Number.isInteger(n) || n < 1 || n > 4) {
        console.error('Error: wallet id must be 1, 2, 3, or 4');
        process.exit(1);
      }
      walletDetails = seeds[n - 1];
      console.info('Building wallet %d...', n);
    } else {
      const mnemonic = getWalletMnemonic();
      const pair = getWardenSecretPair();

      if (mnemonic && pair) {
        const seed = Buffer.from(mnemonicToSeedSync(mnemonic)).toString('hex');
        walletDetails = { seed, pair };
        console.info('Building wallet from .env configuration...');
      } else if (!isTestnet) {
        walletDetails = seeds[0];
        console.info('Building wallet 1 (no .env mnemonic found, using default)...');
      } else {
        console.error(
          'Error: WALLET_MNEMONIC, WARDEN_SECRET, and WARDEN_RANDOMNESS are required on testnet'
        );
        process.exit(1);
      }
    }

    const maxSupply = BigInt(options.maxSupply);
    const ctx = await buildWalletAndWaitForFunds(config, walletDetails.seed);
    const rli = createInterface({ input, output, terminal: true });
    await runCli(config, ctx, walletDetails, 0, maxSupply, rli).finally(
      ctx.wallet.stop.bind(ctx.wallet)
    );
    rli.close();
  });

program.parseAsync().catch((err) => {
  console.error(err);
  process.exit(1);
});
