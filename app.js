"use strict";
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const MILEI = "2023-12-10";
const S = { tab: "overview", ccy: "USD", fx: 1, fxDate: "", drawn: {}, data: null };

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const CFG = { displaylogo: false, displayModeBar: false, responsive: true };
const layout = (extra = {}) =>
  Object.assign(
    {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: "Inter", color: css("--tx"), size: 12 },
      margin: { l: 50, r: 16, t: 10, b: 40 },
      xaxis: { gridcolor: css("--bd"), color: css("--mu") },
      yaxis: { gridcolor: css("--bd"), color: css("--mu") },
      legend: { orientation: "h", y: 1.08 },
      hoverlabel: { font: { family: "Inter" } },
    },
    extra
  );
function plot(id, data, lay) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("sk");
  return Plotly.react(el, data, layout(lay), CFG);
}
function toast(t) {
  const e = $("#toast");
  e.textContent = t;
  e.classList.add("show");
  clearTimeout(e._t);
  e._t = setTimeout(() => e.classList.remove("show"), 2000);
}
function countUp(el, to, fmt) {
  const t0 = performance.now(),
    d = 900;
  const f = (n) => {
    const k = Math.min(1, (n - t0) / d),
      e = 1 - Math.pow(1 - k, 3);
    el.innerHTML = fmt(to * e);
    if (k < 1) requestAnimationFrame(f);
    else el.innerHTML = fmt(to);
  };
  requestAnimationFrame(f);
}
function kpi(l, v, s = "", fmt) {
  return { l, v, s, fmt };
}
function renderKpis(el, arr) {
  el.innerHTML = arr
    .map(
      (k, i) =>
        `<div class="kpi" style="animation:fade .5s ${i * 0.06}s both"><div class="l">${k.l}</div><div class="v count" data-i="${i}"></div><div class="s">${k.s}</div></div>`
    )
    .join("");
  arr.forEach((k, i) => {
    const e = el.querySelector(`[data-i="${i}"]`);
    typeof k.v === "number" && k.fmt ? countUp(e, k.v, k.fmt) : (e.innerHTML = k.v);
  });
}

