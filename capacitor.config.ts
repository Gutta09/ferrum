import type { CapacitorConfig } from "@capacitor/cli";

// Ferrum is a server-backed app (database, auth, AI on Vercel), so the native
// iOS shell loads the live deployment rather than bundling static files. Redeploys
// show up in the app automatically — no rebuild needed.
const config: CapacitorConfig = {
  appId: "com.bhargavgutta.ferrum",
  appName: "Ferrum",
  webDir: "www",
  server: {
    url: "https://workout-tracker-iota-weld.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
