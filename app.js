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
    body: "Successive augmentations and reviews (2022 program carried into Milei era; April 2025 Board action on expanded access ~USD 20bn horizon per IMF press).",
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
  const files = ["bcra", "indec", "worldbank", "imf", "market", "facts", "sources", "manifest"];
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
  if (location.hash) {
    const t = location.hash.slice(1);
    if ($(`[data-tab="${t}"]`)) S.tab = t;
  }
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
  const cpi = lastPt(pts("cpi_yoy_pct"));
  const risk = lastPt(S.data.market.country_risk?.points || []);
  const blue = blueSeries().at(-1);
  const items = [
    `Reserves ${r ? (r.value / 1000).toFixed(1) + "bn USD" : "n/a"}`,
    `FX official ${S.fx.toFixed(2)} ARS`,
    blue ? `Blue ${blue.value.toFixed(0)} ARS` : "",
    cpi ? `CPI y/y ${cpi.value.toFixed(1)}%` : "",
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
  const cpiY = lastPt(pts("cpi_yoy_pct"));
  const pol = lastPt(pts("policy_rate"));
  const risk = lastPt((S.data.market.country_risk?.points || []).map((p) => ({ date: p.fecha, value: p.valor })));
  const debt = lastPt((S.data.imf.indicators?.GGXWDG_NGDP?.points || []).map((p) => ({ date: String(p.year), value: p.value })));
  renderKpis($("#ovKpis"), [
    kpi("Intl. reserves", res ? res.value / 1000 : "—", res ? `USD bn · ${res.date}` : "", (v) => v.toFixed(1) + "bn"),
    kpi("CPI m/m (INDEC)", cpiM ? (cpiM.value * 100).toFixed(1) + "%" : "—", cpiM?.date || ""),
    kpi("CPI y/y (BCRA)", cpiY ? cpiY.value.toFixed(1) + "%" : "—", cpiY?.date || ""),
    kpi("Policy rate (BCRA)", pol ? pol.value.toFixed(1) + "%" : "—", pol?.date || ""),
    kpi("Country risk", risk ? risk.value + " bp" : "—", risk?.date || ""),
    kpi("Gross debt / GDP (IMF WEO)", debt ? debt.value.toFixed(0) + "%" : "—", debt?.date || "latest WEO"),
  ]);
  $("#ovSnap").innerHTML = `<p>President Javier Milei's administration (from <b>10 Dec 2023</b>) pursues fiscal consolidation, a restrictive monetary stance, and a managed FX transition toward liberalization, alongside structural reforms (DNU 70/2023, Ley Bases, RIGI) and continued IMF engagement.</p><p>This dashboard compares <b>pre- and post-inauguration</b> trajectories using only downloaded official statistics. Where labeled <span class="tag-estimate">Author's view</span>, content is analytical judgment—not a forecast from agencies.</p>`;
  const facts = (S.data.facts.items || []).slice(0, 8);
  $("#ovFacts").innerHTML = facts
    .map(
      (f) =>
        `<a class="ev" href="${f.source_url}" target="_blank" rel="noopener"><span class="muted">${f.date || ""}</span><span class="badge">${f.category}</span><span>${f.title}</span></a>`
    )
    .join("");
  const fx = officialSeries().slice(-400);
  const resv = pts("reserves_usd_mn").slice(-400);
  plot(
    "ovFxRes",
    [
      { type: "scatter", name: "FX wholesale/ref", x: fx.map((p) => p.date), y: fx.map((p) => p.value), yaxis: "y2", line: { color: css("--ac"), width: 2 } },
      { type: "scatter", name: "Reserves USD mn", x: resv.map((p) => p.date), y: resv.map((p) => p.value), line: { color: css("--ac2"), width: 2 } },
    ],
    {
      shapes: mileiShape(),
      yaxis: { title: "Reserves (USD mn)" },
      yaxis2: { overlaying: "y", side: "right", title: "ARS/USD" },
      hovermode: "x unified",
    }
  );
}

function mileiShape() {
  return [{ type: "line", x0: MILEI, x1: MILEI, y0: 0, y1: 1, yref: "paper", line: { dash: "dot", color: css("--mu") } }];
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
  const cy = pts("cpi_yoy_pct").filter((p) => p.date >= "2018-01-01");
  plot("resDisinf", [{ type: "scatter", x: cy.map((p) => p.date), y: cy.map((p) => p.value), line: { color: css("--ac"), width: 2 }, fill: "tozeroy" }], {
    shapes: mileiShape(),
    yaxis: { title: "% y/y" },
  });
}