function pts(bcraKey) {
  const s = S.data.bcra.series[bcraKey];
  return s && s.points ? [...s.points].sort((a, b) => a.date.localeCompare(b.date)) : [];
}
function indec(id) {
  const s = S.data.indec.series[id] || [];
  return [...s].sort((a, b) => a.date.localeCompare(b.date));
}
function lastPt(arr) {
  return arr.length ? arr[arr.length - 1] : null;
}
function imfDebtPoints() {
  return S.data?.imf?.indicators?.GGXWDG_NGDP?.points || [];
}
function latestImfActualDebt() {
  const cut = new Date().getFullYear() - 1;
  const actual = imfDebtPoints().filter((p) => p.year <= cut);
  if (!actual.length) return null;
  const p = actual[actual.length - 1];
  return { year: p.year, value: p.value };
}
function indecCpiYoySeries() {
  const idx = indec("145.3_INGNACNAL_DICI_M_15");
  const byMonth = new Map();
  idx.forEach((p) => byMonth.set(p.date.slice(0, 7), p.value));
  const months = [...byMonth.keys()].sort();
  const out = [];
  months.forEach((m) => {
    const [y, mo] = m.split("-").map(Number);
    const prev = `${y - 1}-${String(mo).padStart(2, "0")}`;
    const v0 = byMonth.get(prev);
    const v1 = byMonth.get(m);
    if (v0 && v1) out.push({ date: `${m}-01`, value: (v1 / v0 - 1) * 100 });
  });
  return out;
}
function lastCpiYoy() {
  const s = indecCpiYoySeries();
  return s.length ? s[s.length - 1] : lastPt(pts("cpi_yoy_pct"));
}
function filterFrom(dates, series, from) {
  return series.filter((p) => p.date >= from);
}
function mergeSeriesByDate(a, b) {
  const dates = [...new Set(a.map((p) => p.date).concat(b.map((p) => p.date)))].filter((d) => d).sort();
  const am = new Map(a.map((p) => [p.date, p.value]));
  const bm = new Map(b.map((p) => [p.date, p.value]));
  return dates.map((d) => ({ date: d, a: am.has(d) ? am.get(d) : null, b: bm.has(d) ? bm.get(d) : null }));
}
function numRange(vals) {
  const v = vals.filter((x) => x != null && Number.isFinite(x));
  if (!v.length) return undefined;
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const pad = (hi - lo) * 0.05 || 1;
  return [lo - pad, hi + pad];
}
function arsLine(usd) {
  if (usd == null || !S.fx) return "";
  const ars = usd * S.fx;
  return S.ccy === "USD" ? ` · ARS ${ars.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "";
}
function usdFmt(v, d = 2) {
  if (v == null) return "—";
  const u = +v;
  const main =
    S.ccy === "ARS"
      ? `ARS ${(u * S.fx).toLocaleString("en-US", { maximumFractionDigits: d })}`
      : `$${u.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
  return main + (S.ccy === "USD" && S.fx ? `<span class="muted small"> (${(u * S.fx).toFixed(0)} ARS)</span>` : "");
}

const PILLARS = [
  {
    id: "fiscal",
    title: "Fiscal anchor",
    body: "Sharp primary surplus targeting, spending cuts, subsidy rationalization, and tax/administration reforms under Minister Luis Caputo / Treasury.",
    pro: "Restores market access credibility, lowers monetization pressure, aligns with IMF targets, and compresses the twin-deficit root of inflation.",
    con: "Procyclical cuts hit transfers and capital spending; compliance may rely on one-off revenues; social backlash can erode congressional support.",
  },
  {
    id: "monetary",
    title: "BCRA & monetary regime",
    body: "Positive real policy rates, liquidity mop-up, and coordination with fiscal consolidation to break inertia inflation.",
    pro: "Rebuilds peso demand, anchors expectations after 2023 shock, and penalizes carry into FX gaps.",
    con: "High rates stress sovereign rollover and SMEs; quasi-fiscal BCRA stock may linger; political pressure to ease before elections.",
  },
  {
    id: "fx",
    title: "FX: crawl, band, cepo",
    body: "Sequence from unified wholesale reference (A3500) with crawling peg (≈2% → ≈1% monthly) toward a band (April 2025) and gradual cepo dismantling.",
    pro: "Predictable nominal anchor aids import pricing and IMF program; slower crawl supports disinflation; band allows real appreciation flexibility.",
    con: "Parallel premium persists while cepos bind; competitiveness loss if crawl > inflation differential; reserves test on liberalization days.",
  },
  {
    id: "dereg",
    title: "Deregulation (DNU 70 & Ley Bases)",
    body: "Emergency decree plus omnibus law to streamline state, labor, and economic regulation; partial judicial/congressional pushback.",
    pro: "Lowers administrative costs, signals pro-market pivot, unlocks privatization legal framework.",
    con: "Legitimacy debates, uneven enforcement, consumer-protection concerns, and federalism friction with provinces.",
  },
  {
    id: "rigi",
    title: "RIGI (large investments)",
    body: "Long-term tax/customs stability for mega-projects (energy, mining, infrastructure).",
    pro: "Can crowd-in Vaca Muerta/lithium FDI with contract certainty despite macro noise.",
    con: "Fiscal cost of incentives; governance risks; benefits are back-loaded while adjustment is front-loaded.",
  },
  {
    id: "priv",
    title: "Privatizations & state reform",
    body: "Asset sales and corporatization (airline, energy firms, media) contingent on congressional authorization.",
    pro: "Potential efficiency gains and fiscal receipts; reduces politicized losses.",
    con: "Valuation disputes, labor conflicts, and risk of underinvestment in natural monopolies.",
  },
  {
    id: "imf",
    title: "IMF Extended Fund Facility",
    body: "April 2025 IMF Board approved a new 48-month Extended Fund Facility (~USD 20bn, SDR 15.267bn), replacing the prior arrangement — reviews and disbursements under that program.",
    pro: "Bridge financing, policy discipline, and signal to bondholders; buys time for adjustment.",
    con: "Conditionality limits fiscal space; reputational cost of repeated programs; catalytic effect on private flows not guaranteed.",
  },
];

const DEFAULTS = [
  { y: 1827, t: "Default on external debt (early republic)" },
  { y: 1890, t: "Baring crisis / debenture default" },
  { y: 1951, t: "Partial external suspension" },
  { y: 1982, t: "Latin American debt crisis" },
  { y: 1989, t: "Hyperinflation & Alfonsín handover" },
  { y: 2001, t: "Convertibility collapse — largest default" },
  { y: 2014, t: "Selective default (holdouts)" },
  { y: 2020, t: "9th sovereign restructuring" },
];

async function load() {
  const files = ["bcra", "indec", "worldbank", "imf", "market", "facts", "sources", "manifest", "us_cpi", "rer_bilateral", "debt_payments"];
  const parts = await Promise.all(
    files.map((n) => fetch(`data/${n}.json`).then((r) => (r.ok ? r.json() : {})))
  );
  S.data = Object.fromEntries(files.map((n, i) => [n, parts[i]]));
  const retail = lastPt(pts("fx_retail"));
  S.fx = retail ? retail.value : 1;
  S.fxDate = retail ? retail.date : "";
  const gen = S.data.manifest?.generated_at || S.data.bcra?.fetched_at || "";
  $("#asof").textContent = gen ? gen.slice(0, 16).replace("T", " ") + " UTC" : S.fxDate;
  $("#foot").textContent = `Data refresh: python3 scripts/fetch_data.py · Official FX ${S.fx.toFixed(2)} ARS/USD (${S.fxDate})`;
  initUI();
  snapshotDebtBaseline();
  applyDebtSimDefaults();
  buildPillarNav();
  renderAll();
}

function initUI() {
  const tabs = $$("#tabs button");
  const ink = () => {
    const b = $("#tabs .active");
    if (!b) return;
    $("#ink").style.left = b.offsetLeft + "px";
    $("#ink").style.width = b.offsetWidth + "px";
  };
  tabs.forEach((b) => (b.onclick = () => switchTab(b.dataset.tab)));
  window.addEventListener("resize", ink);
  setTimeout(ink, 60);
  S.ink = ink;
  $("#theme").onclick = () => {
    const r = document.documentElement;
    r.dataset.theme = r.dataset.theme === "dark" ? "light" : "dark";
    localStorage.theme = r.dataset.theme;
    S.drawn = {};
    renderTab();
  };
  if (localStorage.theme) document.documentElement.dataset.theme = localStorage.theme;
  $("#ccy").onclick = () => {
    S.ccy = S.ccy === "USD" ? "ARS" : "USD";
    $("#ccy").textContent = S.ccy;
    toast(S.ccy === "ARS" ? "Values scaled by official FX" : "Showing USD where applicable");
    S.drawn = {};
    renderAll();
  };
  const applyHash = () => {
    const t = location.hash.slice(1);
    if (t && $(`[data-tab="${t}"]`)) switchTab(t);
  };
  if (location.hash) S.tab = location.hash.slice(1);
  window.addEventListener("hashchange", applyHash);
  initDebtSim();
  initScenarios();
}

function switchTab(t) {
  S.tab = t;
  $$("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === t));
  $$(".tab").forEach((s) => s.classList.toggle("active", s.id === t));
  S.ink();
  history.replaceState(null, "", `#${t}`);
  setTimeout(renderTab, 30);
}

function renderAll() {
  tape();
  switchTab(S.tab);
}

function renderTab() {
  const t = S.tab;
  if (S.drawn[t]) {
    $$(`#${t} .js-plotly-plot`).forEach((e) => Plotly.Plots.resize(e));
    return;
  }
  S.drawn[t] = 1;
  const fns = {
    overview: tabOverview,
    history: tabHistory,
    pillars: tabPillars,
    results: tabResults,
    sustainability: tabSustain,
    sectoral: tabSectoral,
    social: tabSocial,
    risks: tabRisks,
    comparisons: tabCmp,
    scenarios: tabScenarios,
    scorecard: tabScore,
    conclusion: tabConclusion,
  };
  (fns[t] || (() => {}))();
}

function tape() {
  const r = lastPt(pts("reserves_usd_mn"));
  const cpi = lastCpiYoy();
  const risk = lastPt(S.data.market.country_risk?.points || []);
  const blue = blueSeries().at(-1);
  const items = [
    `Reserves ${r ? (r.value / 1000).toFixed(1) + "bn USD" : "n/a"}`,
    `FX official ${S.fx.toFixed(2)} ARS`,
    blue ? `Blue ${blue.value.toFixed(0)} ARS` : "",
    cpi ? `CPI y/y ${cpi.value.toFixed(1)}% (INDEC ${cpi.date.slice(0, 7)})` : "",
    risk ? `Country risk ${risk.valor} bp` : "",
    `Program since Dec 2023`,
  ].filter(Boolean);
  const html = items.map((x) => `<span>${x}</span>`).join("");
  $("#tape").innerHTML = html + html;
}

function blueSeries() {
  const raw = S.data.market.bluelytics?.points || [];
  const m = new Map();
  raw.forEach((row) => {
    if (row.source === "Blue") m.set(row.date, row.value_sell);
  });
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value }));
}

