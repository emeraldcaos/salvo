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

## Install and use offline

The app uses the neutral **Notes** placeholder name and icon. On Android, open the site in a supported browser and choose **Install app** or **Add to Home screen**. On iOS, open it in Safari, tap **Share**, then **Add to Home Screen**. The first visit and installation require a connection; after the app shell has cached successfully, the current screen and its bundled assets work offline.

New versions are downloaded in the background and offered in the app. The current version stays active until **Update now** is chosen, so dismissing an update does not replace the version available offline.

## Script policy

Do not load JavaScript from third-party origins. Browser scripts must be served by this app and bundled from dependencies installed through npm. The Content Security Policy in `index.html` and `npm run check:scripts` enforce the rule for production and CI. External links are fine; external executable scripts are not.

## Deployment

Pull requests run all quality checks and build the static site. Pushes to `main` deploy `dist/` to GitHub Pages. In the repository settings, set Pages' build and deployment source to **GitHub Actions**. The Vite base path is derived from the repository name in CI.
