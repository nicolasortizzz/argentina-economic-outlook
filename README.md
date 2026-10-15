# Argentina Economic Outlook

Interactive, English-language research dashboard evaluating Argentina's macroeconomic viability and President Javier Milei's economic program (from December 2023). Built by **Nicolas Ortiz** — Economist | Financial & Data Analyst.

**Live site:** [https://nicolasortizzz.github.io/argentina-economic-outlook/](https://nicolasortizzz.github.io/argentina-economic-outlook/)

## Features

- Twelve thematic tabs: overview, history, program pillars (balanced pro/con), results (Dec 2023 marker), sustainability (debt dynamics, bilateral RER, FX payment calendar), sectoral, social, political risks, international comparisons (Israel 1985, Argentina 1991, Brazil 1994, Peru 1990), Monte Carlo scenarios, viability scorecard, conclusion.
- Dark/light theme, KPI cards, Plotly charts, responsive layout (Inter font, Plotly 2.35.2).
- **Real data** from public APIs; curated calendars and scenario weights are labeled **Estimate** or **Author's view**.

## Refresh data

```bash
python3 scripts/fetch_data.py
```

Requires `requests` (`pip install --user requests`). BCRA calls use `verify=False` due to certificate issues on some hosts.

Fetches also build `data/us_cpi.json` (FRED CPIAUCSL) and `data/rer_bilateral.json` (official FX × US CPI ÷ INDEC national CPI, base Dec 2023 = 100). `data/debt_payments.json` is a curated 2026–2027 FX service calendar (timestamps refreshed on fetch).

## Local preview

```bash
python3 -m http.server 8765
```

Open `http://localhost:8765/`.

## Methodology

| Source | Series (examples) | Last fetch (see JSON `fetched_at`) |
|--------|-------------------|-------------------------------------|
| [BCRA estadísticas v4](https://api.bcra.gob.ar/estadisticas/v4.0/monetarias) | Reserves, FX official, policy rate, CPI (cross-check) | `data/bcra.json` |
| [datos.gob.ar / INDEC](https://apis.datos.gob.ar/series/api/) | National CPI index & m/m, EMAE, fiscal balances, unemployment, exports | `data/indec.json` |
| [FRED CPIAUCSL](https://fred.stlouisfed.org/series/CPIAUCSL) | US CPI (monthly) for bilateral RER | `data/us_cpi.json` |
| [World Bank API](https://data.worldbank.org/) | Inflation history, Gini, cross-country comparisons | `data/worldbank.json` |
| [IMF DataMapper](https://www.imf.org/external/datamapper/) | WEO gross debt, current account (actual vs projection split in UI) | `data/imf.json` |
| [Bluelytics](https://api.bluelytics.com.ar/v2/evolution.json) | Parallel (blue) USD/ARS | `data/market.json` |
| [argentinadatos](https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais) | Country risk (EMBI+) | `data/market.json` |
| `data/debt_payments.json` | Documented Bonares/Globales Jan 9 & Jul 9; IMF net service (estimates) | curated |
| `data/facts.json` | Policy milestones with `source_url` | curated |

**CPI y/y KPI:** 12-month change from INDEC national CPI index (`145.3_INGNACNAL_DICI_M_15`), aligned with INDEC monthly CPI.

**Bilateral RER:** \((\text{official FX} \times \text{US CPI}) / \text{Argentina CPI index}\), indexed to Dec 2023 = 100. Higher = more depreciated / competitive vs USD.

**Debt simulator:** \(d_{t+1} = d_t(1+r_\text{eff})/(1+g) - pb\) with \(r_\text{eff} = r + (\text{FX share}) \times (\text{real depreciation})\). Displays stabilizing primary balance \(pb^* = d(r-g)/(1+g)\).

**Monte Carlo scenarios:** 5,000 paths, three weighted regimes (bear/base/bull); fan charts for debt/GDP and inflation — **Author's view**, not agency forecasts.

Run `python3 scripts/screenshot_tabs.py` (Playwright) with the local server for regression screenshots in `docs/` and `/workspace/arg_<tab>.png`.

## Caveats

- API coverage changes; empty series are logged in `data/sources.json`.
- IMF WEO years from the current calendar year onward are **projections**; the overview debt KPI uses the latest actual WEO year only.
- Debt payment calendar mixes Ministry/press-documented bond totals with **Estimate** rows (IMF net, 2027 bond splits).
- Monte Carlo, scorecard, and some political-economy labels are illustrative judgment.
- **Not investment, legal, or political advice.**

## License

Educational/research use. Respect upstream API terms of use.
