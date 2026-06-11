import { SecretPair } from '@e2e/api';
import { mnemonicToEntropy } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

const GENESIS_MINT_WALLET_SEED_ONE =
  '0000000000000000000000000000000000000000000000000000000000000001';
const GENESIS_MINT_WALLET_SEED_TWO =
  '0000000000000000000000000000000000000000000000000000000000000002';
const GENESIS_MINT_WALLET_SEED_THREE =
  '0000000000000000000000000000000000000000000000000000000000000003';
const GENESIS_MINT_WALLET_SEED_FOUR =
  'a51c86de32d0791f7cffc3bdff1abd9bb54987f0ed5effc30c936dddbb9afd9d530c8db445e4f2d3ea42a321b260e022aadf05987c9a67ec7b6b6ca1d0593ec9';

const WALLET_FIVE_SEED_PHRASE =
  'kite cereal sunset anger unlock feed chat knee private note pen cup possible nest dad salad figure father volume fortune scale tell supply cargo';
export const GENESIS_MINT_WALLET_SEED_FIVE = Buffer.from(
  mnemonicToEntropy(WALLET_FIVE_SEED_PHRASE, wordlist)
).toString('hex');

export type SeedAndSecretPair = {
  seed: string;
  pair: SecretPair;
};

export const seeds: SeedAndSecretPair[] = [
  {
    seed: GENESIS_MINT_WALLET_SEED_ONE,
    pair: {
      secret: 'ed192a825b79d3602cd82cdf0c15ad7accfdc06f32bc0062f89a6c09edaf964b',
      randomness: '1a0a174c772ee1556bf1b980475eaffe2b4bb8112e82f5348e612b93804405da',
    },
  },
  {
    seed: GENESIS_MINT_WALLET_SEED_TWO,
    pair: {
      secret: 'c7703a18dfeda0af9f0682ef6e60bf521793abc4bc222a5b2ce07c1689711368',
      randomness: 'f6100395d430cfde21264df287213894cc453d624f41d7c5e2961d5945be4aa0',
    },
  },
  {
    seed: GENESIS_MINT_WALLET_SEED_THREE,
    pair: {
      secret: '530ee83ae300c6b3b594fceedab4f959ab932f60283905b7b89cedac46592454',
      randomness: '1d448e83ea309d95bd0815e6d0cbb0a6ef2246724ff6880cc9bb1239e34a62be',
    },
  },
  {
    seed: GENESIS_MINT_WALLET_SEED_FOUR,
    pair: {
      secret: '5ce9e1897761894c51485ff5f7b9d2dda95584b7a45950c120041465508bacce',
      randomness: '4c7238a7da9094db5b82dd15a350da4b07e01fb23fc804458df7c2c720dac81e',
    },
  },
  {
    seed: GENESIS_MINT_WALLET_SEED_FIVE,
    pair: {
      secret: '06f5ca83643e9acadbeea9ba1f8a8a64d692f248d110d3df345a7e48888b7d93',
      randomness: '3b1bb2ca83dbfd86b0e183a1c535a8ca850536ce20ee8694b63b78dda2e83a04',
    },
  },
];

export const MAIN_MENU_PROMPT = `
  === Main Menu ===
  1. Deploy contract
  2. Join existing contract
  3. Show balances
  4. Exit
  Enter choice: `;

export const CONTRACT_MENU_PROMPT = `
  === Contract Actions ===
  1. Commit
  2. Mint
  3. Burn
  4. Get current state
  5. Show balances
  6. Return to main menu
  Enter choice: `;