function officialSeries() {
  return pts("fx_wholesale_ref").length ? pts("fx_wholesale_ref") : pts("fx_retail");
}

function tabOverview() {
  const res = lastPt(pts("reserves_usd_mn"));
  const cpiM = lastPt(indec("145.3_INGNACUAL_DICI_M_38"));
  const cpiY = lastCpiYoy();
  const pol = lastPt(pts("policy_rate"));
  const risk = lastPt((S.data.market.country_risk?.points || []).map((p) => ({ date: p.fecha, value: p.valor })));
  const debtAct = latestImfActualDebt();
  const debtProj = imfDebtPoints().find((p) => p.year === new Date().getFullYear());
  renderKpis($("#ovKpis"), [
    kpi("Intl. reserves", res ? res.value / 1000 : "—", res ? `USD bn · ${res.date}` : "", (v) => v.toFixed(1) + "bn"),
    kpi("CPI m/m (INDEC)", cpiM ? (cpiM.value * 100).toFixed(1) + "%" : "—", cpiM?.date || ""),
    kpi("CPI y/y (INDEC national)", cpiY ? cpiY.value.toFixed(1) + "%" : "—", cpiY ? `month ${cpiY.date.slice(0, 7)}` : ""),
    kpi("Policy rate (BCRA)", pol ? pol.value.toFixed(1) + "%" : "—", pol?.date || ""),
    kpi("Country risk", risk ? risk.value + " bp" : "—", risk?.date || ""),
    kpi(
      "Gross debt / GDP (IMF actual)",
      debtAct ? debtAct.value.toFixed(0) + "%" : "—",
      debtAct ? `WEO ${debtAct.year}${debtProj ? ` · IMF projection ${debtProj.year}: ${debtProj.value.toFixed(0)}%` : ""}` : ""
    ),
  ]);
  $("#ovSnap").innerHTML = `<p>President Javier Milei's administration (from <b>10 Dec 2023</b>) pursues fiscal consolidation, a restrictive monetary stance, and a managed FX transition toward liberalization, alongside structural reforms (DNU 70/2023, Ley Bases, RIGI) and continued IMF engagement.</p><p>This dashboard compares <b>pre- and post-inauguration</b> trajectories using only downloaded official statistics. Where labeled <span class="tag-estimate">Author's view</span>, content is analytical judgment—not a forecast from agencies.</p>`;
  const facts = (S.data.facts.items || [])
    .filter((f) => f.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 10);
  $("#ovFacts").innerHTML =
    `<div class="feed timeline">` +
    facts
      .map(
        (f) =>
          `<a class="tl-item" href="${f.source_url}" target="_blank" rel="noopener"><span class="tl-date">${f.date}</span><span class="tl-body"><span class="tl-meta"><span class="badge">${f.category}</span>${f.label ? `<span class="tag-estimate">${f.label}</span>` : ""}</span><span class="tl-title">${f.title}</span><span class="tl-src">Source ↗</span></span></a>`
      )
      .join("") +
    `</div>`;
  const from = "2023-01-01";
  const fx = filterFrom(null, officialSeries(), from);
  const resv = filterFrom(null, pts("reserves_usd_mn"), from);
  plot(
    "ovFxRes",
    [
      { type: "scatter", mode: "lines", name: "Reserves (USD mn)", x: resv.map((p) => p.date), y: resv.map((p) => p.value), line: { color: css("--ac2"), width: 2 } },
      { type: "scatter", mode: "lines", name: "FX official (ARS/USD)", x: fx.map((p) => p.date), y: fx.map((p) => p.value), yaxis: "y2", line: { color: css("--ac"), width: 2 } },
    ],
    {
      margin: { l: 58, r: 62, t: 10, b: 40 },
      yaxis: { title: "Reserves (USD mn)", automargin: true },
      yaxis2: { overlaying: "y", side: "right", title: "ARS/USD", automargin: true, showgrid: false },
      hovermode: "x unified", shapes: mileiShape(),
    }
  );
}

function mileiShape(xref = "x") {
  return [{ type: "line", x0: MILEI, x1: MILEI, y0: 0, y1: 1, xref, yref: "paper", line: { dash: "dot", color: css("--mu") } }];
}

