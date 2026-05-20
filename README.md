# Gold Portfolio

A self-hosted web app for tracking physical precious metals — gold, silver, platinum, and palladium. Runs as a Docker container on a NAS or any Linux host.

![Dark mode](https://img.shields.io/badge/theme-dark%20%2F%20light-222) ![Languages](https://img.shields.io/badge/languages-EN%20%2F%20TR%20%2F%20DE-blue) ![Currencies](https://img.shields.io/badge/currencies-11-green)

## Features

- **Live prices** — fetched from Yahoo Finance every hour (GC=F, SI=F, PL=F, PA=F)
- **Price history charts** — up to 2 years of daily data, backfilled on first start
- **Portfolio value history** — tracks your total portfolio value over time vs. cost basis
- **Multi-currency** — USD, EUR, GBP, CHF, JPY, TRY, CAD, AED, AUD, CNY, SEK (rates via Frankfurter)
- **Multi-language** — English, Turkish, German
- **Light / dark mode**
- **Holdings table** — sortable by any column (value, P&L, weight, date, etc.)
- **Add templates** — Turkish coins (Cumhuriyet, Reşat, Ata, Yarım, Çeyrek), German coins (Krügerrand, Wiener Philharmoniker, Maple Leaf), international bullion, silver and platinum
- **Custom templates** — save your own items for quick re-add
- **Quantity add** — add multiple identical pieces in one step
- **Full mobile support** — responsive layout for iPhone and Android, safe-area aware

## Stack

| Layer    | Tech |
|----------|------|
| Backend  | FastAPI, SQLAlchemy, APScheduler, aiohttp |
| Database | SQLite (single file, persisted via Docker volume) |
| Frontend | React 18, Recharts, Lucide React |
| Proxy    | Nginx (serves frontend + proxies `/api` to backend) |
| Runtime  | Docker Compose |

## Getting Started

### Requirements

- Docker + Docker Compose
- Port 3000 available on the host

### Run

```bash
git clone https://github.com/Farukk57/gold-portfolio.git
cd gold-portfolio
docker compose up -d --build
```

Open `http://<your-host-ip>:3000` in a browser.

On first start the backend backfills 2 years of daily price history for all four metals. This takes a few seconds — the charts populate immediately.

### Update

```bash
git pull
docker compose up -d --build
```

### Data

The SQLite database is stored in `./data/portfolio.db` on the host (mounted as a volume). It is excluded from git. Back it up by copying that file.

## Project Structure

```
.
├── backend/
│   ├── main.py          # FastAPI app, endpoints, scheduler
│   ├── database.py      # SQLAlchemy models (Holding, PriceHistory, Template)
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
│   │       └── HoldingModal.jsx     # Add / edit holding modal
│   ├── public/
│   ├── nginx.conf
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── data/                # Created at runtime, gitignored
    └── portfolio.db
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/holdings` | List all holdings with current values |
| POST | `/api/holdings` | Add a holding |
| PUT | `/api/holdings/{id}` | Update a holding |
| DELETE | `/api/holdings/{id}` | Delete a holding |
| GET | `/api/summary` | Portfolio totals and per-metal allocation |
| GET | `/api/prices/history/{metal}` | Price history (gold/silver/platinum/palladium) |
| POST | `/api/prices/refresh` | Trigger an immediate price refresh |
| GET | `/api/portfolio/history` | Daily portfolio value + cost basis history |
| GET | `/api/templates` | List custom templates |
| POST | `/api/templates` | Save a custom template |
| DELETE | `/api/templates/{id}` | Delete a custom template |
| GET | `/api/exchange-rates` | Current USD exchange rates (proxied from Frankfurter) |

## Notes

- Prices are in USD/troy oz internally; all display values are converted client-side using live exchange rates
- Troy oz conversion: 1 oz = 31.1035 g
- Carat purity: 24k = 1.0, 22k = 0.9167, 18k = 0.75, 14k = 0.5833, 9k = 0.375, 999 = 0.999, 925 = 0.925, 950 = 0.95, 500 = 0.5
