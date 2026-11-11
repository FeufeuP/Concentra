import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Variáveis prefixadas com "_" são intencionalmente ignoradas (ex.: remover `password` via desestruturação)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Scripts Node do empacotamento desktop são CommonJS por design (runtime
    // do app empacotado e build local), não módulos ES do Next.js.
    files: ['scripts/desktop/**/*.js', 'scripts/desktop/**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'node_modules/**',
    'next-env.d.ts',
    'supabase/functions/**',
    '.desktop-build/**',
    'dist/**',
    'scripts/desktop/.staging/**',
    'scripts/desktop/.cache/**',
    'scripts/desktop/embedded-assets.cjs',
  ]),
]);
