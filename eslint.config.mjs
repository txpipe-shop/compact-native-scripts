// @ts-check
import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  // Global ignores must be in their own config object (no other keys)
  {
    ignores: [
      'node_modules/',
      '**/dist/**',
      '**/managed/**',
      '**/*.compact',
      '.turbo/',
      'pnpm-lock.yaml',
      // apps/ui has its own eslint config with type-aware rules
      'apps/ui/**',
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.mjs', '*.cjs', '*.js'],
          defaultProject: path.join(__dirname, 'tsconfig.base.json'),
        },
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.node,
      },
    },
  }
);