function tabHistory() {
  const infl = S.data.worldbank.indicators?.inflation_cpi?.by_country?.ARG || [];
  const yrs = infl.filter((p) => p.year >= 1960 && p.value > 0);
  plot(
    "histInfl",
    [
      {
        type: "scatter",
        mode: "lines",
        x: yrs.map((p) => p.year),
        y: yrs.map((p) => p.value),
        line: { color: css("--ac"), width: 2 },
        hovertemplate: "%{x}: %{y:.1f}%<extra></extra>",
      },
    ],
    { yaxis: { type: "log", title: "Annual CPI % (log)" }, shapes: mileiShapeYear() }
  );
  $("#histTL").innerHTML = DEFAULTS.map((d) => `<div class="tl"><b>${d.y}</b>${d.t}</div>`).join("");
  $("#histProse").innerHTML =
    "<p>Argentina combines rich human capital and commodity endowments with chronic macro instability: high inflation persistence, shallow domestic capital markets, dollarization of savings, and repeated sovereign restructurings. The Milei program is the latest attempt to break this loop via front-loaded adjustment and rules-based FX/fiscal anchors.</p><p>Historical comparisons (Israel 1985, Peru 1990, Brazil 1994, Convertibility 1991) are informative but not deterministic—initial conditions and political coalitions differ materially.</p>";
}

function mileiShapeYear() {
  return [{ type: "line", x0: 2023.9, x1: 2023.9, y0: 0, y1: 1, yref: "paper", line: { dash: "dot", color: css("--mu") } }];
}

function buildPillarNav() {
  const seg = $("#pillarSeg");
  seg.innerHTML = PILLARS.map((p, i) => `<button data-i="${i}" class="${i ? "" : "on"}">${p.title}</button>`).join("");
  seg.querySelectorAll("button").forEach((b) => {
    b.onclick = () => {
      seg.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      showPillar(+b.dataset.i);
    };
  });
  showPillar(0);
}

function showPillar(i) {
  const p = PILLARS[i];
  $("#pillarTitle").textContent = p.title;
  $("#pillarBody").innerHTML = `<p>${p.body}</p>`;
  $("#pillarDebate").innerHTML = `<div class="pro"><h4>Supporters argue</h4>${p.pro}</div><div class="con"><h4>Critics argue</h4>${p.con}</div>`;
}
function tabPillars() {
  showPillar(0);
}

function tabResults() {
  const cpi = indec("145.3_INGNACUAL_DICI_M_38").map((p) => ({ date: p.date, value: p.value * 100 }));
  plot("resCpi", [{ type: "bar", x: cpi.map((p) => p.date), y: cpi.map((p) => p.value), marker: { color: css("--ac") } }], {
    shapes: mileiShape(),
    yaxis: { title: "% m/m" },
  });
  const res = pts("reserves_usd_mn");
  plot("resRes", [{ type: "scatter", x: res.map((p) => p.date), y: res.map((p) => p.value), line: { color: css("--ac2"), width: 2 } }], {
    shapes: mileiShape(),
  });
  const off = officialSeries();
  const blue = blueSeries();
  const dates = [...new Set(off.map((p) => p.date).concat(blue.map((p) => p.date)))].sort();
  const om = new Map(off.map((p) => [p.date, p.value]));
  const bm = new Map(blue.map((p) => [p.date, p.value]));
  const gap = dates.map((d) => {
    const o = om.get(d),
      b = bm.get(d);
    return o && b ? (b / o - 1) * 100 : null;
  });
  plot(
    "resFx",
    [
      { type: "scatter", name: "Official", x: dates, y: dates.map((d) => om.get(d)), line: { color: css("--ac") } },
      { type: "scatter", name: "Parallel (blue)", x: dates, y: dates.map((d) => bm.get(d)), line: { color: "#f59e0b" } },
      { type: "bar", name: "Gap %", x: dates, y: gap, yaxis: "y2", marker: { color: "rgba(34,211,238,.35)" } },
    ],
    { shapes: mileiShape(), yaxis2: { overlaying: "y", side: "right", title: "Gap %" }, hovermode: "x unified" }
  );
  const risk = (S.data.market.country_risk?.points || []).map((p) => ({ date: p.fecha, value: p.valor }));
  plot("resRisk", [{ type: "scatter", x: risk.map((p) => p.date), y: risk.map((p) => p.value), line: { color: css("--dn"), width: 1.5 } }], {
    shapes: mileiShape(),
    yaxis: { title: "bp" },
  });
  const emae = indec("143.3_ICE_SER_VM_2004_A_34").map((p) => ({ date: p.date, value: p.value * 100 }));
  plot("resEmae", [{ type: "bar", x: emae.map((p) => p.date), y: emae.map((p) => p.value), marker: { color: css("--up") } }], {
    shapes: mileiShape(),
    yaxis: { title: "% m/m" },
  });
  const fis = indec("452.3_RESULTADO_PIP_0_M_22_71");
  plot("resFiscal", [{ type: "bar", x: fis.map((p) => p.date), y: fis.map((p) => p.value), marker: { color: css("--ac") } }], {
    shapes: mileiShape(),
    yaxis: { title: "ARS mn" },
  });
  const cy = indecCpiYoySeries().filter((p) => p.date >= "2018-01-01");
  plot("resDisinf", [{ type: "scatter", x: cy.map((p) => p.date), y: cy.map((p) => p.value), line: { color: css("--ac"), width: 2 }, fill: "tozeroy" }], {
    shapes: mileiShape(),
    yaxis: { title: "% y/y" },
  });
}

const DEBT_SIM_BASE = { d0: 85, r: 5, g: 3, pb: 1.5, fxShare: 50, realDep: 5, T: 10 };
let DEBT_BASELINE = { ...DEBT_SIM_BASE };

function snapshotDebtBaseline() {
  const act = latestImfActualDebt();
  DEBT_BASELINE = {
    d0: act ? Math.round(act.value) : DEBT_SIM_BASE.d0,
    r: DEBT_SIM_BASE.r,
    g: DEBT_SIM_BASE.g,
    pb: DEBT_SIM_BASE.pb,
    fxShare: DEBT_SIM_BASE.fxShare,
    realDep: DEBT_SIM_BASE.realDep,
  };
  DEBT_SIM_BASE.d0 = DEBT_BASELINE.d0;
  const d = latestImfActualDebt();
  if (d) {
    SCEN.base.debt = Math.round(d.value);
    SCEN.bear.debt = Math.round(d.value * 1.15);
    SCEN.bull.debt = Math.round(d.value * 0.85);
  }
}

