#!/usr/bin/env python3
"""Fetch Argentina macro data from public APIs. Stores JSON under data/ with provenance."""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Optional

try:
    import requests
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "requests"])
    import requests

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
DATA.mkdir(parents=True, exist_ok=True)

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "argentina-economic-outlook/1.0 (educational)"})
VERIFY_BCRA = False

ISO = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def save(name: str, payload: dict) -> None:
    path = DATA / name
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def fetch_json(
    url: str,
    *,
    verify: bool = True,
    params: Optional[dict] = None,
    timeout: int = 120,
) -> tuple[Optional[Any], Optional[str]]:
    try:
        r = SESSION.get(url, params=params, timeout=timeout, verify=verify)
        r.raise_for_status()
        return r.json(), None
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"


def bcra_series(var_id: int, page_limit: int = 1000) -> dict:
    base_v4 = f"https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias/{var_id}"
    points: list[dict] = []
    offset = 0
    total = None
    err = None
    while True:
        url_used = f"{base_v4}?limit={page_limit}&offset={offset}"
        data, err = fetch_json(url_used, verify=VERIFY_BCRA)
        if err or not data or not data.get("results"):
            break
        rs = data["metadata"]["resultset"]
        total = rs.get("count", 0)
        det = data["results"][0].get("detalle", [])
        for row in det:
            points.append({"date": row["fecha"], "value": row["valor"]})
        offset += page_limit
        if offset >= total or not det:
            break
    # v3 fallback only if v4 completely unavailable
    api_version = "v4.0"
    if not points and err:
        base_v3 = f"https://api.bcra.gob.ar/estadisticas/v3.0/Monetarias/{var_id}"
        url_used = f"{base_v3}?limit={page_limit}"
        data, err = fetch_json(url_used, verify=VERIFY_BCRA)
        api_version = "v3.0"
        if data and data.get("results"):
            det = data["results"][0].get("detalle", [])
            for row in det:
                points.append({"date": row["fecha"], "value": row["valor"]})
    return {
        "idVariable": var_id,
        "source_url": base_v4,
        "api_version": api_version,
        "fetched_at": ISO,
        "error": err if not points else None,
        "points": points,
        "count": len(points),
    }


def bcra_catalog() -> dict:
    urls = [
        "https://api.bcra.gob.ar/estadisticas/v4.0/monetarias",
        "https://api.bcra.gob.ar/estadisticas/v3.0/monetarias",
    ]
    for url in urls:
        data, err = fetch_json(url, verify=VERIFY_BCRA, params={"limit": 2000})
        if data and data.get("results"):
            return {
                "source_url": url,
                "fetched_at": ISO,
                "error": err,
                "variables": data["results"],
            }
    return {"source_url": urls[0], "fetched_at": ISO, "error": "catalog unavailable", "variables": []}


def series_api(ids: list[str], limit: int = 5000) -> dict:
    ids_s = ",".join(ids)
    url = f"https://apis.datos.gob.ar/series/api/series/?ids={ids_s}&format=json&limit={limit}"
    data, err = fetch_json(url)
    out: dict[str, list] = {}
    if data and "data" in data:
        raw = data["data"]
        if isinstance(raw, dict):
            for sid, rows in raw.items():
                out[sid] = _parse_series_rows(rows)
        elif isinstance(raw, list) and len(ids) == 1:
            out[ids[0]] = _parse_series_rows(raw)
        elif isinstance(raw, list):
            # Multiple series: API returns one row per period with values per series (wide format).
            meta = data.get("meta") or []
            field_meta = [m for m in meta if isinstance(m, dict) and m.get("field")]
            n_series = max(len(ids), len(field_meta))
            buckets: dict[str, list] = {ids[i] if i < len(ids) else f"series_{i}": [] for i in range(n_series)}
            for row in raw:
                if not isinstance(row, (list, tuple)) or len(row) < 1:
                    continue
                date = row[0]
                for i in range(1, len(row)):
                    sid = ids[i - 1] if i - 1 < len(ids) else f"series_{i - 1}"
                    val = row[i]
                    if val is not None:
                        buckets.setdefault(sid, []).append({"date": date, "value": val})
            out.update(buckets)
    return {"source_url": url, "fetched_at": ISO, "error": err, "series": out}


