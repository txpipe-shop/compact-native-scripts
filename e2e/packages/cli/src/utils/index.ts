import { getBalancesAndAddresses, printBalances, WalletContext } from '@e2e/wallet';

export const TTL = () => new Date(Date.now() + 30 * 60 * 1_000);

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function showBalances(label: string, ctx: WalletContext, seed: string): Promise<void> {
  console.info('--- %s ---', label);
  const { balances, addresses } = await getBalancesAndAddresses(ctx.wallet, seed);
  printBalances(balances, addresses);
}
