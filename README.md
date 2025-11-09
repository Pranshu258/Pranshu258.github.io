## Pranshu258 Portfolio (Vite)

This project runs on [Vite](https://vitejs.dev/) with React and ships static assets to GitHub Pages. The production bundle lives in `build/`, as configured in `vite.config.js`.

## Requirements

- Node.js 18+ (recommended)
- npm 9+

## Getting Started

Install dependencies once:

```bash
npm install
```

Start the development server on [http://localhost:5173](http://localhost:5173):

```bash
npm run dev
# or: npm start
```

## Build & Preview

- `npm run build` – creates an optimized production build in the `build/` directory.
- `npm run preview` – serves the build locally to verify the production output.

## Deployment

Deployments to GitHub Pages run through Vite’s build output:

```bash
npm run deploy
```

This command rebuilds the site and publishes the `build/` directory to the `master` branch via `gh-pages`.
