import { DeployArguments, TokenSupplyContract } from '@e2e/api';
import { configureProviders } from '@e2e/contract/providers';
import {
  buildWalletAndWaitForFunds,
  getBalancesAndAddresses,
  printBalances,
  type WalletContext,
} from '@e2e/wallet';

import Rx from 'rxjs';

import { StandaloneConfig } from './config.js';
import { seeds } from './utils/constants.js';
import { showBalances, sleep } from './utils/index.js';

/**
 * 1. Initialize wallets
 * . A wallet deploys the contract and commits
 * . The other wallets join and commit
 * . One wallet might attempt to mint before all the commitments are ready
 * . One wallet mints successfully after all commitments are present
 *
 *
 * Maybe do another round to show that any wallet can mint as long as the commits are present?
 * For different kinds of Wardens, maybe show that switching up the Wardens cause the beahviour to change
 * If it's all to any, 4. failed for all and it should succeed for any.
 */

const config = new StandaloneConfig();

const main = async () => {
  // 1. Build four wallets
  console.log('\n=== Building wallets ===');
  const [ctxA, ctxB, ctxC, ctxD] = await Promise.all([
    buildWalletAndWaitForFunds(config, seeds[0].seed),
    buildWalletAndWaitForFunds(config, seeds[1].seed),
    buildWalletAndWaitForFunds(config, seeds[2].seed),
    buildWalletAndWaitForFunds(config, seeds[3].seed),
  ]);

  // 2. Initial balances
  console.log('\n=== Initial balances ===');
  await showBalances('Wallet A', ctxA, seeds[0].seed);
  await showBalances('Wallet B', ctxB, seeds[1].seed);
  await showBalances('Wallet C', ctxC, seeds[2].seed);
  await showBalances('Wallet D', ctxC, seeds[3].seed);

  // 3. Deploy contract
  const providers = await configureProviders(ctxA, config, 'token-supply-contract');

  console.log('  Deploying token supply contract...');
  const args: DeployArguments = {
    maxSupply: 1000000000n,
    tokenDomain: Buffer.alloc(32, 'token-supply-contract'),
    initNonce: crypto.getRandomValues(new Uint8Array(32)),
  };
  const contract = await TokenSupplyContract.deploy(providers, args, seeds[0].pair);
  console.log('  ✓ Contract deployed');
  await sleep(10_000);

  // 4.
};

await main();
