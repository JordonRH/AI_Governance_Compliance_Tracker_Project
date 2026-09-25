import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/playwright',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5174', browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: {
    command: 'node server/index.js', url: 'http://127.0.0.1:5174/api/health', reuseExistingServer: false,
    env: { PORT: '5174', DATABASE_PATH: join(tmpdir(), `aitrace-e2e-${randomUUID()}.sqlite`), AITRACE_BOOTSTRAP_LOGIN: 'admin@example.test', AITRACE_BOOTSTRAP_PASSWORD: 'correct horse battery', AITRACE_BOOTSTRAP_ORGANIZATION_ID: 'fictional-sme', AITRACE_BOOTSTRAP_ORGANIZATION_NAME: 'Fictional SME', AITRACE_BOOTSTRAP_DISPLAY_NAME: 'Fictional Administrator' }
  }
});
