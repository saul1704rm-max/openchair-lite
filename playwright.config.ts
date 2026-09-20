import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "./tests/e2e", use: { baseURL: "http://127.0.0.1:3000" }, webServer: { command: "node ./node_modules/next/dist/bin/next dev", url: "http://127.0.0.1:3000", reuseExistingServer: true } });
