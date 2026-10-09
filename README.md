# Salvo

React, TypeScript, and Vite starter with linting, formatting, component tests, and GitHub Pages deployment.

## Local development

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

## Quality checks

```sh
npm run lint
npm run format:check
npm run check:scripts
npm test
npm run build
```

`npm run format` applies Prettier. Vitest runs once with `npm test`, or in watch mode with `npm run test:watch`.

## Languages

Locale messages live in `src/i18n/locales/`. Each locale follows the shape in `src/i18n/types.ts`; add the same keys to a new locale file and register its language code in `src/i18n/index.ts`. Regional locale tags use their primary language, and unsupported languages fall back to English. See [`docs/i18n-style-guide.md`](docs/i18n-style-guide.md) before adding or changing UI copy.

## Design tokens and shared UI

Shared tokens and components live in `src/ui/`. The app uses an ink ground, mint primary, and amber caution palette with self-hosted Atkinson Hyperlegible (`src/assets/fonts/`, SIL OFL). Open the component gallery from the welcome screen or `#gallery`. Line icons are also available as an SVG sprite in `public/icons/line-icons.svg`.

## Install and use offline

The app uses the neutral **Notes** placeholder name and icon. On Android, open the site in a supported browser and choose **Install app** or **Add to Home screen**. On iOS, open it in Safari, tap **Share**, then **Add to Home Screen**. The first visit and installation require a connection; after the app shell has cached successfully, the current screen and its bundled assets work offline.

New versions are downloaded in the background and offered in the app. The current version stays active until **Update now** is chosen, so dismissing an update does not replace the version available offline.

## PIN key and encrypted toolkit storage

The PIN creates a non-exportable AES-256-GCM key using Web Crypto PBKDF2-SHA-256 with 600,000 iterations and a random salt. The PIN is not saved. Browser storage holds only the salt and an encrypted key-check value; the derived key stays in memory until the user locks it or closes/reloads the app. PIN and key processing make no network requests.

The credential format keeps two same-shaped verifier records in randomized order. Profile roles and IDs are inside the encrypted verifier, not plaintext fields. Every valid unlock attempt derives two keys and checks both verifiers before selecting a profile. This equalizes the crypto operation count, not wall-clock timing; browsers and Web Crypto do not guarantee constant-time execution. Existing version 1 single-PIN credentials are upgraded without changing the primary PIN.

The second PIN opens a separate empty profile. Manage the second PIN from either profile; the primary profile sets or replaces it, while the decoy profile can rotate its own PIN. Toolkit data must use `EncryptedToolkitStore` in `src/security/encryptedToolkitStore.ts`; it encrypts JSON values and logical record IDs with AES-GCM before writing to IndexedDB. Records are scoped by opaque random profile IDs, and `usePinKey()` from `src/security/PinKeyContext.ts` exposes only the active key and opaque ID. Do not store toolkit data in `localStorage` or write plaintext directly to IndexedDB.

Database version 3 migrates legacy `salvo-toolkit` version 1 plaintext `items` rows (`{ id, value }`) and version 2 encrypted `encrypted-items` rows into the primary profile. Migration runs only after a primary PIN unlock; a decoy profile starts empty. Encrypted writes and clearing legacy stores happen in one IndexedDB transaction, so a failed migration preserves the originals. A decoy PIN is not forensic deniability: profile counts, storage sizes, browser state, or device examination may reveal another profile. Browser storage deletion is logical, not a guaranteed physical wipe of device storage.

PINs must be 8 to 12 digits. After five incorrect attempts, the next attempt is delayed for 30 seconds; each further incorrect attempt doubles the delay, up to 15 minutes. A successful unlock clears the delay. The delay is stored in this browser and can be reset by clearing its site data, so it is not a strong defense against someone with access to browser storage. A numeric PIN can also be guessed offline if the stored key-check data is copied.

## Script policy

Do not load JavaScript from third-party origins. Browser scripts must be served by this app and bundled from dependencies installed through npm. The Content Security Policy in `index.html` and `npm run check:scripts` enforce the rule for production and CI. External links are fine; external executable scripts are not.

## Deployment

Pull requests run all quality checks and build the static site. Pushes to `main` deploy `dist/` to GitHub Pages. In the repository settings, set Pages' build and deployment source to **GitHub Actions**. The Vite base path is derived from the repository name in CI.