def _parse_series_rows(rows: list) -> list[dict]:
    out = []
    for r in rows or []:
        if isinstance(r, dict):
            out.append({"date": r["indice_tiempo"], "value": r["valor"]})
        elif isinstance(r, (list, tuple)) and len(r) >= 2:
            out.append({"date": r[0], "value": r[1]})
    return out


def worldbank_indicator(indicator: str, countries: str = "ARG;BRA;CHL;PER;ISR;MEX") -> dict:
    url = (
        f"https://api.worldbank.org/v2/country/{countries}/indicator/{indicator}"
        f"?format=json&per_page=200"
    )
    data, err = fetch_json(url)
    series: dict[str, list] = {}
    if isinstance(data, list) and len(data) > 1 and isinstance(data[1], list):
        for row in data[1]:
            if row.get("value") is None:
                continue
            iso3 = row["countryiso3code"]
            series.setdefault(iso3, []).append(
                {"year": int(row["date"]), "value": row["value"]}
            )
        for k in series:
            series[k].sort(key=lambda x: x["year"])
    return {
        "indicator": indicator,
        "source_url": url,
        "fetched_at": ISO,
        "error": err,
        "by_country": series,
    }


def fred_cpi_au_csl() -> dict:
    url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCSL"
    try:
        r = SESSION.get(url, timeout=120)
        r.raise_for_status()
        import csv
        import io

        points = []
        for row in csv.DictReader(io.StringIO(r.text)):
            v = row.get("CPIAUCSL")
            if v and v != ".":
                points.append({"date": row["observation_date"], "value": float(v)})
        return {
            "source_url": url,
            "series_id": "CPIAUCSL",
            "description": "US CPI-U, all items, SA (FRED)",
            "fetched_at": ISO,
            "points": points,
        }
    except Exception as e:
        return {"source_url": url, "fetched_at": ISO, "error": str(e), "points": []}


def build_rer_bilateral(bcra: dict, indec: dict, us_cpi: dict) -> dict:
    fx_key = "fx_wholesale_ref"
    fx_pts = sorted(bcra.get("series", {}).get(fx_key, {}).get("points", []), key=lambda x: x["date"])
    if not fx_pts:
        fx_pts = sorted(bcra.get("series", {}).get("fx_retail", {}).get("points", []), key=lambda x: x["date"])
    ar_cpi = sorted(indec.get("series", {}).get("145.3_INGNACNAL_DICI_M_15", []), key=lambda x: x["date"])
    us_map = {p["date"][:7]: p["value"] for p in us_cpi.get("points", [])}
    ar_map = {p["date"][:7]: p["value"] for p in ar_cpi}
    fx_map = {p["date"][:7]: p["value"] for p in fx_pts}
    months = sorted(set(fx_map) & set(ar_map) & set(us_map))
    months = [m for m in months if m >= "2017-01"]
    raw = [{"date": m + "-01", "fx": fx_map[m], "us_cpi": us_map[m], "ar_cpi": ar_map[m]} for m in months]
    base_m = "2023-12"
    base_row = next((x for x in raw if x["date"].startswith(base_m)), raw[-1] if raw else None)
    rer_pts = []
    if base_row:
        b_fx, b_us, b_ar = base_row["fx"], base_row["us_cpi"], base_row["ar_cpi"]
        base_level = b_fx * b_us / b_ar
        for row in raw:
            level = row["fx"] * row["us_cpi"] / row["ar_cpi"]
            rer_pts.append({"date": row["date"], "value": round(level / base_level * 100, 4)})
    return {
        "fetched_at": ISO,
        "formula": "bilateral_rer = (official_fx * us_cpi / ar_cpi_index), base Dec 2023 = 100",
        "interpretation": "Higher index = more depreciated / competitive vs USD.",
        "base_month": base_m,
        "sources": {
            "fx": bcra.get("series", {}).get(fx_key, {}).get("source_url", ""),
            "ar_cpi": "INDEC 145.3_INGNACNAL_DICI_M_15 via datos.gob.ar",
            "us_cpi": us_cpi.get("source_url", ""),
        },
        "points": rer_pts,
    }