function applyDebtSimDefaults() {
  const d0 = document.getElementById("d0");
  if (!d0) return;
  Object.entries({ d0: DEBT_SIM_BASE.d0, r: DEBT_SIM_BASE.r, g: DEBT_SIM_BASE.g, pb: DEBT_SIM_BASE.pb, fxShare: DEBT_SIM_BASE.fxShare, realDep: DEBT_SIM_BASE.realDep, T: DEBT_SIM_BASE.T }).forEach(([id, v]) => {
    const el = document.getElementById(id);
    const lab = document.getElementById(id + "Val");
    if (el) el.value = v;
    if (lab) lab.textContent = v;
  });
}

function initDebtSim() {
  const box = $("#debtSliders");
  if (!box) return;
  const defs = [
    { id: "d0", l: "Initial debt / GDP (%)", min: 20, max: 200, step: 1, v: DEBT_SIM_BASE.d0 },
    { id: "r", l: "Real interest rate r (%)", min: -5, max: 25, step: 0.25, v: DEBT_SIM_BASE.r },
    { id: "g", l: "Real GDP growth g (%)", min: -10, max: 10, step: 0.25, v: DEBT_SIM_BASE.g },
    { id: "pb", l: "Primary balance / GDP (%)", min: -5, max: 8, step: 0.1, v: DEBT_SIM_BASE.pb },
    { id: "fxShare", l: "Share of debt in foreign currency (%)", min: 0, max: 100, step: 1, v: DEBT_SIM_BASE.fxShare },
    { id: "realDep", l: "Real FX depreciation on FX leg (%/yr)", min: 0, max: 30, step: 0.25, v: DEBT_SIM_BASE.realDep },
    { id: "T", l: "Horizon (years)", min: 5, max: 15, step: 1, v: DEBT_SIM_BASE.T },
  ];
  box.innerHTML = defs
    .map(
      (d) =>
        `<div class="vsl"><label>${d.l} <b id="${d.id}Val">${d.v}</b></label><input type="range" id="${d.id}" min="${d.min}" max="${d.max}" step="${d.step}" value="${d.v}"></div>`
    )
    .join("");
  defs.forEach((d) => {
    const inp = document.getElementById(d.id);
    inp.oninput = () => {
      document.getElementById(d.id + "Val").textContent = inp.value;
      if (S.drawn.sustainability) debtSim();
    };
  });
}

function debtPathParams(d0p, rp, gp, pbp, fxSharep, realDepp, T) {
  const path = [];
  let d = d0p;
  const fxLeg = (fxSharep / 100) * (realDepp / 100);
  for (let t = 0; t <= T; t++) {
    path.push({ t, d: d * 100 });
    const effR = rp + fxLeg;
    d = d * (1 + effR) / (1 + gp) - pbp;
    if (d < 0) d = 0;
  }
  return path;
}

function debtSim() {
  const d0 = +$("#d0").value / 100;
  const r = +$("#r").value / 100;
  const g = +$("#g").value / 100;
  const pb = +$("#pb").value / 100;
  const fxShare = +$("#fxShare").value;
  const realDep = +$("#realDep").value;
  const T = +$("#T").value;
  const pbStar = d0 * ((r - g) / (1 + g)) * 100;
  const pbEl = $("#debtPbStar");
  if (pbEl)
    pbEl.innerHTML = `Debt-stabilizing primary balance <b>pb*</b> = d×(r−g)/(1+g) ≈ <b>${pbStar.toFixed(2)}%</b> of GDP at current sliders (holding FX valuation leg fixed).`;
  const path = debtPathParams(d0, r, g, pb, fxShare, realDep, T);
  const base = debtPathParams(
    DEBT_BASELINE.d0 / 100,
    DEBT_BASELINE.r / 100,
    DEBT_BASELINE.g / 100,
    DEBT_BASELINE.pb / 100,
    DEBT_BASELINE.fxShare,
    DEBT_BASELINE.realDep,
    T
  );
  plot(
    "debtOut",
    [
      { type: "scatter", mode: "lines", name: "Your settings", x: path.map((p) => p.t), y: path.map((p) => p.d), line: { color: css("--ac"), width: 3 } },
      { type: "scatter", mode: "lines", name: "Baseline defaults", x: base.map((p) => p.t), y: base.map((p) => p.d), line: { color: css("--mu"), width: 2, dash: "dot" } },
    ],
    { xaxis: { title: "Years" }, yaxis: { title: "Debt / GDP %" }, legend: { orientation: "h" } }
  );
}

function tabSustain() {
  debtSim();
  const rerPts = (S.data.rer_bilateral?.points || []).filter((p) => p.date >= "2017-01-01");
  if (rerPts.length) {
    plot("reerChart", [{ type: "scatter", name: "RER (Dec 2023=100)", x: rerPts.map((p) => p.date), y: rerPts.map((p) => p.value), line: { color: css("--ac2"), width: 2 } }], {
      shapes: [{ type: "line", x0: "2023-12-01", x1: "2023-12-01", y0: 0, y1: 1, yref: "paper", line: { dash: "dot", color: css("--mu") } }],
      yaxis: { title: "Index (100 = Dec 2023)" },
    });
  } else {
    const el = $("#reerChart");
    el.classList.remove("sk");
    el.innerHTML = '<p class="muted">Run scripts/fetch_data.py to build data/rer_bilateral.json.</p>';
  }
  renderPaymentsCalendar();
  const debtPts = S.data.imf.indicators?.GGXWDG_NGDP?.points || [];
  const caPts = S.data.imf.indicators?.BCA_NGDPD?.points || [];
  plot(
    "imfDebt",
    [
      { type: "scatter", name: "Gross debt % GDP", x: debtPts.map((p) => p.year), y: debtPts.map((p) => p.value), line: { color: css("--dn") } },
      { type: "scatter", name: "Current account % GDP", x: caPts.map((p) => p.year), y: caPts.map((p) => p.value), line: { color: css("--up") } },
    ],
    { hovermode: "x unified" }
  );
}

