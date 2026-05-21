# Gold Portfolio

A self-hosted web app for tracking physical precious metals — gold, silver, platinum, and palladium. Runs as a Docker container on a NAS or any Linux host.

![Dark mode](https://img.shields.io/badge/theme-dark%20%2F%20light-222)
![Languages](https://img.shields.io/badge/languages-EN%20%2F%20TR%20%2F%20DE-blue)
![Currencies](https://img.shields.io/badge/currencies-11-green)
[![Backend image](https://ghcr.io/farukk57/gold-portfolio-backend)](https://github.com/Farukk57/gold-portfolio/pkgs/container/gold-portfolio-backend)
[![Frontend image](https://ghcr.io/farukk57/gold-portfolio-frontend)](https://github.com/Farukk57/gold-portfolio/pkgs/container/gold-portfolio-frontend)

## Features

- **Live prices** — fetched from Yahoo Finance every hour (GC=F, SI=F, PL=F, PA=F)
- **Price history charts** — up to 2 years of daily data, backfilled on first start
- **Portfolio value history** — tracks your total portfolio value over time vs. cost basis
- **Multi-currency** — USD, EUR, GBP, CHF, JPY, TRY, CAD, AED, AUD, CNY, SEK (rates via Frankfurter)
- **Multi-language** — English, Turkish, German
- **Light / dark mode**
- **Holdings table** — sortable by any column (value, P&L, weight, date, etc.)
- **Receipt storage** — attach purchase receipts (images / PDF, max 10 MB) to each holding
- **Add templates** — Turkish coins (Cumhuriyet, Reşat, Ata, Yarım, Çeyrek), German coins (Krügerrand, Wiener Philharmoniker, Maple Leaf), international bullion, silver and platinum
- **Custom templates** — save your own items for quick re-add
- **Quantity add** — add multiple identical pieces in one step
- **Full mobile support** — responsive layout for iPhone and Android, safe-area aware

## Stack

| Layer    | Tech |
|----------|------|
| Backend  | FastAPI, SQLAlchemy 2, APScheduler, aiohttp |
| Database | SQLite with WAL mode (single file, persisted via Docker volume) |
| Frontend | React 18, Recharts, Lucide React |
| Proxy    | Nginx (serves frontend + proxies `/api` to backend) |
| Runtime  | Docker Compose |
| Registry | GitHub Container Registry (GHCR) |

## Getting Started

### Requirements

- Docker + Docker Compose
- Port 3000 available on the host

### Option A — pull pre-built images from GHCR (recommended for NAS)

No build step needed. Images are built automatically on every push to `main` and on every release tag.

```bash
curl -O https://raw.githubusercontent.com/Farukk57/gold-portfolio/main/docker-compose.ghcr.yml
docker compose -f docker-compose.ghcr.yml up -d
```

Open `http://<your-host-ip>:3000` in a browser.

### Option B — build from source

```bash
git clone https://github.com/Farukk57/gold-portfolio.git
cd gold-portfolio
docker compose up -d --build
```

### Update

**GHCR (pull new images):**
```bash
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

**Build from source:**
```bash
git pull
docker compose up -d --build
```

### Data

The SQLite database is stored in `./data/portfolio.db` on the host (mounted as a Docker volume). It is excluded from git. Back it up by copying that file.

On first start the backend backfills 2 years of daily price history for all four metals — the charts populate within a few seconds.

## Project Structure

```
.
├── .github/
│   └── workflows/
│       └── docker-publish.yml   # Build + push to GHCR on push/tag
├── backend/
│   ├── main.py          # FastAPI app, endpoints, scheduler
│   ├── database.py      # SQLAlchemy models (Holding, PriceHistory, Receipt, Template)
│   ├── prices.py        # Yahoo Finance fetcher, troy oz conversion, carat purity
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main app, holdings table with sorting
│   │   ├── api.js               # Fetch helpers
│   │   ├── i18n.js              # EN / TR / DE translations
│   │   ├── templates.js         # Built-in coin/bar templates
│   │   ├── index.css            # CSS custom properties, responsive breakpoints
│   │   └── components/
│   │       ├── PriceChart.jsx       # Metal spot price chart with range selector
│   │       ├── PortfolioChart.jsx   # Portfolio value + cost basis chart
│   │       ├── HoldingModal.jsx     # Add / edit holding modal with receipt upload
│   │       └── ReceiptViewer.jsx    # Receipt gallery / download
│   ├── public/
│   ├── nginx.conf
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml        # Build from source
├── docker-compose.ghcr.yml   # Pull from GHCR
└── data/                     # Created at runtime, gitignored
    └── portfolio.db
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/holdings` | List all holdings with current values |
| POST | `/api/holdings` | Add a holding |
| PUT | `/api/holdings/{id}` | Update a holding |
| DELETE | `/api/holdings/{id}` | Delete a holding |
| GET | `/api/portfolio/summary` | Portfolio totals and per-metal allocation |
| GET | `/api/portfolio/history` | Daily portfolio value + cost basis history |
| GET | `/api/prices` | Latest spot prices for all metals |
| GET | `/api/prices/history/{metal}` | Price history (gold/silver/platinum/palladium) |
| POST | `/api/prices/refresh` | Trigger an immediate price refresh |
| GET | `/api/holdings/{id}/receipts` | List receipts for a holding |
| POST | `/api/holdings/{id}/receipts` | Upload a receipt (image or PDF, max 10 MB) |
| DELETE | `/api/receipts/{id}` | Delete a receipt |
| GET | `/api/templates` | List custom templates |
| POST | `/api/templates` | Save a custom template |
| DELETE | `/api/templates/{id}` | Delete a custom template |
| GET | `/api/exchange-rates` | Current USD exchange rates (via Frankfurter) |

## Notes

- Prices are in USD/troy oz internally; all display values are converted client-side using live exchange rates
- Troy oz conversion: 1 oz = 31.1035 g
- Carat purity: 24k = 1.0, 22k = 0.9167, 18k = 0.75, 14k = 0.5833, 9k = 0.375, 999 = 0.999, 925 = 0.925, 950 = 0.95, 500 = 0.5
- SQLite runs in WAL mode for better concurrent read/write performance
- Receipt files are stored under `./data/receipts/` on the host alongside the database