def imf_datamapper(codes: list[str], country: str = "ARG") -> dict:
    out = {}
    errors = []
    for code in codes:
        url = f"https://www.imf.org/external/datamapper/api/v1/{code}/{country}"
        data, err = fetch_json(url, timeout=90)
        if err:
            errors.append(f"{code}: {err}")
            continue
        vals = (data or {}).get("values", {}).get(code, {}).get(country, {})
        points = [{"year": int(y), "value": v} for y, v in sorted(vals.items(), key=lambda x: int(x[0]))]
        out[code] = {"source_url": url, "points": points}
    return {"fetched_at": ISO, "country": country, "errors": errors, "indicators": out}


def main() -> None:
    sources: dict[str, Any] = {"fetched_at": ISO, "ok": [], "failed": []}

    def track(name: str, ok: bool, detail: str = "") -> None:
        entry = {"name": name, "detail": detail, "at": ISO}
        (sources["ok"] if ok else sources["failed"]).append(entry)

    # BCRA
    catalog = bcra_catalog()
    save("bcra_catalog.json", catalog)
    track("bcra_catalog", not catalog.get("error") or bool(catalog.get("variables")), catalog.get("error") or "")

    bcra_ids = {
        "reserves_usd_mn": 1,
        "fx_retail": 4,
        "fx_wholesale_ref": 5,
        "monetary_base": 15,
        "cpi_monthly_pct": 27,
        "cpi_yoy_pct": 28,
        "policy_rate": 160,
        "policy_rate_upper": 161,
    }
    bcra = {"fetched_at": ISO, "series": {}}
    for key, vid in bcra_ids.items():
        s = bcra_series(vid)
        bcra["series"][key] = s
        track(f"bcra_{key}", not s.get("error") and s.get("count", 0) > 0, s.get("error") or f"n={s.get('count')}")
    save("bcra.json", bcra)

    # INDEC / datos.gob.ar
    indec_ids = [
        "145.3_INGNACNAL_DICI_M_15",  # IPC index
        "145.3_INGNACUAL_DICI_M_38",  # IPC monthly %
        "143.3_ICE_SER_VM_2004_A_34",  # EMAE mom %
        "143.3_NO_PR_2004_A_31",  # EMAE index (monthly freq in API)
        "452.3_RESULTADO_PIP_0_M_22_71",  # primary balance
        "379.9_RESULTADO_017__18_38",  # financial balance
        "42.3_EPH_PUNTUATAL_0_M_30",  # unemployment
        "158.1_REPTE_0_0_5",  # RIPTE wages
        "350.1_TOTAL_EXPONES__39",  # exports
        "181.1_UNCTAD_TOTNES_0_A_26",  # exports UNCTAD annual
    ]
    indec_series: dict[str, list] = {}
    indec_errors = []
    for sid in indec_ids:
        block = series_api([sid], limit=5000)
        rows = block.get("series", {}).get(sid, [])
        indec_series[sid] = rows
        if not rows:
            indec_errors.append(sid)
    indec = {
        "source_url": "https://apis.datos.gob.ar/series/api/series/",
        "fetched_at": ISO,
        "error": "; ".join(indec_errors) if indec_errors else None,
        "series": indec_series,
    }
    save("indec.json", indec)
    track("indec_series", len(indec_errors) < len(indec_ids), indec.get("error") or "")

    # Search poverty rate national if available
    search_url = "https://apis.datos.gob.ar/series/api/search/?q=pobreza+nacional+EPH&limit=5"
    search_data, search_err = fetch_json(search_url)
    poverty_id = None
    if search_data and search_data.get("data"):
        for item in search_data["data"]:
            desc = item["field"]["description"].lower()
            if "pobreza" in desc and "hogar" in desc and "31 aglomerados" in desc:
                poverty_id = item["field"]["id"]
                break
        if not poverty_id:
            for item in search_data["data"]:
                fid = item["field"]["id"]
                if "POBREZA" in fid.upper() and "31" in desc:
                    poverty_id = fid
                    break
    if poverty_id:
        pov = series_api([poverty_id])
        indec["poverty_series_id"] = poverty_id
        indec["series"].update(pov.get("series", {}))
        save("indec.json", indec)
        track("indec_poverty", True, poverty_id)
    else:
        track("indec_poverty", False, search_err or "no series id found")

    # World Bank
    wb_inds = {
        "gdp_growth": "NY.GDP.MKTP.KD.ZG",
        "inflation_cpi": "FP.CPI.TOTL.ZG",
        "gov_debt_gdp": "GC.DOD.TOTL.GD.ZS",
        "gini": "SI.POV.GINI",
        "poverty_headcount": "SI.POV.DDAY",
        "reer": "PA.NUS.FCRF",  # fallback; also fetch official exchange
        "us_cpi": "FP.CPI.TOTL",  # index for US - might be wrong indicator
    }
    wb = {"fetched_at": ISO, "indicators": {}}
    for key, ind in wb_inds.items():
        wb["indicators"][key] = worldbank_indicator(ind)
        s = wb["indicators"][key]
        track(f"wb_{key}", not s.get("error") and bool(s.get("by_country")), s.get("error") or "")
    save("worldbank.json", wb)

    # IMF
    imf_codes = ["NGDP_RPCH", "PCPIPCH", "GGXWDG_NGDP", "BCA_NGDPD"]
    imf = imf_datamapper(imf_codes)
    for code in imf_codes:
        track(f"imf_{code}", code in imf.get("indicators", {}), "")
    save("imf.json", imf)

    # Market: bluelytics, country risk
    market: dict[str, Any] = {"fetched_at": ISO}
    blue_url = "https://api.bluelytics.com.ar/v2/evolution.json"
    blue, blue_err = fetch_json(blue_url)
    market["bluelytics"] = {
        "source_url": blue_url,
        "fetched_at": ISO,
        "error": blue_err,
        "points": blue if isinstance(blue, list) else [],
    }
    track("bluelytics", not blue_err and isinstance(blue, list), blue_err or "")

    risk_url = "https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais"
    risk, risk_err = fetch_json(risk_url)
    market["country_risk"] = {
        "source_url": risk_url,
        "fetched_at": ISO,
        "error": risk_err,
        "points": risk if isinstance(risk, list) else [],
    }
    track("country_risk", not risk_err and isinstance(risk, list), risk_err or "")

    dolar_url = "https://dolarapi.com/v1/dolares"
    dolar, dolar_err = fetch_json(dolar_url)
    market["dolarapi"] = {"source_url": dolar_url, "fetched_at": ISO, "error": dolar_err, "data": dolar}
    track("dolarapi", not dolar_err, dolar_err or "")

    save("market.json", market)

    us_cpi = fred_cpi_au_csl()
    save("us_cpi.json", us_cpi)
    track("fred_CPIAUCSL", bool(us_cpi.get("points")), us_cpi.get("error") or f"n={len(us_cpi.get('points', []))}")

    rer = build_rer_bilateral(bcra, indec, us_cpi)
    save("rer_bilateral.json", rer)
    track("rer_bilateral", bool(rer.get("points")), f"n={len(rer.get('points', []))}")

    # debt_payments.json is curated (documented schedules); refresh timestamps only if present
    pay_path = DATA / "debt_payments.json"
    if pay_path.exists():
        pay = json.loads(pay_path.read_text(encoding="utf-8"))
        pay["fetched_at"] = ISO
        save("debt_payments.json", pay)

    # Manifest for frontend
    manifest = {
        "generated_at": ISO,
        "files": [
            "bcra.json",
            "bcra_catalog.json",
            "indec.json",
            "worldbank.json",
            "imf.json",
            "market.json",
            "facts.json",
            "sources.json",
            "us_cpi.json",
            "rer_bilateral.json",
            "debt_payments.json",
        ],
    }
    save("manifest.json", manifest)
    save("sources.json", sources)

    print(f"Wrote data to {DATA}")
    print(f"OK: {len(sources['ok'])}, failed: {len(sources['failed'])}")
    for f in sources["failed"]:
        print("  FAIL:", f["name"], f.get("detail"))


if __name__ == "__main__":
    main()
