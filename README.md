# Pokédex Collection Manager — Static

A personal Pokédex app for tracking your Pokémon collection, built as a fully static site deployable on GitHub Pages with no backend required.

**Live:** https://LydiaGarcia03.github.io/pokedex-collection-manager-static/

---

## Features

- Browse all 1242 Pokémon entries (including regional forms, Mega Evolutions, and Gigantamax forms)
- Mark Pokémon as collected — selections are saved locally in the browser
- Filter by name, Pokédex number, or generation (Gen I–IX)
- View detailed info per Pokémon: base stats, type effectiveness, abilities, learnsets, species data
- Browse TCG cards for each Pokémon with per-card collection tracking
- Track which games each Pokémon appears in
- Export your collection as text or import from a previous export
- All images served locally — no external CDN calls at runtime

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19 + TypeScript |
| Build | Vite 8 |
| Icons | Lucide React |
| Hosting | GitHub Pages (via GitHub Actions) |
| Data | Pre-compiled JSON + local images (~406 MB) |

---

## Project Setup (First Time)

> These steps are run once locally to generate and download all data before deploying.
> They require the sibling [`pokedex`](https://github.com/LydiaGarcia03/pokedex) project to exist at `../pokedex/`.

### 1. Install dependencies
```powershell
npm install
```

### 2. Compile Pokémon data
Reads source JSON files from the sibling project and produces `public/data/pokemon-compiled.json`.
```powershell
npm run compile-data
```

### 3. Collect TCG card metadata
Calls the TCGdex API (~900 requests, ~5 minutes) and produces `public/data/tcg-cards.json`.
```powershell
npm run collect-tcg
```

### 4. Download all images
Downloads ~1100 Pokémon sprites + ~18300 TCG card images (~400 MB total). Skips files already downloaded.
```powershell
npm run download-images
```
Estimated time: ~20 minutes.

### 5. Commit data and images
```powershell
git add public/data/pokemon-compiled.json
git add public/data/tcg-cards.json
git add public/data/type-chart.json
git add public/images/
git commit -m "Add compiled data and local images"
git push
```

GitHub Actions will build and deploy to GitHub Pages automatically on push to `main`.

---

## Development

```powershell
npm run dev
```

Opens at `http://localhost:5173`. No backend needed — all data is served from `public/`.

---

## How It Works

All Pokémon data, TCG card metadata, and images are pre-processed locally and committed to the repository. At runtime the browser fetches a single JSON file (`pokemon-compiled.json`, ~15 MB) and all images from the same GitHub Pages origin — no API calls, no server.

Collection state (selected Pokémon, cards, and games) is stored in `localStorage` and can be exported/imported as a text file.

---

## Relationship to `pokedex` (Spring Boot)

This project is a static port of the [`pokedex`](https://github.com/LydiaGarcia03/pokedex) Spring Boot project. The UI is functionally identical; the only difference is that data fetching, image serving, and TCG lookups — which the original handles via a Java backend — are replaced here by pre-compiled files and client-side logic.
