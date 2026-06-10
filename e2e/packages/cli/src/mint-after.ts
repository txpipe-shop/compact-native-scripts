import { DeployArguments, TokenSupplyContract } from '@e2e/api';
import { configureProviders } from '@e2e/contract/providers';
import { buildWalletAndWaitForFunds } from '@e2e/wallet';

import { StandaloneConfig } from './config.js';
import { seeds } from './utils/constants.js';
import { showBalances, sleep } from './utils/index.js';
import { BlockHash } from '@midnight-ntwrk/wallet-sdk-indexer-client';
import { QueryRunner } from '@midnight-ntwrk/wallet-sdk-indexer-client/effect';

const config = new StandaloneConfig();

const SYNC_DELAY_MS = 10_000;

const MAX_SUPPLY = 1_000_000_000_000n;

const MINT_AMOUNT = 100_000_000n;

const main = async () => {
  // 1. Build four wallets
  console.info('Building wallets...');
  const [ctxA, ctxB] = await Promise.all([
    buildWalletAndWaitForFunds(config, seeds[0].seed),
    buildWalletAndWaitForFunds(config, seeds[1].seed),
  ]);

  // Initial balances
  console.info('Fetching initial balances...');
  await showBalances('Wallet A', ctxA, seeds[0].seed);
  await showBalances('Wallet B', ctxB, seeds[1].seed);

  // Deploy contract
  const providersA = await configureProviders(ctxA, config, 'token-supply-contract-a');

  const args: DeployArguments = {
    maxSupply: MAX_SUPPLY,
    tokenDomain: Buffer.alloc(32, 'token-supply-contract'),
    initNonce: crypto.getRandomValues(new Uint8Array(32)),
  };
  const contract = await TokenSupplyContract.deploy(providersA, args, seeds[0].pair);
  await sleep(SYNC_DELAY_MS);
  const contractAddress = contract.deployedContract?.deployTxData.public.contractAddress;
  console.info('Deployed at %s', contractAddress);
  console.info('');

  if (!contractAddress) throw 'Contract address not found after deployment';

  // WalletA commits
  console.info('Wallets start committing');
  await contract.commit();
  console.info('Wallet A committed');
  await sleep(SYNC_DELAY_MS);
  console.info('');

  // WalletB commits
  const providersB = await configureProviders(ctxB, config, 'token-supply-contract-b');
  const contractB = await TokenSupplyContract.join(providersB, contractAddress, seeds[1].pair);

  await contractB.commit();
  console.info('Wallet B committed');
  await sleep(SYNC_DELAY_MS);
  console.info('');

  let result = await QueryRunner.runPromise(
    BlockHash,
    { offset: null }, // null = latest block
    { url: config.indexer }
  );
  console.log(result);

  try {
    // Any wallet can mint after the warden conditions are met
    console.info('Minting...');
    await contractB.mint(MINT_AMOUNT, ctxB.shieldedSecretKeys.coinPublicKey);
    await sleep(SYNC_DELAY_MS);
    console.info('');
    await showBalances('Wallet B', ctxB, seeds[1].seed);

    await contract.getCurrentState();
  } catch (e) {
    console.log((e as Error).message);
  }

  while (result && result.block && result.block.height < 50) {
    result = await QueryRunner.runPromise(
      BlockHash,
      { offset: null }, // null = latest block
      { url: config.indexer }
    );
    console.log(result);
    await sleep(SYNC_DELAY_MS);
  }
  try {
    // Any wallet can mint after the warden conditions are met
    console.info('Minting...');
    await contractB.mint(MINT_AMOUNT, ctxB.shieldedSecretKeys.coinPublicKey);
    await sleep(SYNC_DELAY_MS);
    console.info('');
    await showBalances('Wallet B', ctxB, seeds[1].seed);

    await contract.getCurrentState();
  } catch (e) {
    console.log((e as Error).message);
  }
};

async function testMain() {
  const result = await QueryRunner.runPromise(
    BlockHash,
    { offset: null }, // null = latest block
    { url: config.indexer }
  );
  console.log(result);
}

await main()
  .catch((err) => {
    console.error('E2E script failed:', err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
