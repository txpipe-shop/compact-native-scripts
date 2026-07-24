import { getNetworkId } from '@midnight-ntwrk/midnight-js/network-id';
import {
  DustAddress,
  MidnightBech32m,
  ShieldedAddress,
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey,
  type FacadeState,
  type WalletFacade,
  Roles,
  createKeystore,
} from '@midnight-ntwrk/wallet-sdk';
import * as Rx from 'rxjs';
import { deriveKeysFromSeed, isWalletSynced } from './index.js';

export interface Balances {
  dust: bigint;
  shielded: Record<string, bigint>;
  unshielded: Record<string, bigint>;
}

export interface Addresses {
  dust: string;
  shielded: string;
  unshielded: string;
}

const DIVIDER = '──────────────────────────────────────────────────────────────';
const TNIGHT_TOKEN_ID = '0000000000000000000000000000000000000000000000000000000000000000';

function getShieldedAddress(state: FacadeState): string {
  const coinPubKey = ShieldedCoinPublicKey.fromHexString(
    state.shielded.coinPublicKey.toHexString()
  );
  const encPubKey = ShieldedEncryptionPublicKey.fromHexString(
    state.shielded.encryptionPublicKey.toHexString()
  );
  const address = new ShieldedAddress(coinPubKey, encPubKey);
  return MidnightBech32m.encode(getNetworkId(), address).toString();
}

function getUnshieldedAddress(seed: string): string {
  const keys = deriveKeysFromSeed(seed);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], getNetworkId());
  return unshieldedKeystore.getBech32Address().toString();
}

function getAddresses(seed: string, state: FacadeState): Addresses {
  return {
    dust: DustAddress.codec.encode(getNetworkId(), state.dust.address).asString(),
    shielded: getShieldedAddress(state),
    unshielded: getUnshieldedAddress(seed),
  };
}

export function getBalances(state: FacadeState): Balances {
  return {
    dust: state.dust.balance(new Date()),
    shielded: state.shielded.balances,
    unshielded: state.unshielded.balances,
  };
}

export async function getBalancesAndAddresses(
  wallet: WalletFacade,
  seed: string
): Promise<{ balances: Balances; addresses: Addresses }> {
  const state = await Rx.firstValueFrom(wallet.state().pipe(Rx.filter(isWalletSynced)));
  return {
    balances: getBalances(state),
    addresses: getAddresses(seed, state),
  };
}

function formatTokenBalance(tokenId: string, balance: bigint): string {
  const label = tokenId === TNIGHT_TOKEN_ID ? 'tNIGHT' : tokenId;
  return `  • ${label}: ${balance.toLocaleString()}`;
}

function formatSection(
  title: string,
  address: string | undefined,
  balanceLines: string[]
): string[] {
  const sep = '  ' + DIVIDER.slice(0, -2);
  const lines: string[] = ['', `  ${title}`, sep];
  if (address) {
    lines.push(`  Address:  ${address}`);
  }
  if (balanceLines.length > 0) {
    lines.push(address ? '  Balances:' : '  Balance:');
    lines.push(...balanceLines);
  }
  return lines;
}

export function printBalances(balances: Balances, addresses?: Addresses): void {
  const shieldedLines = Object.entries(balances.shielded).map(([token, balance]) =>
    formatTokenBalance(token, balance)
  );
  const unshieldedLines = Object.entries(balances.unshielded).map(([token, balance]) =>
    formatTokenBalance(token, balance)
  );

  const dustSection = [
    '',
    '  DUST',
    '  ' + DIVIDER.slice(0, -2),
    ...(addresses ? [`  Address:  ${addresses.dust}`] : []),
    '  Balance: ' + balances.dust.toLocaleString(),
  ];

  const shieldedSection = formatSection('SHIELDED', addresses?.shielded, shieldedLines);

  const unshieldedSection = formatSection('UNSHIELDED', addresses?.unshielded, unshieldedLines);

  const output = [...dustSection, ...shieldedSection, ...unshieldedSection, ''].join('\n');

  console.log(output);
}