function tabSectoral() {
  const ex = indec("350.1_TOTAL_EXPONES__39");
  if (ex.length)
    plot("secTrade", [{ type: "scatter", x: ex.map((p) => p.date), y: ex.map((p) => p.value), line: { color: css("--ac") } }], {});
  $("#secEnergy").innerHTML =
    "<p><b>Vaca Muerta</b> (Neuquén) anchors gas and oil production growth; pipeline export capacity and domestic tariff policy determine FX earnings. <b>Lithium</b> (Jujuy/Catamarca salt flats) benefits from EV supply chains; provincial royalties and export taxes shape incentives.</p><p>RIGI aims to lock in long-term rules for multi-billion USD mining/energy projects; critics highlight environmental oversight and revenue sharing.</p>";
  $("#secAgro").innerHTML =
    "<p>Soy, corn, wheat, and beef remain core export earners; weather (La Niña/El Niño), retenciones debates, and freight/logistics costs drive swings. Real exchange rate level affects planting decisions with a lag.</p>";
}

function tabSocial() {
  const un = indec("42.3_EPH_PUNTUATAL_0_M_30");
  const povFact = (S.data.facts.items || []).find((f) => f.id === "poverty_indec_2024_h1");
  renderKpis($("#socKpis"), [
    kpi("Urban poverty (INDEC H1 2024)", povFact ? "52.9%" : "—", "31 agglomerates"),
    kpi("Extreme poverty (INDEC H1 2024)", povFact ? "18.1%" : "—", "documented press release"),
    kpi("Unemployment (latest)", un.length ? un.at(-1).value.toFixed(1) + "%" : "—", un.at(-1)?.date || ""),
  ]);
  if (un.length) plot("socUnemp", [{ type: "scatter", x: un.map((p) => p.date), y: un.map((p) => p.value), line: { color: css("--ac") } }], { shapes: mileiShape() });
  const gini = S.data.worldbank.indicators?.gini?.by_country?.ARG || [];
  plot(
    "socPov",
    [{ type: "scatter", name: "Gini (WB)", x: gini.map((p) => p.year), y: gini.map((p) => p.value), line: { color: "#a855f7" } }],
    {}
  );
  $("#socProse").innerHTML =
    "<p>Adjustment compresses real wages and social assistance while inflation pass-through fades with a lag. Poverty measured by INDEC jumped post-2023 shock; recovery depends on employment, indexed transfers, and real FX level.</p><p>Equity critiques stress regressive incidence of utility price normalization; defenders emphasize fiscal sustainability as precondition for durable job creation.</p>";
}

function tabRisks() {
  const risks = [
    { t: "Congress / coalitions", imp: "High", d: "Midterm 2025 reshapes veto players; reform speed may stall." },
    { t: "Social unrest", imp: "Medium", d: "Poverty and services prices elevate protest risk; police/labor dynamics matter." },
    { t: "Judicial blocks", imp: "Medium", d: "DNUs and privatizations face amparo challenges." },
    { t: "FX gap & cepos", imp: "High", d: "Incomplete unification stores pressure; reserves buffer finite." },
    { t: "Commodity shock", imp: "Medium", d: "Drought or price slump hits exports and fiscal revenues." },
    { t: "IMF program slippage", imp: "High", d: "Missed targets tighten financing; spillovers to bonds and FX." },
  ];
  $("#riskGrid").innerHTML = risks
    .map(
      (r) =>
        `<div class="card"><h3>${r.t}</h3><span class="badge">${r.imp}</span><p class="small">${r.d}</p></div>`
    )
    .join("");
  plot(
    "riskChart",
    [
      { type: "scatter", mode: "markers+text", x: [0.7, 0.5, 0.4, 0.8, 0.45, 0.75], y: [0.8, 0.55, 0.35, 0.85, 0.5, 0.7], text: risks.map((r) => r.t), textposition: "top center", marker: { size: 28, color: css("--ac") } },
    ],
    { xaxis: { title: "Likelihood (qualitative)", range: [0, 1] }, yaxis: { title: "Impact", range: [0, 1] }, showlegend: false }
  );
}

const CMP = [
  { code: "ISR", name: "Israel 1985", t0: 1985 },
  { code: "ARG", name: "Argentina 1991", t0: 1991 },
  { code: "BRA", name: "Brazil 1994", t0: 1994 },
  { code: "PER", name: "Peru 1990", t0: 1990 },
];

function renderPaymentsCalendar() {
  const pay = S.data.debt_payments?.items || [];
  const res = lastPt(pts("reserves_usd_mn"));
  const resBn = res ? res.value / 1000 : null;
  const documented = pay.filter((p) => p.documented && p.total_mn);
  const totalDoc = documented.reduce((s, p) => s + p.total_mn, 0);
  const rows = pay
    .map(
      (p) =>
        `<tr><td>${p.date}</td><td class="wrap">${p.type}</td><td>${p.total_mn != null ? p.total_mn.toLocaleString() : "—"}</td><td>${p.label || (p.documented ? "Documented" : "—")}</td><td class="wrap small"><a href="${p.source_url}" target="_blank" rel="noopener">source</a> · ${p.detail || ""}</td></tr>`
    )
    .join("");
  $("#payCal").innerHTML =
    `<p class="small muted">Sovereign FX debt service 2026–2027 (Bonares/Globales Jan 9 & Jul 9; IMF net service where noted). Reserves (gross, BCRA): <b>${resBn != null ? resBn.toFixed(1) + " bn USD" : "n/a"}</b> (${res?.date || ""}). Documented bond payments listed: <b>USD ${totalDoc.toLocaleString()} mn</b>.</p>` +
    `<div class="tablewrap pay-wrap"><table><thead><tr><th>Date</th><th>Instrument</th><th>USD mn</th><th>Status</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table></div>` +
    `<div id="payChart" class="chart sk" style="height:260px;margin-top:12px"></div>`;
  const chartPts = pay.filter((p) => p.total_mn && /^\d{4}-\d{2}-\d{2}/.test(p.date));
  const resMn = resBn ? Math.round(resBn * 1000) : null;
  plot(
    "payChart",
    [
      {
        type: "bar",
        name: "FX debt service",
        x: chartPts.map((p) => p.date),
        y: chartPts.map((p) => p.total_mn),
        marker: { color: chartPts.map((p) => (p.label === "Estimate" ? "#f59e0b" : css("--dn"))) },
      },
      ...(resMn
        ? [
            {
              type: "scatter",
              mode: "lines",
              name: `Gross reserves (${resMn.toLocaleString()} mn)`,
              x: chartPts.map((p) => p.date),
              y: chartPts.map(() => resMn),
              line: { color: css("--ac2"), dash: "dash", width: 2 },
            },
          ]
        : []),
    ],
    { yaxis: { title: "USD mn" }, barmode: "group", legend: { orientation: "h" } }
  );
}

