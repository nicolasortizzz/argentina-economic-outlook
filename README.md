# Argentina Economic Outlook

Interactive, English-language research dashboard evaluating Argentina's macroeconomic viability and President Javier Milei's economic program (from December 2023). Built by **Nicolas Ortiz** — Economist | Financial & Data Analyst.

**Live site:** [https://nicolasortizzz.github.io/argentina-economic-outlook/](https://nicolasortizzz.github.io/argentina-economic-outlook/)

## Features

- Twelve thematic tabs: overview, history, program pillars (balanced pro/con), results (Dec 2023 marker), sustainability (debt dynamics & REER proxy), sectoral, social, political risks, international comparisons, Monte Carlo scenarios, viability scorecard, conclusion.
- Dark/light theme, KPI cards, Plotly charts, responsive layout (Inter font, Plotly 2.35.2).
- **Real data only** from public APIs; failures logged in `data/sources.json`.

## Refresh data

```bash
python3 scripts/fetch_data.py
```

Requires `requests` (`pip install --user requests`). BCRA calls use `verify=False` due to certificate issues on some hosts.

## Local preview

```bash
python3 -m http.server 8765
```

Open `http://localhost:8765/`.

## Methodology

| Source | Series (examples) |
|--------|-------------------|
| [BCRA estadísticas v4](https://api.bcra.gob.ar/estadisticas/v4.0/monetarias) | Reserves, monetary base, FX official, CPI, policy rate |
| [datos.gob.ar / INDEC](https://apis.datos.gob.ar/series/api/) | National CPI, EMAE, fiscal balances, unemployment, exports |
| [World Bank API](https://data.worldbank.org/) | Inflation history, GDP growth, debt, Gini, cross-country comparisons |
| [IMF DataMapper](https://www.imf.org/external/datamapper/) | WEO GDP, inflation, debt, current account |
| [Bluelytics](https://api.bluelytics.com.ar/v2/evolution.json) | Parallel (blue) USD/ARS |
| [argentinadatos](https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais) | Country risk (EMBI+) |
| `data/facts.json` | Documented policy milestones (each with `source_url`, `documented: true`) |

Hand-entered facts and scenario weights are labeled **Estimate** or **Author's view** in the UI.

## Caveats

- API coverage changes; some series IDs return empty (see `data/sources.json`).
- BCRA v3 is deprecated; the fetcher uses v4 with pagination (limit 1000).
- REER chart is a **proxy** (nominal FX vs CPI index), not the IMF REER.
- Monte Carlo and scorecard are illustrative models, not forecasts.
- **Not investment, legal, or political advice.**

## Screenshots

See `docs/` (generated via Playwright after local serve).

## License

Educational/research use. Respect upstream API terms of use.
