import {defineConfig} from '@playwright/test';

const testOrigin = 'http://127.0.0.1:41797';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  use: {baseURL: testOrigin, headless: true, trace: 'retain-on-failure'},
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 41797 --strictPort',
    url: testOrigin,
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: 'https://intuilearn-test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-only-public-key',
    },
  },
  reporter: 'list',
});
