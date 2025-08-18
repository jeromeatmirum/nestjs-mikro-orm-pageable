import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { globalIgnores } from 'eslint/config';
import prettier from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

export default tseslint.config({
  // globalIgnores(['e2e/**/*.ts', '**/*.spec.ts']),
  extends: [eslint.configs.recommended, tseslint.configs.recommended],
  files: ['src/**/*.ts'],
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname
    }
  },
  plugins: {
    'simple-import-sort': simpleImportSort,
    prettier: prettier
  },
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_'
      }
    ],
    curly: 'error',
    'no-extra-boolean-cast': 'error',
    // The codebase uses this, so this rule needs to be enabled until those are decided on
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unsafe-function-type': 'error',
    '@typescript-eslint/no-empty-function': 'off'
  }
});
