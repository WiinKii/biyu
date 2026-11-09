import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * Money rules (AGENTS.md §3): amounts are BigInt in the domain and strings in transport.
 * `parseFloat` / `Number.parseFloat` are banned outright; `Number(...)` conversions in the
 * domain package are banned so a floating value can never become money by accident.
 */
const moneySafety = {
  'no-restricted-globals': [
    'error',
    { name: 'parseFloat', message: 'Dinero: usar BigInt/amount_minor, nunca parseFloat.' },
  ],
  'no-restricted-properties': [
    'error',
    { object: 'Number', property: 'parseFloat', message: 'Dinero: nunca parseFloat.' },
  ],
};

export default defineConfigWithVueTs(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/.wrangler/**',
      '**/node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'apps/api/worker-configuration.d.ts',
    ],
  },
  js.configs.recommended,
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...moneySafety,
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'vue/multi-word-component-names': 'off',
      // Ionic web components use native named slots (slot="start").
      'vue/no-deprecated-slot-attribute': ['error', { ignore: ['/^ion-/'] }],
    },
  },
  prettier,
  {
    files: ['packages/domain/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='Number']",
          message: 'Dominio: convertir a Number solo en adaptadores, tras validar rango.',
        },
      ],
    },
  },
  {
    files: ['**/*.config.{js,ts}', 'eslint.config.js'],
    extends: [vueTsConfigs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
);
