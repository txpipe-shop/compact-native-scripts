import { getBalancesAndAddresses, printBalances, WalletContext } from '@e2e/wallet';
import { StandaloneConfig } from './config.js';
import { Interface } from 'readline/promises';
import { CONTRACT_MENU_PROMPT, MAIN_MENU_PROMPT, SeedAndSecretPair } from './utils/constants.js';
import { DeployArguments, TokenSupplyContract } from '@e2e/api';
import { configureProviders, type TokenSupplyContractProviders } from '@e2e/contract/providers';

export async function runCli(
  config: StandaloneConfig,
  ctx: WalletContext,
  details: SeedAndSecretPair,
  index: number,
  maxSupply: bigint,
  rli: Interface
): Promise<void> {
  let contract: TokenSupplyContract | null = null;

  let providers: TokenSupplyContractProviders;
  try {
    providers = await configureProviders(ctx, config, 'token-supply-' + `[${index}]`);
  } catch (e) {
    console.error('Failed to configure providers:', (e as Error).message);
    process.exit(1);
  }

  while (true) {
    const choice = await rli.question(MAIN_MENU_PROMPT);

    switch (choice) {
      case '1': {
        const args: DeployArguments = {
          maxSupply,
          tokenDomain: Buffer.alloc(32, 'token-supply-contract'),
          initNonce: crypto.getRandomValues(new Uint8Array(32)),
        };
        try {
          contract = await TokenSupplyContract.deploy(providers, args, details.pair);
          console.log(
            `[Contract Address]: ${contract.deployedContract?.deployTxData.public.contractAddress}`
          );
        } catch (e) {
          console.log('Error deploying: ', (e as Error).message);
        }
        break;
      }
      case '2':
        try {
          const contractAddress = await rli.question('Enter the contract address: ');
          contract = await TokenSupplyContract.join(providers, contractAddress, details.pair);
        } catch (error: unknown) {
          console.error('Error joining contract:');
          if (error instanceof Error) {
            console.error(error.message);
          }
          console.error(error);
          contract = null;
        }
        break;
      case '3': {
        try {
          const { balances, addresses } = await getBalancesAndAddresses(ctx.wallet, details.seed);
          printBalances(balances, addresses);
        } catch (e) {
          console.log('Error fetching balances: ', (e as Error).message);
        }
        break;
      }
      case '4':
        console.log('Exiting...');
        return;
      default:
        console.error('Invalid choice');
        continue;
    }

    if (contract) await handleCircuits(contract, details, ctx, rli);
  }
}

async function handleCircuits(
  contract: TokenSupplyContract,
  details: SeedAndSecretPair,
  ctx: WalletContext,
  rli: Interface
) {
  while (true) {
    const choice = await rli.question(CONTRACT_MENU_PROMPT);
    switch (choice) {
      case '1':
        try {
          await contract.commit();
        } catch (e) {
          console.log('Error committing: ', (e as Error).message);
        }
        break;
      case '2':
        try {
          const key = ctx.shieldedSecretKeys.coinPublicKey;
          const amount = await rli.question('Enter the amount to mint: ');
          await contract.mint(BigInt(amount), key);
        } catch (e) {
          console.log('Error minting: ', (e as Error).message);
        }
        break;
      case '3':
        try {
          const type = await rli.question('Enter the type of token to burn: ');
          const amount = await rli.question('Enter the amount to mint: ');
          await contract.burn(type, BigInt(amount));
        } catch (e) {
          console.log('Error burning: ', (e as Error).message);
        }
        break;
      case '4':
        try {
          await contract.getCurrentState();
        } catch (e) {
          console.log('Error fetching state: ', (e as Error).message);
        }
        break;
      case '5': {
        try {
          const { balances, addresses } = await getBalancesAndAddresses(ctx.wallet, details.seed);
          printBalances(balances, addresses);
        } catch (e) {
          console.log('Error fetching balances: ', (e as Error).message);
        }
        break;
      }
      case '6':
        console.log('Returning to main menu...');
        return;
      default:
        console.error('Invalid choice');
        continue;
    }
  }
}
