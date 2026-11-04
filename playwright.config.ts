import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  retries: 0,
  timeout: 120000,
  reporter: [['list']],
  use: {
    headless: true,
    viewport: { width: 1440, height: 1000 },
    // Não gera artefatos contendo senhas, sessões ou respostas do banco real.
    trace: 'off', screenshot: 'off', video: 'off',
  },
});
