# Gold Portfolio — Homepage Widget

A [gethomepage.dev](https://gethomepage.dev) widget that shows your portfolio value, P&L, live gold spot price, and number of holdings.

## What it shows

| Field | Example |
|-------|---------|
| Portfolio Value | $21,576 |
| P&L | −$1,389 |
| Gold / oz | $4,539 |
| Holdings | 5 |

## Setup

### 1. Rebuild / update Gold Portfolio

The widget uses the dedicated `/api/homepage` endpoint added in v1.1.0.

If you are running from GHCR images, pull the latest:
```bash
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

If you are building from source:
```bash
git pull
docker compose up -d --build
```

Verify the endpoint works:
```bash
curl http://192.168.178.118:3000/api/homepage
# {"value":21576.46,"gain_loss":-1389.65,"gain_loss_pct":-6.05,"gold_oz":4539.0,"holdings":5}
```

### 2. Add to Homepage services.yaml

Copy the block from [`services.yaml`](./services.yaml) into your Homepage `services.yaml` under whichever group you want:

```yaml
- My Services:
    - Gold Portfolio:
        icon: mdi-gold
        href: http://192.168.178.118:3000/
        description: Precious metals tracker
        widget:
          type: customapi
          url: http://192.168.178.118:3000/api/homepage
          refreshInterval: 300000
          mappings:
            - field: value
              label: Portfolio Value
              format: currency
              locale: en
              currency: USD
            - field: gain_loss
              label: P&L
              format: currency
              locale: en
              currency: USD
            - field: gold_oz
              label: Gold / oz
              format: currency
              locale: en
              currency: USD
            - field: holdings
              label: Holdings
              format: number
```

### 3. Adjust the URL

If Homepage runs in Docker on the same host, you can use the host IP (`192.168.178.118`) or the Docker network name if Gold Portfolio and Homepage share a Docker network.

If they are on the same Docker Compose network you could use `http://frontend/api/homepage` instead of the host IP.

## API response

`GET /api/homepage` returns:

```json
{
  "value": 21576.46,
  "gain_loss": -1389.65,
  "gain_loss_pct": -6.05,
  "gold_oz": 4539.00,
  "holdings": 5
}
```

All monetary values are in USD. The widget converts display currency client-side in Gold Portfolio itself; Homepage always receives raw USD.