function initDebtSim() {
  const box = $("#debtSliders");
  if (!box) return;
  const defs = [
    { id: "d0", l: "Initial debt / GDP", min: 20, max: 200, step: 1, v: 90 },
    { id: "r", l: "Real interest rate r (%)", min: -5, max: 25, step: 0.25, v: 8 },
    { id: "g", l: "Real GDP growth g (%)", min: -10, max: 10, step: 0.25, v: 2 },
    { id: "pb", l: "Primary balance / GDP (%)", min: -5, max: 8, step: 0.1, v: 2 },
    { id: "fx", l: "FX depreciation share (pp debt)", min: 0, max: 15, step: 0.25, v: 3 },
    { id: "T", l: "Horizon (years)", min: 5, max: 15, step: 1, v: 10 },
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

function debtSim() {
  const d0 = +$("#d0").value / 100;
  const r = +$("#r").value / 100;
  const g = +$("#g").value / 100;
  const pb = +$("#pb").value / 100;
  const fx = +$("#fx").value / 100;
  const T = +$("#T").value;
  const path = [];
  let d = d0;
  for (let t = 0; t <= T; t++) {
    path.push({ t, d: d * 100 });
    const effR = r + fx;
    d = d * (1 + effR) / (1 + g) - pb;
    if (d < 0) d = 0;
  }
  plot(
    "debtOut",
    [{ type: "scatter", mode: "lines+markers", x: path.map((p) => p.t), y: path.map((p) => p.d), line: { color: css("--ac"), width: 3 } }],
    { xaxis: { title: "Years" }, yaxis: { title: "Debt / GDP %" } }
  );
}

function tabSustain() {
  debtSim();
  const ipc = indec("145.3_INGNACNAL_DICI_M_15");
  const fx = officialSeries();
  const us = S.data.worldbank.indicators?.inflation_cpi?.by_country?.USA || [];
  if (ipc.length && fx.length) {
    const ipM = new Map(ipc.map((p) => [p.date.slice(0, 7), p.value]));
    const ptsR = fx
      .map((p) => {
        const k = p.date.slice(0, 7);
        const idx = ipM.get(k);
        return idx ? { date: p.date, value: p.value / idx } : null;
      })
      .filter(Boolean)
      .slice(-240);
    plot("reerChart", [{ type: "scatter", x: ptsR.map((p) => p.date), y: ptsR.map((p) => p.value), line: { color: css("--ac2") } }], {
      shapes: mileiShape(),
      yaxis: { title: "Nominal FX / CPI index (proxy)" },
    });
  } else {
    const el = $("#reerChart");
    el.classList.remove("sk");
    el.innerHTML = '<p class="muted">Insufficient CPI index series for REER proxy.</p>';
  }
  const pay = (S.data.facts.items || []).filter((f) => f.category === "external" || f.id.includes("debt"));
  $("#payCal").innerHTML =
    `<p class="small muted">Illustrative calendar — confirm amounts with Ministry of Economy debt reports.</p>` +
    pay
      .map(
        (f) =>
          `<div class="ev"><span class="muted">${f.date || ""}</span><span class="badge">${f.label || "documented"}</span><span>${f.title}: ${f.text.slice(0, 120)}…</span></div>`
      )
      .join("");
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
  { code: "ARG", name: "Argentina", t0: 1989 },
  { code: "ISR", name: "Israel", t0: 1985 },
  { code: "PER", name: "Peru", t0: 1990 },
  { code: "BRA", name: "Brazil", t0: 1994 },
  { code: "CHL", name: "Chile", t0: 1985 },
];

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
  $("#scenTbl").innerHTML = `<table><thead><tr><th>Scenario</th><th>Weight</th><th>Growth mean</th><th>Vol</th><th>Debt start</th></tr></thead><tbody>${["bear", "base", "bull"]
    .map((k) => `<tr><td>${k}</td><td>${(SCEN[k].p * 100).toFixed(0)}%</td><td>${SCEN[k].mu}%</td><td>${SCEN[k].vol}</td><td>${SCEN[k].debt}%</td></tr>`)
    .join("")}</tbody></table>`;
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
  lines.push(`Documented facts — data/facts.json`);
  $("#sourcesList").innerHTML = "<ul>" + lines.map((l) => `<li>${l}</li>`).join("") + "</ul>";
}

load().catch((e) => {
  console.error(e);
  document.querySelector("main").innerHTML = `<div class="card"><h3>Could not load data</h3><p class="muted">${e}</p></div>`;
});
