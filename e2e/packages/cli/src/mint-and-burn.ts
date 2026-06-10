import { DeployArguments, TokenSupplyContract } from '@e2e/api';
import { configureProviders } from '@e2e/contract/providers';
import { buildWalletAndWaitForFunds } from '@e2e/wallet';

import { StandaloneConfig } from './config.js';
import { seeds } from './utils/constants.js';
import { showBalances, sleep } from './utils/index.js';

import { firstValueFrom } from 'rxjs';

const config = new StandaloneConfig();

const SYNC_DELAY_MS = 5_000;

const MAX_SUPPLY = 1_000_000_000_000n;

const MINT_AMOUNT = 1_000_000_000n;
const BURN_AMOUNT = 500_000_000n;

const main = async () => {
  // 1. Build four wallets
  console.info('Building wallets...');
  const [ctxA, ctxB, ctxC, ctxD] = await Promise.all([
    buildWalletAndWaitForFunds(config, seeds[0].seed),
    buildWalletAndWaitForFunds(config, seeds[1].seed),
    buildWalletAndWaitForFunds(config, seeds[2].seed),
    buildWalletAndWaitForFunds(config, seeds[3].seed),
  ]);

  // Initial balances
  console.info('Fetching initial balances...');
  await showBalances('Wallet A', ctxA, seeds[0].seed);
  await showBalances('Wallet B', ctxB, seeds[1].seed);
  await showBalances('Wallet C', ctxC, seeds[2].seed);
  await showBalances('Wallet D', ctxD, seeds[3].seed);

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

  // WalletC commits
  const providersC = await configureProviders(ctxC, config, 'token-supply-contract-c');
  const contractC = await TokenSupplyContract.join(providersC, contractAddress, seeds[2].pair);

  await contractC.commit();
  console.info('Wallet C committed');
  await sleep(SYNC_DELAY_MS);
  console.info('');

  // WalletD commits
  const providersD = await configureProviders(ctxD, config, 'token-supply-contract-d');
  const contractD = await TokenSupplyContract.join(providersD, contractAddress, seeds[3].pair);

  await contractD.commit();
  console.info('Wallet D committed');
  await sleep(SYNC_DELAY_MS);
  console.info('');

  // Any wallet can mint after the warden conditions are met
  console.info('Minting...');
  await contractD.mint(MINT_AMOUNT, ctxD.shieldedSecretKeys.coinPublicKey);
  await sleep(SYNC_DELAY_MS);
  console.info('');
  await showBalances('Wallet D', ctxD, seeds[3].seed);
  await contractD.getCurrentState();

  // Commits to burn
  console.info('');
  await contractB.commit();
  console.info('Wallet B committed');
  await sleep(SYNC_DELAY_MS);
  await contractD.commit();
  console.info('Wallet D committed');
  await sleep(SYNC_DELAY_MS);
  await contractC.commit();
  console.info('Wallet C committed');
  await sleep(SYNC_DELAY_MS);
  await contract.commit();
  console.info('Wallet A committed');
  await sleep(SYNC_DELAY_MS);

  // Filter known coins to find the one that was freshly minted
  const burnCoin = (await firstValueFrom(ctxD.wallet.shielded.state)).availableCoins.find((coin) => !['0000000000000000000000000000000000000000000000000000000000000000', '0000000000000000000000000000000000000000000000000000000000000001', '0000000000000000000000000000000000000000000000000000000000000002'].find((v) => coin.coin.type == v));
  if (!burnCoin) return;
  console.info('Burning...');
  await contractD.burn(burnCoin?.coin.type, BURN_AMOUNT);
  await sleep(SYNC_DELAY_MS);
  await contract.getCurrentState();
};

await main()
  .catch((err) => {
    console.error('E2E script failed:', err);
    process.exit(1);
  })
  .finally(() => process.exit(0));