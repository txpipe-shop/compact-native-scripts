import { DeployArguments, TokenSupplyContract } from '@e2e/api';
import { configureProviders } from '@e2e/contract/providers';
import { buildWalletAndWaitForFunds } from '@e2e/wallet';

import { StandaloneConfig } from './config.js';
import { seeds } from './utils/constants.js';
import { showBalances, sleep } from './utils/index.js';

const config = new StandaloneConfig();

const SYNC_DELAY_MS = 5_000;

const MAX_SUPPLY = 1_000_000_000_000n;

const MINT_AMOUNT = 100_000_000n;

const main = async () => {
  // 1. Build four wallets
  console.info('Building wallets...');
  const [ctxA, ctxB, ctxC, ctxD, ctxE] = await Promise.all([
    buildWalletAndWaitForFunds(config, seeds[0].seed),
    buildWalletAndWaitForFunds(config, seeds[1].seed),
    buildWalletAndWaitForFunds(config, seeds[2].seed),
    buildWalletAndWaitForFunds(config, seeds[3].seed),
    buildWalletAndWaitForFunds(config, seeds[4].seed, false),
  ]);

  // Initial balances
  console.info('Fetching initial balances...');
  await showBalances('Wallet A', ctxA, seeds[0].seed);
  await showBalances('Wallet B', ctxB, seeds[1].seed);
  await showBalances('Wallet C', ctxC, seeds[2].seed);
  await showBalances('Wallet D', ctxD, seeds[3].seed);

  // Set up providers for wallet A (reused for failing tests and real deploy)
  const providersA = await configureProviders(ctxA, config, 'token-supply-contract-a');

  // Demonstrate deploy validation: maxSupply must be > 0
  try {
    const invalidArgs: DeployArguments = {
      maxSupply: 0n,
      tokenDomain: Buffer.alloc(32, 'token-supply-contract'),
      initNonce: crypto.getRandomValues(new Uint8Array(32)),
    };
    await TokenSupplyContract.deploy(providersA, invalidArgs, seeds[0].pair);
  } catch (e) {
    console.warn('Deploy with invalid maxSupply rejected (expected): %s', (e as Error).message);
  }
  console.info('');

  // Demonstrate join validation: contractAddress must not be empty
  try {
    await TokenSupplyContract.join(providersA, '', seeds[0].pair);
  } catch (e) {
    console.warn('Join with empty address rejected (expected): %s', (e as Error).message);
  }
  console.info('');

  // Deploy contract

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

  // Unrecognized wallet tries to commit
  try {
    const providersE = await configureProviders(ctxE, config, 'token-supply-contract-e');
    const contractE = await TokenSupplyContract.join(providersE, contractAddress, seeds[4].pair);
    await contractE.commit();
  } catch (e) {
    console.warn('Wallet E commit rejected (expected): %s', (e as Error).message);
  }
  console.info('');

  // WalletB commits
  const providersB = await configureProviders(ctxB, config, 'token-supply-contract-b');
  const contractB = await TokenSupplyContract.join(providersB, contractAddress, seeds[1].pair);

  await contractB.commit();
  console.info('Wallet B committed');
  await sleep(SYNC_DELAY_MS);
  console.info('');

  // WalletC commits
  const providersC = await configureProviders(ctxC, config, 'token-supply-contract-c');
  const contractC = await TokenSupplyContract.join(providersC, contractAddress, seeds[2].pair);

  await contractC.commit();
  console.info('Wallet C committed');
  await sleep(SYNC_DELAY_MS);
  console.info('');

  // WalletB tries to mint before all commitments are ready
  try {
    await contractB.mint(MINT_AMOUNT, ctxB.shieldedSecretKeys.coinPublicKey);
  } catch (e) {
    console.warn('Wallet B mint failed (expected): %s', (e as Error).message);
  }
  console.info('');

  // WalletA tries to commit again
  try {
    await contract.commit();
  } catch (e) {
    console.warn('Wallet A re-commit rejected (expected): %s', (e as Error).message);
  }
  console.info('');

  // WalletD commits
  const providersD = await configureProviders(ctxD, config, 'token-supply-contract-d');
  const contractD = await TokenSupplyContract.join(providersD, contractAddress, seeds[3].pair);

  await contractD.commit();
  console.info('Wallet D committed');
  await sleep(SYNC_DELAY_MS);
  console.info('');

  // Unrecognized wallet tries to mint
  try {
    const providersE = await configureProviders(ctxE, config, 'token-supply-contract-e');
    const contractE = await TokenSupplyContract.join(providersE, contractAddress, seeds[4].pair);
    await contractE.mint(MINT_AMOUNT, ctxE.shieldedSecretKeys.coinPublicKey);
  } catch (e) {
    console.warn('Wallet E mint rejected (expected): %s', (e as Error).message);
  }
  console.info('');

  // Any wallet can mint after the warden conditions are met
  console.info('Minting...');
  await contractB.mint(MINT_AMOUNT, ctxB.shieldedSecretKeys.coinPublicKey);
  await sleep(SYNC_DELAY_MS);
  console.info('');
  await showBalances('Wallet B', ctxB, seeds[1].seed);

  await contractD.getCurrentState();
};

await main()
  .catch((err) => {
    console.error('E2E script failed:', err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