function tabCmp() {
  const wb = S.data.worldbank.indicators?.inflation_cpi?.by_country || {};
  const traces = [];
  CMP.forEach((c, i) => {
    const s = wb[c.code] || [];
    const sub = s.filter((p) => p.year >= c.t0 && p.year <= c.t0 + 12 && p.value != null);
    if (!sub.length) return;
    let idx = 100;
    const path = sub.map((p, j) => {
      if (j) idx *= 1 + sub[j - 1].value / 100;
      return { y: p.year - c.t0, v: idx };
    });
    traces.push({
      type: "scatter",
      name: c.name,
      x: path.map((p) => p.y),
      y: path.map((p) => p.v),
      line: { width: 2, color: ["#5b8cff", "#22c55e", "#f59e0b", "#a855f7", "#22d3ee"][i % 5] },
    });
  });
  plot("cmpChart", traces, { xaxis: { title: "Years since t₀" }, yaxis: { title: "CPI index (t₀=100)" } });
  const rows = [
    ["Case", "Anchor", "FX regime", "Fiscal", "Outcome (short)"],
    ["Israel 1985", "Shekel stabilization + wage-price freeze", "Policy band", "Sharp cut", "Inflation collapsed; costs in financial repression"],
    ["Peru 1990", "Fujishock fiscal + monetary", "Float", "Surplus", "Hyperinflation ended; banking cleanup"],
    ["Brazil 1994", "Real plan", "Managed peg", "Adjustment", "Disinflation; 1999 float after Asia crisis"],
    ["Argentina 1991", "Convertibility", "Hard peg", "Privatization", "Disinflation; 2001 collapse"],
    ["Argentina 2023–", "Fiscal + crawl/band", "Managed", "Primary surplus goal", "Ongoing — see Results tab"],
  ];
  $("#cmpTable").innerHTML =
    "<thead><tr>" + rows[0].map((h) => `<th>${h}</th>`).join("") + "</tr></thead><tbody>" +
    rows.slice(1).map((r) => "<tr>" + r.map((c) => `<td class="wrap">${c}</td>`).join("") + "</tr>").join("") +
    "</tbody>";
}

const SCEN = {
  bear: { mu: 1, vol: 8, debt: 110, p: 0.25 },
  base: { mu: 3, vol: 5, debt: 85, p: 0.5 },
  bull: { mu: 5, vol: 3, debt: 65, p: 0.25 },
};

function initScenarios() {
  const box = $("#scenSliders");
  if (!box) return;
  box.innerHTML = ["bear", "base", "bull"]
    .map(
      (k) =>
        `<div class="vsl"><label>${k} probability <b id="p_${k}">${SCEN[k].p}</b></label><input type="range" id="p_${k}_in" min="0" max="100" value="${SCEN[k].p * 100}"></div>`
    )
    .join("");
  ["bear", "base", "bull"].forEach((k) => {
    document.getElementById(`p_${k}_in`).oninput = (e) => {
      SCEN[k].p = +e.target.value / 100;
      document.getElementById(`p_${k}`).textContent = SCEN[k].p.toFixed(2);
      runMC();
    };
  });
}

function runMC() {
  const n = 5000,
    h = 5;
  const tot = SCEN.bear.p + SCEN.base.p + SCEN.bull.p || 1;
  const probs = { bear: SCEN.bear.p / tot, base: SCEN.base.p / tot, bull: SCEN.bull.p / tot };
  const debtPaths = [],
    inflPaths = [];
  function draw(sc) {
    let d = sc.debt,
      infl = 40;
    const dp = [],
      ip = [];
    for (let t = 0; t <= h; t++) {
      dp.push(d);
      ip.push(infl);
      const shock = (Math.random() + Math.random() - 1) * sc.vol;
      infl = Math.max(5, infl * 0.75 + sc.mu + shock);
      d = d * (1 + (infl / 100) * 0.15) / (1 + sc.mu / 100) - 0.02 * 100;
    }
    return { dp, ip };
  }
  for (let i = 0; i < n; i++) {
    const u = Math.random();
    const sc = u < probs.bear ? SCEN.bear : u < probs.bear + probs.base ? SCEN.base : SCEN.bull;
    const { dp, ip } = draw(sc);
    debtPaths.push(dp);
    inflPaths.push(ip);
  }
  const years = [...Array(h + 1).keys()];
  const pct = (arr, p) => years.map((_, t) => {
    const col = arr.map((row) => row[t]).sort((a, b) => a - b);
    return col[Math.floor(p * col.length)];
  });
  plot(
    "mcDebt",
    [
      { type: "scatter", name: "p10", x: years, y: pct(debtPaths, 0.1), line: { width: 0 }, showlegend: false },
      { type: "scatter", name: "p90", x: years, y: pct(debtPaths, 0.9), fill: "tonexty", fillcolor: "rgba(91,140,255,.2)", line: { width: 0 }, showlegend: false },
      { type: "scatter", name: "median", x: years, y: pct(debtPaths, 0.5), line: { color: css("--ac"), width: 2 } },
    ],
    { yaxis: { title: "Debt / GDP (sim.)" } }
  );
  plot(
    "mcInfl",
    [
      { type: "scatter", x: years, y: pct(inflPaths, 0.1), line: { width: 0 }, showlegend: false },
      { type: "scatter", x: years, y: pct(inflPaths, 0.9), fill: "tonexty", fillcolor: "rgba(34,211,238,.2)", line: { width: 0 }, showlegend: false },
      { type: "scatter", name: "median inflation", x: years, y: pct(inflPaths, 0.5), line: { color: css("--ac2"), width: 2 } },
    ],
    { yaxis: { title: "CPI % y/y (sim.)" } }
  );
  const medDebtEnd = pct(debtPaths, 0.5)[h];
  const medInflEnd = pct(inflPaths, 0.5)[h];
  S.mcSummary = { probs, medDebtEnd, medInflEnd, horizon: h };
  $("#scenTbl").innerHTML = `<table><thead><tr><th>Scenario</th><th>Weight</th><th>Growth mean</th><th>Vol</th><th>Debt start</th></tr></thead><tbody>${["bear", "base", "bull"]
    .map((k) => `<tr><td>${k}</td><td>${(probs[k] * 100).toFixed(0)}%</td><td>${SCEN[k].mu}%</td><td>${SCEN[k].vol}</td><td>${SCEN[k].debt}%</td></tr>`)
    .join("")}</tbody></table><p class="small muted">Median simulated year ${h}: debt/GDP <b>${medDebtEnd.toFixed(1)}%</b> · inflation <b>${medInflEnd.toFixed(1)}%</b> (normalized weights).</p>`;
}

