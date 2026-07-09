# Running Ferrum on your iPhone (Capacitor + Xcode)

Ferrum's iOS app is a native shell that loads the live deployment
(`workout-tracker-iota-weld.vercel.app`), so the database, login, and AI all
keep working and every Vercel redeploy shows up in the app with no rebuild.

The Capacitor project is already configured (`capacitor.config.ts`). You just
need to install the Apple toolchain once, generate the iOS project, and run it.

## One-time setup on your Mac

1. **Install Xcode** — Mac App Store → search "Xcode" → Get (~7 GB). Open it once
   and accept the license, then run:
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   sudo xcodebuild -runFirstLaunch
   ```
2. **Install CocoaPods**:
   ```bash
   brew install cocoapods
   ```
   (If you don't have Homebrew: `sudo gem install cocoapods`.)

## Generate + open the iOS project

From the project folder (`~/workout-tracker`):

```bash
npm run ios:add     # creates the ios/ Xcode project (+ pod install)
npm run ios:open    # opens it in Xcode
```

## Run it on your iPhone (in Xcode)

1. Plug your iPhone into the Mac (trust the computer if prompted).
2. In Xcode's left sidebar, click the **App** project → the **App** target →
   **Signing & Capabilities** tab.
3. Check **"Automatically manage signing"** and set **Team** to your Apple ID
   (click "Add an Account…" and sign in with your normal Apple ID — free).
4. If the bundle id is taken, change it (e.g. `com.yourname.ferrum`) in the same tab.
5. At the top of Xcode, pick **your iPhone** as the run destination (next to the
   Play button), then press **▶ Run**.
6. First launch on the phone: **Settings → General → VPN & Device Management →**
   tap your developer profile → **Trust**. Re-open the app.

That's it — the Ferrum icon is on your home screen and opens the live app.

## Notes

- **Free Apple ID:** the app runs on your own device but **expires after 7 days** —
  just press ▶ Run again in Xcode to renew. A paid Apple Developer account
  ($99/yr) removes the expiry and enables TestFlight / the App Store.
- **Updating the app:** because it loads the live site, deploying to Vercel updates
  the app instantly. You only re-run from Xcode if you change native config.
- **App icon / splash:** to customize, add PNGs and run
  `npx @capacitor/assets generate --ios` (optional).