function tabScenarios() {
  runMC();
}

const SCORES = [
  { k: "Fiscal credibility", v: 6, t: "Primary surplus delivery improved vs. 2023 but relies on tight execution and one-offs." },
  { k: "Monetary anchor", v: 5, t: "Real rates positive; BCRA quasi-fiscal legacies and FX overlap complicate autonomy." },
  { k: "FX regime", v: 5, t: "Crawl/band adds predictability; parallel gap shows incomplete equilibrium." },
  { k: "Growth outlook", v: 5, t: "EMAE stabilization after deep 2024 recession; investment still cautious." },
  { k: "External sector", v: 6, t: "Energy/agro upside vs. IMF amortizations and thin reserves." },
  { k: "Social cohesion", v: 4, t: "High poverty/unemployment; reform fatigue after midterms." },
  { k: "Political capital", v: 5, t: "Executive–legislative balance shifted post-Oct 2025 elections." },
  { k: "Institutions", v: 4, t: "Rule-of-law and regulatory predictability remain contested." },
];

function tabScore() {
  $("#scoreBars").innerHTML = SCORES.map(
    (s) =>
      `<div><span>${s.k}</span><div class="sbar"><i style="width:${s.v * 10}%"></i></div><b>${s.v}</b></div>`
  ).join("");
  plot(
    "scoreRadar",
    [
      {
        type: "scatterpolar",
        r: SCORES.map((s) => s.v),
        theta: SCORES.map((s) => s.k),
        fill: "toself",
        fillcolor: "rgba(91,140,255,.25)",
        line: { color: css("--ac") },
      },
    ],
    { polar: { radialaxis: { range: [0, 10] } }, showlegend: false }
  );
  $("#scoreText").innerHTML = SCORES.map((s) => `<p><b>${s.k} (${s.v}/10):</b> ${s.t}</p>`).join("");
}

function tabConclusion() {
  $("#conclText").innerHTML =
    "<p>Argentina under President Milei is executing a high-front-loaded macro adjustment with meaningful fiscal improvement signals and falling monthly inflation from 2024 peaks, but still faces elevated debt, social hardship, and incomplete FX unification. Viability over the medium term hinges on sustaining primary surpluses, credible FX policy, and recovering investment—while managing IMF rollovers and political constraints after the 2025 legislative cycle.</p><p><span class='tag-estimate'>Author's view:</span> Base-case probability of stabilizing inflation into single digits by 2027 is material but not assured; tail risks include FX snap, program interruption, or growth undershoot.</p>";
  const src = S.data.sources || {};
  const lines = [];
  (src.ok || []).forEach((s) => lines.push(`✓ ${s.name} (${s.at})`));
  (src.failed || []).forEach((s) => lines.push(`✗ ${s.name}: ${s.detail}`));
  lines.push(`BCRA API v4 — ${S.data.bcra?.fetched_at || ""}`);
  lines.push(`INDEC / datos.gob.ar — ${S.data.indec?.fetched_at || ""}`);
  lines.push(`World Bank — ${S.data.worldbank?.fetched_at || ""}`);
  lines.push(`IMF DataMapper — ${S.data.imf?.fetched_at || ""}`);
  lines.push(`Bluelytics / argentinadatos — ${S.data.market?.fetched_at || ""}`);
  lines.push(`US CPI (FRED CPIAUCSL) — ${S.data.us_cpi?.fetched_at || ""}`);
  lines.push(`Bilateral RER — ${S.data.rer_bilateral?.fetched_at || ""}`);
  lines.push(`Debt payment calendar — ${S.data.debt_payments?.fetched_at || ""}`);
  lines.push(`Documented facts — data/facts.json (${S.data.facts?.fetched_at || ""})`);
  $("#sourcesList").innerHTML =
    "<ul>" +
    lines.map((l) => `<li>${l}</li>`).join("") +
    "</ul><p class='muted small'>CPI y/y KPI uses INDEC national index (12-month change), consistent with INDEC monthly CPI. IMF gross debt KPI uses latest WEO <em>actual</em> year; forward years are IMF projections.</p>";
}

load().catch((e) => {
  console.error(e);
  document.querySelector("main").innerHTML = `<div class="card"><h3>Could not load data</h3><p class="muted">${e}</p></div>`;
});
