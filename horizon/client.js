/*
 * HORIZON — Program Schedule for PMS 300T
 * v1.0.0 · MANIFEST module · S4 Systems
 *
 * Single-file engine: data model, registries, Gantt, spreadsheet,
 * modals, drawer, audit log, CSV I/O, baseline/variance, AI assist,
 * localStorage persistence. No external runtime deps.
 */

(() => {
  "use strict";

  // ═══════════════════════════════════════════════════════════════
  //  Registries
  // ═══════════════════════════════════════════════════════════════

  // Milestone registry: code -> { label, color, shape }
  const MS = {
    CA:  { label: "Contract Award",       color: "var(--ms-ca)",  shape: "star",     order: 1 },
    SOC: { label: "Start of Construction",color: "var(--ms-soc)", shape: "triangle", order: 2 },
    LCH: { label: "Launch",               color: "var(--ms-lch)", shape: "diamond",  order: 3 },
    BT:  { label: "Builder's Trials",     color: "var(--ms-bt)",  shape: "diamond",  order: 4 },
    AT:  { label: "Acceptance Trials",    color: "var(--ms-at)",  shape: "diamond",  order: 5 },
    DEL: { label: "Delivery",             color: "var(--ms-del)", shape: "circle",   order: 6 },
  };

  // Acquisition / design event registry
  const ACQ = {
    SRR:  { label: "System Requirements Review", color: "var(--acq-srr)" },
    PDR:  { label: "Preliminary Design Review",  color: "var(--acq-pdr)" },
    CDR:  { label: "Critical Design Review",     color: "var(--acq-cdr)" },
    SDP:  { label: "Software Development Plan",  color: "var(--acq-sdp)" },
    IOTE: { label: "IOT&E",                      color: "var(--acq-iote)" },
  };

  // Craft type metadata
  const VT = {
    APL:  { label: "Auxiliary Personnel Lighter" },
    YRBM: { label: "Yard Repair Berthing & Messing" },
    YFB:  { label: "Yard Floating Barrier" },
    YTB:  { label: "Large Harbor Tug" },
  };

  // Status palette + label
  const ST = {
    "on-track":    { label: "On Track",    cls: "on-track" },
    "at-risk":     { label: "At Risk",     cls: "at-risk" },
    "delayed":     { label: "Delayed",     cls: "delayed" },
    "not-planned": { label: "Not Planned", cls: "not-planned" },
  };

  const FLEET_COLOR = { PACFLT: "#1d4ed8", USFF: "#166534" };

  // ═══════════════════════════════════════════════════════════════
  //  Demo data — PMS 300T
  // ═══════════════════════════════════════════════════════════════
  const DEMO_HULLS = [
    // APL
    { id:"apl-101", type:"APL", designation:"APL-101", fleet:"PACFLT", status:"on-track",
      ms:{CA:"2025-09",SOC:"2026-01",LCH:"2026-09",BT:"2027-03",AT:"2027-06",DEL:"2027-09"},
      acq:{SRR:"2025-04",PDR:"2025-07",CDR:"2025-11",SDP:"2025-12",IOTE:"2027-07"},
      sf:{builder:"Bollinger Shipyards",contract:"N00024-25-C-2101",uic:"55101",fy_approp:"FY25",pm_secnav:"L. Hayes",owld:"OWLD-A1",sail_tow:"Sail",arrival_dest:"Pearl Harbor"},
      notes:"Lead hull of refresh tranche." },
    { id:"apl-102", type:"APL", designation:"APL-102", fleet:"PACFLT", status:"on-track",
      ms:{CA:"2025-10",SOC:"2026-02",LCH:"2026-11",BT:"2027-05",AT:"2027-08",DEL:"2027-11"},
      acq:{SRR:"2025-05",PDR:"2025-08",CDR:"2025-12",SDP:"2026-01",IOTE:"2027-09"},
      sf:{builder:"Bollinger Shipyards",contract:"N00024-25-C-2102",uic:"55102",fy_approp:"FY25",pm_secnav:"L. Hayes",owld:"OWLD-A1",sail_tow:"Sail",arrival_dest:"Pearl Harbor"} },
    { id:"apl-103", type:"APL", designation:"APL-103", fleet:"USFF", status:"at-risk",
      ms:{CA:"2025-11",SOC:"2026-04",LCH:"2027-02",BT:"2027-08",AT:"2027-11",DEL:"2028-02"},
      acq:{SRR:"2025-06",PDR:"2025-09",CDR:"2026-02",SDP:"2026-02",IOTE:"2027-12"},
      sf:{builder:"VT Halter Marine",contract:"N00024-25-C-2103",uic:"55103",fy_approp:"FY26",pm_secnav:"L. Hayes",owld:"OWLD-A2",sail_tow:"Tow",arrival_dest:"Norfolk"} },
    { id:"apl-104", type:"APL", designation:"APL-104", fleet:"USFF", status:"delayed",
      ms:{CA:"2026-01",SOC:"2026-07",LCH:"2027-06",BT:"2027-12",AT:"2028-04",DEL:"2028-07"},
      acq:{SRR:"2025-08",PDR:"2025-11",CDR:"2026-04",SDP:"2026-05",IOTE:"2028-05"},
      sf:{builder:"VT Halter Marine",contract:"N00024-26-C-2104",uic:"55104",fy_approp:"FY26",pm_secnav:"L. Hayes",owld:"OWLD-A2",sail_tow:"Tow",arrival_dest:"Norfolk"},
      notes:"Funding profile slip; SOC pushed two quarters." },
    { id:"apl-105", type:"APL", designation:"APL-105", fleet:"PACFLT", status:"not-planned",
      ms:{CA:"",SOC:"",LCH:"",BT:"",AT:"",DEL:""},
      acq:{SRR:"",PDR:"",CDR:"",SDP:"",IOTE:""},
      sf:{builder:"",contract:"",uic:"55105",fy_approp:"FY27",pm_secnav:"L. Hayes"} },
    // YRBM
    { id:"yrbm-51", type:"YRBM", designation:"YRBM-51", fleet:"PACFLT", status:"on-track",
      ms:{CA:"2025-08",SOC:"2025-12",LCH:"2026-08",BT:"2027-02",AT:"2027-05",DEL:"2027-08"},
      acq:{SRR:"2025-03",PDR:"2025-06",CDR:"2025-10",SDP:"2025-11",IOTE:"2027-06"},
      sf:{builder:"Bollinger Shipyards",contract:"N00024-25-C-3051",uic:"55211",fy_approp:"FY25",pm_secnav:"M. Ortiz",owld:"OWLD-B1",sail_tow:"Tow",arrival_dest:"Pearl Harbor"} },
    { id:"yrbm-52", type:"YRBM", designation:"YRBM-52", fleet:"USFF", status:"at-risk",
      ms:{CA:"2025-09",SOC:"2026-03",LCH:"2027-01",BT:"2027-07",AT:"2027-10",DEL:"2028-01"},
      acq:{SRR:"2025-04",PDR:"2025-07",CDR:"2025-12",SDP:"2026-01",IOTE:"2027-11"},
      sf:{builder:"Bollinger Shipyards",contract:"N00024-25-C-3052",uic:"55212",fy_approp:"FY25",pm_secnav:"M. Ortiz",owld:"OWLD-B1",sail_tow:"Tow",arrival_dest:"Norfolk"} },
    { id:"yrbm-53", type:"YRBM", designation:"YRBM-53", fleet:"PACFLT", status:"on-track",
      ms:{CA:"2025-12",SOC:"2026-05",LCH:"2027-03",BT:"2027-09",AT:"2027-12",DEL:"2028-03"},
      acq:{SRR:"2025-07",PDR:"2025-10",CDR:"2026-03",SDP:"2026-04",IOTE:"2028-01"},
      sf:{builder:"VT Halter Marine",contract:"N00024-25-C-3053",uic:"55213",fy_approp:"FY26",pm_secnav:"M. Ortiz",owld:"OWLD-B2",sail_tow:"Sail",arrival_dest:"Pearl Harbor"} },
    { id:"yrbm-54", type:"YRBM", designation:"YRBM-54", fleet:"USFF", status:"not-planned",
      ms:{CA:"",SOC:"",LCH:"",BT:"",AT:"",DEL:""},
      acq:{SRR:"",PDR:"",CDR:"",SDP:"",IOTE:""},
      sf:{builder:"",contract:"",uic:"55214",fy_approp:"FY27",pm_secnav:"M. Ortiz"} },
    // YFB
    { id:"yfb-88", type:"YFB", designation:"YFB-88", fleet:"PACFLT", status:"on-track",
      ms:{CA:"2025-07",SOC:"2025-11",LCH:"2026-06",BT:"2026-11",AT:"2027-02",DEL:"2027-05"},
      acq:{SRR:"2025-02",PDR:"2025-05",CDR:"2025-08",SDP:"2025-09",IOTE:"2027-03"},
      sf:{builder:"Marine Group Boat Works",contract:"N00024-25-C-4088",uic:"55301",fy_approp:"FY25",pm_secnav:"R. Quinn",owld:"OWLD-C1",sail_tow:"Sail",arrival_dest:"Pearl Harbor"} },
    { id:"yfb-89", type:"YFB", designation:"YFB-89", fleet:"USFF", status:"at-risk",
      ms:{CA:"2025-10",SOC:"2026-03",LCH:"2026-11",BT:"2027-04",AT:"2027-07",DEL:"2027-10"},
      acq:{SRR:"2025-05",PDR:"2025-08",CDR:"2025-11",SDP:"2025-12",IOTE:"2027-08"},
      sf:{builder:"Marine Group Boat Works",contract:"N00024-25-C-4089",uic:"55302",fy_approp:"FY26",pm_secnav:"R. Quinn",owld:"OWLD-C1",sail_tow:"Sail",arrival_dest:"Norfolk"} },
    { id:"yfb-90", type:"YFB", designation:"YFB-90", fleet:"PACFLT", status:"not-planned",
      ms:{CA:"",SOC:"",LCH:"",BT:"",AT:"",DEL:""},
      acq:{SRR:"",PDR:"",CDR:"",SDP:"",IOTE:""},
      sf:{builder:"",contract:"",uic:"55303",fy_approp:"FY27",pm_secnav:"R. Quinn"} },
    // YTB
    { id:"ytb-810", type:"YTB", designation:"YTB-810", fleet:"PACFLT", status:"on-track",
      ms:{CA:"2025-06",SOC:"2025-10",LCH:"2026-05",BT:"2026-10",AT:"2027-01",DEL:"2027-04"},
      acq:{SRR:"2025-01",PDR:"2025-04",CDR:"2025-07",SDP:"2025-08",IOTE:"2027-02"},
      sf:{builder:"Eastern Shipbuilding",contract:"N00024-25-C-5810",uic:"55401",fy_approp:"FY25",pm_secnav:"D. Carter",owld:"OWLD-D1",sail_tow:"Sail",arrival_dest:"Pearl Harbor"} },
    { id:"ytb-811", type:"YTB", designation:"YTB-811", fleet:"PACFLT", status:"on-track",
      ms:{CA:"2025-07",SOC:"2025-11",LCH:"2026-07",BT:"2027-01",AT:"2027-04",DEL:"2027-07"},
      acq:{SRR:"2025-02",PDR:"2025-05",CDR:"2025-08",SDP:"2025-09",IOTE:"2027-05"},
      sf:{builder:"Eastern Shipbuilding",contract:"N00024-25-C-5811",uic:"55402",fy_approp:"FY25",pm_secnav:"D. Carter",owld:"OWLD-D1",sail_tow:"Sail",arrival_dest:"San Diego"} },
    { id:"ytb-812", type:"YTB", designation:"YTB-812", fleet:"USFF", status:"delayed",
      ms:{CA:"2025-09",SOC:"2026-04",LCH:"2027-04",BT:"2027-10",AT:"2028-02",DEL:"2028-05"},
      acq:{SRR:"2025-04",PDR:"2025-07",CDR:"2025-12",SDP:"2026-01",IOTE:"2028-03"},
      sf:{builder:"Eastern Shipbuilding",contract:"N00024-25-C-5812",uic:"55403",fy_approp:"FY26",pm_secnav:"D. Carter",owld:"OWLD-D2",sail_tow:"Tow",arrival_dest:"Norfolk"},
      notes:"Engine vendor slip — recovery plan in review." },
    { id:"ytb-813", type:"YTB", designation:"YTB-813", fleet:"USFF", status:"not-planned",
      ms:{CA:"",SOC:"",LCH:"",BT:"",AT:"",DEL:""},
      acq:{SRR:"",PDR:"",CDR:"",SDP:"",IOTE:""},
      sf:{builder:"",contract:"",uic:"55404",fy_approp:"FY27",pm_secnav:"D. Carter"} },
  ];

  // ═══════════════════════════════════════════════════════════════
  //  State
  // ═══════════════════════════════════════════════════════════════
  const STORAGE_KEY = "horizon_v1";
  const FY_MIN = 2024, FY_MAX = 2030;

  const state = {
    hulls: [],
    customMS: {},        // user-added milestone types
    baseline: null,      // { hullId: { msKey: dateStr } }
    auditLog: [],
    msVisible: { CA:true, SOC:true, LCH:true, BT:true, AT:true, DEL:true },
    filter: { craft: "", status: "all", search: "", fyStart: 2026, fyEnd: 2028 },
    activeNavView: "all",
    activeNavStatus: "all",
    zoom: 1.0,
    acqOpen: false,
    drawerOpen: false,
    drawerTab: "log",
    aiHistory: [],
    msEditCtx: null,     // { hullId, msKey }
    confirmCb: null,
    lastSavedAt: null,
  };

  // ═══════════════════════════════════════════════════════════════
  //  Persistence
  // ═══════════════════════════════════════════════════════════════
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { state.hulls = JSON.parse(JSON.stringify(DEMO_HULLS)); return; }
      const data = JSON.parse(raw);
      state.hulls    = data.hulls    || JSON.parse(JSON.stringify(DEMO_HULLS));
      state.customMS = data.customMS || {};
      state.baseline = data.baseline || null;
      state.auditLog = data.auditLog || [];
      state.msVisible = data.msVisible || state.msVisible;
      state.filter   = Object.assign(state.filter, data.filter || {});
      state.lastSavedAt = data.lastSavedAt || null;
    } catch (e) {
      console.warn("HORIZON: load failed, seeding demo data", e);
      state.hulls = JSON.parse(JSON.stringify(DEMO_HULLS));
    }
  }

  let saveTimer = null;
  function autoSave() {
    setSave("busy", "Saving…");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 700);
  }
  function saveNow() {
    try {
      state.lastSavedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        hulls:     state.hulls,
        customMS:  state.customMS,
        baseline:  state.baseline,
        auditLog:  state.auditLog,
        msVisible: state.msVisible,
        filter:    state.filter,
        lastSavedAt: state.lastSavedAt,
      }));
      setSave("ok", "Saved");
      const dt = new Date(state.lastSavedAt);
      $("#last-saved").textContent = "Saved " + dt.toLocaleTimeString();
    } catch (e) {
      setSave("err", "Save failed");
      toast("Save failed", true);
      console.error(e);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════════
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function uid(prefix) { return prefix + "-" + Math.random().toString(36).slice(2, 9); }

  function escapeHTML(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  function toast(msg, err = false) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.toggle("err", err);
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2600);
  }

  function setSave(s, label) {
    $("#save-dot").className = "save-dot " + s;
    $("#save-label").textContent = label;
  }

  function allMS() { return Object.assign({}, MS, state.customMS); }

  // Date helpers
  // Internal storage: "YYYY-MM" or "YYYY-MM-DD" or "".
  function parseDateInput(input) {
    if (!input) return "";
    const s = String(input).trim();
    if (!s || /^tbd$/i.test(s) || /^n\/?a$/i.test(s)) return "";
    // YYYY-MM-DD or YYYY-MM
    let m = s.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
    if (m) {
      const y = +m[1], mo = +m[2], d = m[3] ? +m[3] : null;
      if (mo >= 1 && mo <= 12) {
        const yy = String(y), mm = String(mo).padStart(2,"0");
        return d ? `${yy}-${mm}-${String(d).padStart(2,"0")}` : `${yy}-${mm}`;
      }
    }
    // MM/DD/YY or MM/DD/YYYY or M/YY
    m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (m) {
      const mo = +m[1], d = +m[2], y = m[3] ? +m[3] : new Date().getFullYear();
      const yy = y < 100 ? 2000 + y : y;
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        return `${yy}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      }
    }
    // FY26 Q2 / FY27Q3
    m = s.match(/^fy(\d{2,4})\s*q([1-4])$/i);
    if (m) {
      const fy = +m[1] < 100 ? 2000 + +m[1] : +m[1];
      const q = +m[2];
      // Federal FY: Q1=Oct-Dec (prev cal year), Q2=Jan-Mar, Q3=Apr-Jun, Q4=Jul-Sep
      const moMap = { 1: [10, fy - 1], 2: [1, fy], 3: [4, fy], 4: [7, fy] };
      const [mo, y] = moMap[q];
      return `${y}-${String(mo).padStart(2,"0")}`;
    }
    // FY26
    m = s.match(/^fy(\d{2,4})$/i);
    if (m) {
      const fy = +m[1] < 100 ? 2000 + +m[1] : +m[1];
      return `${fy - 1}-10`; // FY start = Oct of prior cal year
    }
    // Month name + year:  "May 2026", "may '26", "May-26"
    const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
    m = s.match(/^([a-z]{3,9})\s*[-,'\s]\s*'?(\d{2,4})$/i);
    if (m) {
      const idx = months.indexOf(m[1].slice(0,3).toLowerCase());
      const y = +m[2] < 100 ? 2000 + +m[2] : +m[2];
      if (idx >= 0) return `${y}-${String(idx + 1).padStart(2,"0")}`;
    }
    // Just "2027"
    m = s.match(/^(\d{4})$/);
    if (m) return `${m[1]}-01`;
    return ""; // unparseable -> clear
  }

  function fmtDate(d) {
    if (!d) return "—";
    const parts = d.split("-");
    if (parts.length === 2) {
      const y = +parts[0], mo = +parts[1];
      return monthAbbr(mo) + " " + y;
    }
    if (parts.length === 3) {
      const y = +parts[0], mo = +parts[1], dy = +parts[2];
      return monthAbbr(mo) + " " + dy + ", " + y;
    }
    return d;
  }
  function monthAbbr(m) {
    return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m-1] || "?";
  }
  // Calendar year + month -> federal fiscal year (Oct-Sep)
  function cyToFy(cy, cm) { return cm >= 10 ? cy + 1 : cy; }
  function dateToFy(d) {
    if (!d) return null;
    const [y, m] = d.split("-").map(Number);
    return cyToFy(y, m);
  }
  // Convert "YYYY-MM" or "YYYY-MM-DD" to fractional months since epoch (FY_MIN-Oct)
  // Used for Gantt x-positioning.
  function dateToMonths(d) {
    if (!d) return null;
    const parts = d.split("-").map(Number);
    const y = parts[0], m = parts[1], day = parts[2] || 15;
    const base = FY_MIN - 1; // Oct of (FY_MIN - 1) is FY_MIN start
    const monthsSinceBaseOct = (y - base) * 12 + (m - 10) + (day - 15) / 30;
    return monthsSinceBaseOct;
  }
  function diffDays(a, b) {
    if (!a || !b) return null;
    const da = new Date(a.length === 7 ? a + "-15" : a);
    const db = new Date(b.length === 7 ? b + "-15" : b);
    return Math.round((da - db) / 86400000);
  }

  // ═══════════════════════════════════════════════════════════════
  //  Audit log
  // ═══════════════════════════════════════════════════════════════
  function audit(category, action, detail) {
    const entry = {
      id: uid("a"),
      ts: new Date().toISOString(),
      category,
      action,
      detail: detail || "",
    };
    state.auditLog.unshift(entry);
    if (state.auditLog.length > 800) state.auditLog.length = 800;
    renderAuditList();
  }

  // ═══════════════════════════════════════════════════════════════
  //  Filters
  // ═══════════════════════════════════════════════════════════════
  function filteredHulls() {
    const q = state.filter.search.trim().toLowerCase();
    return state.hulls.filter((h) => {
      if (state.filter.craft && h.type !== state.filter.craft) return false;
      if (state.filter.status !== "all" && h.status !== state.filter.status) return false;
      if (q) {
        const blob = [
          h.designation, h.type, h.fleet, h.notes,
          h.sf && h.sf.builder, h.sf && h.sf.contract, h.sf && h.sf.uic,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  Renderers
  // ═══════════════════════════════════════════════════════════════
  function renderAll() {
    renderToolbar();
    renderKPIs();
    renderGantt();
    renderSheet();
    renderAcq();
    renderAuditList();
    renderContextMeta();
  }

  function renderContextMeta() {
    const view = state.filter.craft || "All Hulls";
    $("#ctx-meta").textContent = `PMS 300T · ${view} · FY${state.filter.fyStart - 2000}–FY${state.filter.fyEnd - 2000}`;
    $("#gantt-range").textContent = `FY${state.filter.fyStart - 2000} → FY${state.filter.fyEnd - 2000}`;
  }

  // ─── Toolbar (chips + FY selects + MS toggles) ─────────────────
  function renderToolbar() {
    // FY selects
    const fyStart = $("#filter-fy-start"), fyEnd = $("#filter-fy-end");
    if (!fyStart.options.length) {
      for (let y = FY_MIN; y <= FY_MAX; y++) {
        const opt = (sel) => { const o = document.createElement("option"); o.value = y; o.textContent = "FY" + (y - 2000); sel.appendChild(o); };
        opt(fyStart); opt(fyEnd);
      }
    }
    fyStart.value = state.filter.fyStart;
    fyEnd.value = state.filter.fyEnd;

    // Milestone toggle chips
    const wrap = $("#ms-toggles");
    if (!wrap.dataset.built) {
      wrap.dataset.built = "1";
      // keep label as first child
      Object.keys(MS).forEach((code) => {
        const b = document.createElement("button");
        b.className = "chip-btn active";
        b.textContent = code;
        b.dataset.ms = code;
        b.title = MS[code].label;
        b.style.borderColor = "transparent";
        b.style.background = MS[code].color;
        b.style.color = "#fff";
        b.addEventListener("click", () => {
          state.msVisible[code] = !state.msVisible[code];
          b.classList.toggle("active", state.msVisible[code]);
          b.style.opacity = state.msVisible[code] ? "1" : "0.35";
          renderGantt(); autoSave();
          audit("CONFIG", "Toggle milestone " + code, state.msVisible[code] ? "show" : "hide");
        });
        wrap.appendChild(b);
      });
    }

    $("#filter-search").value = state.filter.search;
    $("#filter-craft").value = state.filter.craft;
    $("#toggle-acq").classList.toggle("active", state.acqOpen);
    $("#zoom-label").textContent = Math.round(state.zoom * 100) + "%";
  }

  // ─── KPIs ──────────────────────────────────────────────────────
  function renderKPIs() {
    const hs = filteredHulls();
    let ok = 0, risk = 0, late = 0;
    hs.forEach((h) => {
      if (h.status === "on-track") ok++;
      else if (h.status === "at-risk") risk++;
      else if (h.status === "delayed") late++;
    });
    $("#kpi-total").textContent = hs.length;
    $("#kpi-ok").textContent = ok;
    $("#kpi-risk").textContent = risk;
    $("#kpi-late").textContent = late;
  }

  // ═══════════════════════════════════════════════════════════════
  //  Gantt — SVG, frozen left + scrollable right
  // ═══════════════════════════════════════════════════════════════
  const GP = {
    ROW_H: 32,
    HDR_H: 36,
    GRP_H: 22,
    LEFT_W: 200,
    FY_W_BASE: 220,
    PAD_X: 12,
  };

  function renderGantt() {
    const hulls = filteredHulls();
    $("#gantt-count").textContent = `${hulls.length} hull${hulls.length === 1 ? "" : "s"}`;

    // Group hulls by craft type for grouped layout
    const grouped = {};
    hulls.forEach((h) => { (grouped[h.type] = grouped[h.type] || []).push(h); });
    const groupOrder = ["APL","YRBM","YFB","YTB"].filter((g) => grouped[g] && grouped[g].length);

    // Compute total height
    let rowsBeforeAt = {};
    let cursor = 0;
    let totalRows = 0;
    groupOrder.forEach((g) => {
      rowsBeforeAt[g] = cursor;
      cursor += GP.GRP_H + grouped[g].length * GP.ROW_H;
      totalRows += grouped[g].length;
    });
    const totalH = cursor + 4;

    const fyCount = state.filter.fyEnd - state.filter.fyStart + 1;
    const fyW = Math.round(GP.FY_W_BASE * state.zoom);
    const rightW = fyW * fyCount;
    const monthW = fyW / 12;

    // Left SVG
    const leftSvg = $("#gantt-left-svg");
    leftSvg.setAttribute("width", GP.LEFT_W);
    leftSvg.setAttribute("height", totalH);
    let leftBuf = "";
    groupOrder.forEach((g) => {
      const y = rowsBeforeAt[g];
      leftBuf += `<rect class="gantt-group-bar" x="0" y="${y}" width="${GP.LEFT_W}" height="${GP.GRP_H}"></rect>`;
      leftBuf += `<text class="gantt-group-label" x="12" y="${y + 15}">${escapeHTML(g)} · ${VT[g].label}</text>`;
      grouped[g].forEach((h, i) => {
        const ry = y + GP.GRP_H + i * GP.ROW_H;
        leftBuf += `<rect class="gantt-row-stripe ${i % 2 ? "alt" : ""}" x="0" y="${ry}" width="${GP.LEFT_W}" height="${GP.ROW_H}"></rect>`;
        leftBuf += `<text class="gantt-row-name" x="12" y="${ry + 14}">${escapeHTML(h.designation)}</text>`;
        leftBuf += `<text class="gantt-row-fleet" x="12" y="${ry + 26}">${escapeHTML(h.fleet)} · ${escapeHTML(h.status.replace("-"," "))}</text>`;
        // Fleet dot
        const c = FLEET_COLOR[h.fleet] || "#888";
        leftBuf += `<circle cx="${GP.LEFT_W - 14}" cy="${ry + 17}" r="4" fill="${c}"></circle>`;
      });
    });
    leftSvg.innerHTML = leftBuf;

    // Right header (FY ticks)
    const rightHdr = $("#gantt-right-hdr");
    let hdrBuf = "";
    for (let i = 0; i < fyCount; i++) {
      const fy = state.filter.fyStart + i;
      hdrBuf += `<div style="flex:0 0 ${fyW}px;text-align:center;padding:0 8px;border-right:1px solid var(--border-subtle);font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.8px;color:var(--text-2);">FY${fy - 2000}</div>`;
    }
    rightHdr.innerHTML = hdrBuf;
    rightHdr.style.display = "flex";
    rightHdr.style.minWidth = rightW + "px";

    // Right SVG
    const rightSvg = $("#gantt-right-svg");
    rightSvg.setAttribute("width", rightW);
    rightSvg.setAttribute("height", totalH);
    let rightBuf = "";

    // FY column shading + quarter ticks
    for (let i = 0; i < fyCount; i++) {
      const x = i * fyW;
      if (i % 2) rightBuf += `<rect x="${x}" y="0" width="${fyW}" height="${totalH}" fill="#fdfcfa"></rect>`;
      rightBuf += `<line class="gantt-fy-tick" x1="${x}" y1="0" x2="${x}" y2="${totalH}"></line>`;
      for (let q = 1; q < 4; q++) {
        const qx = x + (q * fyW) / 4;
        rightBuf += `<line x1="${qx}" y1="0" x2="${qx}" y2="${totalH}" stroke="var(--border-subtle)" stroke-width="0.5" stroke-dasharray="2 4"></line>`;
      }
    }
    // Today line
    const now = new Date();
    const nowMonths = dateToMonths(now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0"));
    const baseFyMonths = (state.filter.fyStart - FY_MIN) * 12; // months from epoch to FY range start
    const baseMonthOffset = -1; // FY epoch starts at Oct of FY_MIN - 1
    const nowX = ((nowMonths - baseFyMonths) - baseMonthOffset) * monthW;
    if (nowX >= 0 && nowX <= rightW) {
      rightBuf += `<line class="gantt-now-line" x1="${nowX}" y1="0" x2="${nowX}" y2="${totalH}"></line>`;
      rightBuf += `<text class="gantt-now-label" x="${nowX + 4}" y="12">NOW</text>`;
    }

    // Rows
    groupOrder.forEach((g) => {
      const y = rowsBeforeAt[g];
      rightBuf += `<rect class="gantt-group-bar" x="0" y="${y}" width="${rightW}" height="${GP.GRP_H}"></rect>`;
      grouped[g].forEach((h, i) => {
        const ry = y + GP.GRP_H + i * GP.ROW_H;
        rightBuf += `<rect class="gantt-row-stripe ${i % 2 ? "alt" : ""}" x="0" y="${ry}" width="${rightW}" height="${GP.ROW_H}"></rect>`;

        // CA -> DEL span (variance/timeline bar)
        const caM = dateToMonths(h.ms.CA);
        const delM = dateToMonths(h.ms.DEL);
        if (caM != null && delM != null) {
          const x1 = ((caM - baseFyMonths) - baseMonthOffset) * monthW;
          const x2 = ((delM - baseFyMonths) - baseMonthOffset) * monthW;
          const w = Math.max(2, x2 - x1);
          const spanColor = h.status === "delayed" ? "var(--error)" :
                            h.status === "at-risk" ? "var(--warning)" :
                            h.status === "on-track" ? "var(--accent)" : "var(--text-5)";
          rightBuf += `<rect class="gantt-span" x="${x1}" y="${ry + 14}" width="${w}" height="4" fill="${spanColor}" rx="0"></rect>`;
        }

        // Milestone symbols
        Object.keys(allMS()).forEach((code) => {
          if (!state.msVisible[code] && MS[code]) return; // custom always visible
          const date = h.ms[code];
          if (!date) return;
          const dm = dateToMonths(date);
          if (dm == null) return;
          const cx = ((dm - baseFyMonths) - baseMonthOffset) * monthW;
          if (cx < -10 || cx > rightW + 10) return;
          const cy = ry + GP.ROW_H / 2;
          const m = allMS()[code];
          rightBuf += symbolSVG(m.shape, cx, cy, m.color, code, h.id);
        });

        // Baseline variance ticks (small grey diamonds at original baseline date if differs)
        if (state.baseline && state.baseline[h.id]) {
          Object.keys(state.baseline[h.id]).forEach((code) => {
            const b = state.baseline[h.id][code];
            const cur = h.ms[code];
            if (b && cur && b !== cur) {
              const bm = dateToMonths(b);
              if (bm == null) return;
              const bx = ((bm - baseFyMonths) - baseMonthOffset) * monthW;
              rightBuf += `<rect x="${bx - 2}" y="${ry + 6}" width="4" height="${GP.ROW_H - 12}" fill="var(--text-5)" opacity="0.5"></rect>`;
            }
          });
        }
      });
    });

    rightSvg.innerHTML = rightBuf;

    // Attach click handlers to milestone symbols
    $$("g[data-ms-symbol]", rightSvg).forEach((g) => {
      g.addEventListener("click", (e) => {
        e.stopPropagation();
        openMSEditor(g.dataset.hullId, g.dataset.msCode);
      });
    });

    // Render legend
    renderLegend();
  }

  function symbolSVG(shape, cx, cy, color, code, hullId) {
    const r = 7;
    const tag = `data-ms-symbol="1" data-hull-id="${hullId}" data-ms-code="${code}"`;
    let body = "";
    if (shape === "star") {
      const pts = starPoints(cx, cy, r, r * 0.45, 5);
      body = `<polygon points="${pts}" fill="${color}" stroke="#fff" stroke-width="1.5"></polygon>`;
    } else if (shape === "triangle") {
      const pts = `${cx},${cy - r} ${cx + r},${cy + r} ${cx - r},${cy + r}`;
      body = `<polygon points="${pts}" fill="${color}" stroke="#fff" stroke-width="1.5"></polygon>`;
    } else if (shape === "diamond") {
      const pts = `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
      body = `<polygon points="${pts}" fill="${color}" stroke="#fff" stroke-width="1.5"></polygon>`;
    } else if (shape === "circle") {
      body = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="#fff" stroke-width="1.5"></circle>`;
    } else if (shape === "square") {
      body = `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" fill="${color}" stroke="#fff" stroke-width="1.5"></rect>`;
    } else {
      body = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="#fff" stroke-width="1.5"></circle>`;
    }
    return `<g class="gantt-symbol" ${tag}><title>${escapeHTML(code)}</title>${body}</g>`;
  }
  function starPoints(cx, cy, rOut, rIn, n) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 === 0 ? rOut : rIn;
      const a = (Math.PI / n) * i - Math.PI / 2;
      pts.push((cx + r * Math.cos(a)).toFixed(2) + "," + (cy + r * Math.sin(a)).toFixed(2));
    }
    return pts.join(" ");
  }

  function renderLegend() {
    const wrap = $("#gantt-legend");
    let buf = "";
    Object.keys(MS).forEach((code) => {
      const m = MS[code];
      buf += `<span class="li"><svg width="14" height="14" style="vertical-align:middle">${symbolSVG(m.shape, 7, 7, m.color, code, "_")}</svg> ${code} · ${m.label}</span>`;
    });
    Object.keys(state.customMS).forEach((code) => {
      const m = state.customMS[code];
      buf += `<span class="li"><svg width="14" height="14" style="vertical-align:middle">${symbolSVG(m.shape, 7, 7, m.color, code, "_")}</svg> ${code} · ${m.label}</span>`;
    });
    buf += `<span class="li" style="margin-left:auto"><svg width="20" height="6"><rect width="20" height="4" y="1" fill="var(--accent)" opacity="0.55"></rect></svg> CA→DEL span</span>`;
    buf += `<span class="li"><span style="display:inline-block;width:8px;height:8px;background:${FLEET_COLOR.PACFLT};border-radius:50%"></span>PACFLT</span>`;
    buf += `<span class="li"><span style="display:inline-block;width:8px;height:8px;background:${FLEET_COLOR.USFF};border-radius:50%"></span>USFF</span>`;
    buf += `<span class="li"><span style="display:inline-block;width:14px;height:0;border-top:1.5px dashed var(--destructive)"></span>NOW</span>`;
    wrap.innerHTML = buf;
  }

  // ═══════════════════════════════════════════════════════════════
  //  Spreadsheet
  // ═══════════════════════════════════════════════════════════════
  const SFIELDS_VISIBLE = [
    { key: "builder",  label: "Builder" },
    { key: "contract", label: "Contract #" },
    { key: "uic",      label: "UIC" },
  ];

  function renderSheet() {
    const hulls = filteredHulls();
    $("#sheet-count").textContent = `${hulls.length} row${hulls.length === 1 ? "" : "s"}`;
    if (state.baseline) {
      const bDate = new Date(state.baseline._setAt || Date.now());
      $("#baseline-meta").textContent = "Baseline " + bDate.toLocaleDateString();
    } else {
      $("#baseline-meta").textContent = "No baseline set";
    }

    const msKeys = Object.keys(allMS());
    let h = `<thead><tr>
      <th>Hull</th>
      <th>Type</th>
      <th>Fleet</th>
      <th>Status</th>`;
    msKeys.forEach((k) => { h += `<th>${k}</th>`; });
    SFIELDS_VISIBLE.forEach((f) => { h += `<th>${f.label}</th>`; });
    h += `<th></th></tr></thead><tbody>`;

    hulls.forEach((hull) => {
      h += `<tr class="dr" data-hull-id="${hull.id}">`;
      h += `<td class="editable" data-edit-field="designation">${escapeHTML(hull.designation)}</td>`;
      h += `<td><span class="chip craft">${escapeHTML(hull.type)}</span></td>`;
      h += `<td class="editable" data-edit-field="fleet" style="color:${FLEET_COLOR[hull.fleet]||"var(--text-1)"}">${escapeHTML(hull.fleet)}</td>`;
      h += `<td class="editable" data-edit-field="status"><span class="chip ${ST[hull.status].cls}">${escapeHTML(ST[hull.status].label)}</span></td>`;
      msKeys.forEach((k) => {
        const date = hull.ms[k] || "";
        const baseline = state.baseline && state.baseline[hull.id] && state.baseline[hull.id][k];
        let delta = "";
        let cls = "editable";
        if (!date) cls += " empty-date";
        if (hull.complete && hull.complete[k]) cls += " complete";
        if (baseline && date && baseline !== date) {
          const dd = diffDays(date, baseline);
          if (dd != null && dd !== 0) {
            delta = `<span style="font-family:'IBM Plex Mono',monospace;font-size:9px;margin-left:5px;color:${dd > 0 ? "var(--error)" : "var(--success)"}">${dd > 0 ? "+" : ""}${dd}d</span>`;
          }
        }
        h += `<td class="${cls}" data-edit-ms="${k}">${escapeHTML(fmtDate(date))}${delta}</td>`;
      });
      SFIELDS_VISIBLE.forEach((f) => {
        const v = (hull.sf && hull.sf[f.key]) || "";
        h += `<td class="editable" data-edit-sf="${f.key}">${escapeHTML(v) || '<span style="color:var(--text-5)">—</span>'}</td>`;
      });
      h += `<td class="no-pad" style="text-align:right"><button class="btn tiny outline row-del" data-del="${hull.id}">Delete</button></td>`;
      h += `</tr>`;
    });
    h += `</tbody>`;
    $("#sheet").innerHTML = h;
  }

  function renderAcq() {
    $("#acq-card").classList.toggle("open", state.acqOpen);
    if (!state.acqOpen) return;
    const hulls = filteredHulls();
    const codes = Object.keys(ACQ);
    let h = `<thead><tr><th>Hull</th><th>Type</th>`;
    codes.forEach((c) => { h += `<th>${c}</th>`; });
    h += `</tr></thead><tbody>`;
    hulls.forEach((hull) => {
      h += `<tr class="dr"><td>${escapeHTML(hull.designation)}</td><td><span class="chip craft">${escapeHTML(hull.type)}</span></td>`;
      codes.forEach((c) => {
        const d = hull.acq && hull.acq[c];
        const cls = d ? "editable" : "editable empty-date";
        h += `<td class="${cls}" data-acq="${c}" data-hull-id="${hull.id}">${escapeHTML(fmtDate(d))}</td>`;
      });
      h += `</tr>`;
    });
    h += `</tbody>`;
    $("#acq-table").innerHTML = h;
  }

  // ═══════════════════════════════════════════════════════════════
  //  Inline cell editing
  // ═══════════════════════════════════════════════════════════════
  function getHull(id) { return state.hulls.find((h) => h.id === id); }

  function startInlineEdit(td, hull, field) {
    if (field === "designation") {
      const input = document.createElement("input");
      input.className = "inp";
      input.value = hull.designation;
      input.style.width = "100%";
      td.innerHTML = "";
      td.appendChild(input);
      input.focus(); input.select();
      const commit = () => {
        const v = input.value.trim();
        if (v && v !== hull.designation) {
          audit("HULL", "Rename hull", `${hull.designation} → ${v}`);
          hull.designation = v;
          autoSave();
        }
        renderAll();
      };
      input.addEventListener("blur", commit);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") renderAll();
      });
    } else if (field === "fleet" || field === "status") {
      const sel = document.createElement("select");
      sel.className = "sel";
      const options = field === "fleet" ? ["PACFLT","USFF"] : Object.keys(ST);
      options.forEach((o) => {
        const opt = document.createElement("option");
        opt.value = o; opt.textContent = field === "status" ? ST[o].label : o;
        if (hull[field] === o) opt.selected = true;
        sel.appendChild(opt);
      });
      td.innerHTML = "";
      td.appendChild(sel);
      sel.focus();
      sel.addEventListener("change", () => {
        const v = sel.value;
        if (v !== hull[field]) {
          audit("HULL", "Edit " + field, `${hull.designation}: ${hull[field]} → ${v}`);
          hull[field] = v;
          autoSave();
        }
        renderAll();
      });
      sel.addEventListener("blur", () => renderAll());
    }
  }

  function startSFEdit(td, hull, key) {
    const cur = (hull.sf && hull.sf[key]) || "";
    const input = document.createElement("input");
    input.className = "inp";
    input.value = cur;
    input.style.width = "100%";
    td.innerHTML = "";
    td.appendChild(input);
    input.focus(); input.select();
    const commit = () => {
      const v = input.value.trim();
      if (v !== cur) {
        hull.sf = hull.sf || {};
        hull.sf[key] = v;
        audit("SFIELD", `Edit ${key}`, `${hull.designation}: "${cur}" → "${v}"`);
        autoSave();
      }
      renderAll();
    };
    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") commit();
      if (e.key === "Escape") renderAll();
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  Milestone edit modal
  // ═══════════════════════════════════════════════════════════════
  function openMSEditor(hullId, msKey, isAcq = false) {
    const hull = getHull(hullId);
    if (!hull) return;
    state.msEditCtx = { hullId, msKey, isAcq };
    const m = isAcq ? ACQ[msKey] : allMS()[msKey];
    $("#ms-modal-title").textContent = `${hull.designation} — ${msKey} · ${m.label}`;
    const bucket = isAcq ? hull.acq : hull.ms;
    const cur = (bucket && bucket[msKey]) || "";
    const parts = cur.split("-");
    $("#ms-date-input").value = cur ? (parts.length === 3 ? cur : `${monthAbbr(+parts[1])} ${parts[0]}`) : "";
    $("#ms-day-input").value = parts[2] || "";
    $("#ms-complete-input").value = (hull.complete && hull.complete[msKey]) ? "1" : "0";
    $("#ms-note-input").value = "";
    $("#ms-mbg").classList.add("open");
    setTimeout(() => $("#ms-date-input").focus(), 50);
  }
  function closeMSEditor() { $("#ms-mbg").classList.remove("open"); state.msEditCtx = null; }

  function applyMSEdit() {
    const ctx = state.msEditCtx;
    if (!ctx) return;
    const hull = getHull(ctx.hullId);
    if (!hull) return;
    const bucket = ctx.isAcq ? (hull.acq = hull.acq || {}) : (hull.ms = hull.ms || {});
    const oldVal = bucket[ctx.msKey] || "";
    const raw = $("#ms-date-input").value.trim();
    const day = $("#ms-day-input").value.trim();
    let val = parseDateInput(raw);
    if (val && day && val.length === 7) {
      const d = +day;
      if (d >= 1 && d <= 31) val = `${val}-${String(d).padStart(2,"0")}`;
    }
    bucket[ctx.msKey] = val;

    if (!ctx.isAcq) {
      hull.complete = hull.complete || {};
      hull.complete[ctx.msKey] = $("#ms-complete-input").value === "1";
    }
    const note = $("#ms-note-input").value.trim();
    audit(ctx.isAcq ? "ACQ" : "SCHEDULE", `${hull.designation}.${ctx.msKey}`,
      `${oldVal || "(empty)"} → ${val || "(cleared)"}${note ? " · " + note : ""}`);
    autoSave();
    closeMSEditor();
    renderAll();
  }
  function clearMSEdit() {
    const ctx = state.msEditCtx;
    if (!ctx) return;
    const hull = getHull(ctx.hullId);
    const bucket = ctx.isAcq ? hull.acq : hull.ms;
    const oldVal = bucket[ctx.msKey] || "";
    bucket[ctx.msKey] = "";
    if (!ctx.isAcq && hull.complete) hull.complete[ctx.msKey] = false;
    audit(ctx.isAcq ? "ACQ" : "SCHEDULE", `${hull.designation}.${ctx.msKey}`, `${oldVal} → (cleared)`);
    autoSave();
    closeMSEditor();
    renderAll();
  }

  // ═══════════════════════════════════════════════════════════════
  //  Add hull / add milestone modals
  // ═══════════════════════════════════════════════════════════════
  function openAddHull() { $("#hull-mbg").classList.add("open"); setTimeout(() => $("#hull-designation").focus(), 50); }
  function closeAddHull() { $("#hull-mbg").classList.remove("open"); }
  function saveAddHull() {
    const designation = $("#hull-designation").value.trim();
    if (!designation) { toast("Designation required", true); return; }
    const type = $("#hull-type").value;
    const fleet = $("#hull-fleet").value;
    const status = $("#hull-status").value;
    const builder = $("#hull-builder").value.trim();
    const contract = $("#hull-contract").value.trim();
    const newHull = {
      id: uid(type.toLowerCase()),
      type, designation, fleet, status,
      ms: { CA:"", SOC:"", LCH:"", BT:"", AT:"", DEL:"" },
      acq: { SRR:"", PDR:"", CDR:"", SDP:"", IOTE:"" },
      complete: {},
      sf: { builder, contract, uic:"", fy_approp:"" },
    };
    state.hulls.push(newHull);
    audit("HULL", "Add hull", `${designation} (${type}, ${fleet})`);
    closeAddHull();
    ["hull-designation","hull-builder","hull-contract"].forEach((id) => { $("#" + id).value = ""; });
    autoSave();
    renderAll();
    toast("Hull added");
  }

  function openAddMS() { $("#addms-mbg").classList.add("open"); setTimeout(() => $("#addms-code").focus(), 50); }
  function closeAddMS() { $("#addms-mbg").classList.remove("open"); }
  function saveAddMS() {
    const code = $("#addms-code").value.trim().toUpperCase();
    const label = $("#addms-label").value.trim();
    const shape = $("#addms-shape").value;
    const color = $("#addms-color").value;
    if (!code || !label) { toast("Code and label required", true); return; }
    if (MS[code] || state.customMS[code]) { toast("Code already exists", true); return; }
    state.customMS[code] = { label, color, shape, order: 100 };
    state.msVisible[code] = true;
    state.hulls.forEach((h) => { h.ms = h.ms || {}; if (!(code in h.ms)) h.ms[code] = ""; });
    audit("CONFIG", "Add milestone type", `${code} · ${label}`);
    closeAddMS();
    autoSave();
    // Need to rebuild MS toggle chips
    const wrap = $("#ms-toggles");
    const b = document.createElement("button");
    b.className = "chip-btn active";
    b.textContent = code;
    b.dataset.ms = code;
    b.title = label;
    b.style.borderColor = "transparent";
    b.style.background = color;
    b.style.color = "#fff";
    b.addEventListener("click", () => {
      state.msVisible[code] = !state.msVisible[code];
      b.classList.toggle("active", state.msVisible[code]);
      b.style.opacity = state.msVisible[code] ? "1" : "0.35";
      renderGantt(); autoSave();
    });
    wrap.appendChild(b);
    renderAll();
    toast("Milestone added");
  }

  // ═══════════════════════════════════════════════════════════════
  //  Confirm modal
  // ═══════════════════════════════════════════════════════════════
  function confirmDialog(title, msg, cb) {
    $("#confirm-title").textContent = title;
    $("#confirm-msg").textContent = msg;
    state.confirmCb = cb;
    $("#confirm-mbg").classList.add("open");
  }

  // ═══════════════════════════════════════════════════════════════
  //  Drawer (audit + AI)
  // ═══════════════════════════════════════════════════════════════
  function openDrawer(tab) {
    state.drawerOpen = true;
    if (tab) state.drawerTab = tab;
    $("#drawer").classList.add("open");
    $("#drawer-title").textContent = state.drawerTab === "log" ? "Audit Log" : "AI Assist";
    $$(".drawer-tab").forEach((b) => b.classList.toggle("active", b.dataset.pane === state.drawerTab));
    $$(".drawer-pane").forEach((p) => p.classList.toggle("active", p.dataset.pane === state.drawerTab));
  }
  function closeDrawer() { state.drawerOpen = false; $("#drawer").classList.remove("open"); }

  function renderAuditList() {
    const wrap = $("#audit-list");
    if (!wrap) return;
    const q = ($("#audit-search").value || "").toLowerCase();
    const list = state.auditLog.filter((e) => !q ||
      (e.action + " " + e.detail + " " + e.category).toLowerCase().includes(q));
    if (list.length === 0) {
      wrap.innerHTML = `<div style="color:var(--text-4);font-family:'IBM Plex Mono',monospace;font-size:11px;padding:14px 0;text-align:center">No entries.</div>`;
      return;
    }
    wrap.innerHTML = list.slice(0, 200).map((e) => {
      const dt = new Date(e.ts);
      return `<div class="audit-entry">
        <div class="ae-hd"><span>${dt.toLocaleString()}</span><span class="ae-cat">${escapeHTML(e.category)}</span></div>
        <div class="ae-action">${escapeHTML(e.action)}</div>
        ${e.detail ? `<div class="ae-detail">${escapeHTML(e.detail)}</div>` : ""}
      </div>`;
    }).join("");
  }

  function exportAuditCSV() {
    const lines = ["ts,category,action,detail"];
    state.auditLog.forEach((e) => {
      lines.push([e.ts, e.category, e.action, e.detail].map(csvEsc).join(","));
    });
    downloadCSV("horizon_audit_log.csv", lines.join("\n"));
    audit("EXPORT", "Audit CSV exported", `${state.auditLog.length} entries`);
  }

  // ═══════════════════════════════════════════════════════════════
  //  AI Assist (rule-based, no network)
  // ═══════════════════════════════════════════════════════════════
  function aiBubble(who, text) {
    state.aiHistory.push({ who, text });
    const wrap = $("#ai-log");
    const div = document.createElement("div");
    div.className = "ai-msg " + (who === "user" ? "user" : "bot");
    div.innerHTML = `<span class="who">${who === "user" ? "You" : "HORIZON"}</span>${renderMD(text)}`;
    wrap.appendChild(div);
    wrap.scrollTop = wrap.scrollHeight;
  }

  function renderMD(src) {
    let out = escapeHTML(src);
    out = out.replace(/```([\s\S]*?)```/g, (_m, b) => `<pre style="background:var(--surface-1);padding:8px;border:1px solid var(--border-subtle);font-family:'IBM Plex Mono',monospace;font-size:11px;margin:6px 0">${b}</pre>`);
    out = out.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    return out.replace(/\n/g, "<br>");
  }

  function aiAnswer(q) {
    const text = q.trim().toLowerCase();
    if (!text) return;
    aiBubble("user", q);

    // hull lookup
    const hullMatch = text.match(/\b(apl|yrbm|yfb|ytb)[- ]?(\d{2,4})\b/);
    if (hullMatch) {
      const designation = (hullMatch[1] + "-" + hullMatch[2]).toUpperCase();
      const hull = state.hulls.find((h) => h.designation.toUpperCase() === designation);
      if (hull) {
        const msLines = Object.keys(MS).map((k) => `- \`${k}\` — ${fmtDate(hull.ms[k])}`).join("\n");
        const stChip = ST[hull.status].label;
        aiBubble("bot",
          `**${hull.designation}** · ${hull.type} · ${hull.fleet}\n` +
          `Status: \`${stChip.toUpperCase()}\`\n\n` +
          msLines +
          (hull.notes ? `\n\n_${hull.notes}_` : ""));
        return;
      }
      aiBubble("bot", `Hull \`${designation}\` not in pipeline.`);
      return;
    }

    if (/at[- ]?risk|risk/.test(text)) {
      const list = state.hulls.filter((h) => h.status === "at-risk");
      if (!list.length) { aiBubble("bot", "No hulls currently at risk."); return; }
      aiBubble("bot", `**${list.length} hull(s) at risk:**\n` + list.map((h) => `- \`${h.designation}\` · ${h.type} · next: ${nextMS(h)}`).join("\n"));
      return;
    }
    if (/overdue|delayed|behind/.test(text)) {
      const list = state.hulls.filter((h) => h.status === "delayed");
      if (!list.length) { aiBubble("bot", "No hulls currently delayed."); return; }
      aiBubble("bot", `**${list.length} hull(s) delayed:**\n` + list.map((h) => `- \`${h.designation}\` · ${h.type} · next: ${nextMS(h)}`).join("\n"));
      return;
    }
    if (/next (delivery|del)/.test(text) || /upcoming/.test(text)) {
      const upcoming = state.hulls.filter((h) => h.ms.DEL).slice().sort((a, b) => a.ms.DEL.localeCompare(b.ms.DEL)).slice(0, 5);
      aiBubble("bot", `**Next 5 deliveries:**\n` + upcoming.map((h) => `- \`${h.designation}\` · ${fmtDate(h.ms.DEL)} · ${ST[h.status].label}`).join("\n"));
      return;
    }
    if (/snapshot|summary|brief|overview/.test(text)) {
      const counts = { ok:0, risk:0, late:0, np:0 };
      state.hulls.forEach((h) => {
        if (h.status === "on-track") counts.ok++;
        else if (h.status === "at-risk") counts.risk++;
        else if (h.status === "delayed") counts.late++;
        else counts.np++;
      });
      aiBubble("bot",
        `**HORIZON · program snapshot**\n` +
        `Total hulls: ${state.hulls.length}\n` +
        `- \`ON TRACK\` — ${counts.ok}\n- \`AT RISK\` — ${counts.risk}\n- \`DELAYED\` — ${counts.late}\n- \`NOT PLANNED\` — ${counts.np}`);
      return;
    }
    if (/help|what can|commands/.test(text)) {
      aiBubble("bot",
        `**HORIZON commands:**\n` +
        `- \`pipeline snapshot\` — counts by status\n` +
        `- \`next deliveries\` — upcoming DEL milestones\n` +
        `- \`at risk\` / \`delayed\` — filter by status\n` +
        `- \`APL-101\`, \`YRBM-51\`, etc. — hull brief\n`);
      return;
    }
    aiBubble("bot", "HORIZON · ready. Try `pipeline snapshot`, `next deliveries`, `at risk`, or a hull designation like `APL-101`.");
  }
  function nextMS(h) {
    for (const k of Object.keys(MS)) {
      if (h.ms[k] && (!h.complete || !h.complete[k])) return `${k} ${fmtDate(h.ms[k])}`;
    }
    return "—";
  }

  // ═══════════════════════════════════════════════════════════════
  //  CSV
  // ═══════════════════════════════════════════════════════════════
  function csvEsc(v) {
    const s = String(v == null ? "" : v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function exportCSV() {
    const msKeys = Object.keys(allMS());
    const cols = ["id","designation","type","fleet","status",...msKeys.map((k) => "ms_" + k),"builder","contract","uic","fy_approp","notes"];
    const lines = [cols.join(",")];
    state.hulls.forEach((h) => {
      const row = [h.id, h.designation, h.type, h.fleet, h.status];
      msKeys.forEach((k) => row.push(h.ms[k] || ""));
      row.push((h.sf && h.sf.builder) || "");
      row.push((h.sf && h.sf.contract) || "");
      row.push((h.sf && h.sf.uic) || "");
      row.push((h.sf && h.sf.fy_approp) || "");
      row.push(h.notes || "");
      lines.push(row.map(csvEsc).join(","));
    });
    downloadCSV("horizon_schedule.csv", lines.join("\n"));
    audit("EXPORT", "Schedule CSV exported", `${state.hulls.length} hulls`);
    toast("CSV exported");
  }
  function downloadCSV(name, body) {
    const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
  }
  function parseCSV(text) {
    const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.length);
    if (!lines.length) return [];
    const head = splitCSVLine(lines[0]);
    return lines.slice(1).map((ln) => {
      const cells = splitCSVLine(ln);
      const o = {};
      head.forEach((h, i) => { o[h] = cells[i] || ""; });
      return o;
    });
  }
  function splitCSVLine(line) {
    const out = []; let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') { inQ = false; }
        else cur += c;
      } else {
        if (c === ",") { out.push(cur); cur = ""; }
        else if (c === '"') { inQ = true; }
        else cur += c;
      }
    }
    out.push(cur);
    return out;
  }
  function importCSV(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCSV(String(reader.result));
        const msKeys = Object.keys(allMS());
        const newHulls = rows.map((r) => {
          const ms = {}, sf = {};
          msKeys.forEach((k) => { ms[k] = r["ms_" + k] || ""; });
          sf.builder = r.builder || ""; sf.contract = r.contract || "";
          sf.uic = r.uic || ""; sf.fy_approp = r.fy_approp || "";
          return {
            id: r.id || uid("h"),
            designation: r.designation || "(unnamed)",
            type: r.type || "APL",
            fleet: r.fleet || "PACFLT",
            status: r.status || "not-planned",
            ms, sf, complete: {},
            acq: { SRR:"", PDR:"", CDR:"", SDP:"", IOTE:"" },
            notes: r.notes || "",
          };
        });
        confirmDialog(
          "Import CSV",
          `Replace current ${state.hulls.length} hulls with ${newHulls.length} from CSV?`,
          () => {
            state.hulls = newHulls;
            audit("IMPORT", "Schedule CSV imported", `${newHulls.length} hulls`);
            autoSave(); renderAll(); toast("Imported " + newHulls.length + " hulls");
          }
        );
      } catch (e) {
        toast("Import failed: " + e.message, true);
      }
    };
    reader.readAsText(file);
  }

  // ═══════════════════════════════════════════════════════════════
  //  Baseline
  // ═══════════════════════════════════════════════════════════════
  function setBaseline() {
    confirmDialog(
      "Set Baseline",
      `Snapshot all milestone dates as the baseline for variance tracking? This will replace any existing baseline.`,
      () => {
        const snap = { _setAt: new Date().toISOString() };
        state.hulls.forEach((h) => {
          snap[h.id] = {};
          Object.keys(allMS()).forEach((k) => { snap[h.id][k] = h.ms[k] || ""; });
        });
        state.baseline = snap;
        audit("CONFIG", "Set baseline", `${state.hulls.length} hulls snapshotted`);
        autoSave(); renderAll(); toast("Baseline saved");
      }
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  Sample data (reset)
  // ═══════════════════════════════════════════════════════════════
  function loadSample() {
    confirmDialog(
      "Load Sample Data",
      `Reset all hulls back to the PMS 300T sample dataset? Audit log will be preserved.`,
      () => {
        state.hulls = JSON.parse(JSON.stringify(DEMO_HULLS));
        state.baseline = null;
        audit("SYSTEM", "Sample data loaded", `${state.hulls.length} hulls`);
        autoSave(); renderAll(); toast("Sample data loaded");
      }
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  Wire-up
  // ═══════════════════════════════════════════════════════════════
  function wire() {
    // Sidebar nav (views)
    $$(".nav-item[data-view]").forEach((b) => {
      b.addEventListener("click", () => {
        $$(".nav-item[data-view]").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        const v = b.dataset.view;
        state.filter.craft = (v === "all") ? "" : v.toUpperCase();
        $("#filter-craft").value = state.filter.craft;
        renderAll(); autoSave();
      });
    });
    $$(".nav-item[data-status]").forEach((b) => {
      b.addEventListener("click", () => {
        $$(".nav-item[data-status]").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        state.filter.status = b.dataset.status;
        renderAll(); autoSave();
      });
    });

    $("#btn-add-hull").addEventListener("click", openAddHull);
    $("#btn-add-ms").addEventListener("click", openAddMS);
    $("#open-log").addEventListener("click", () => openDrawer("log"));
    $("#open-ai").addEventListener("click", () => openDrawer("ai"));
    $("#btn-print").addEventListener("click", () => window.print());
    $("#btn-baseline").addEventListener("click", setBaseline);
    $("#btn-export-csv").addEventListener("click", exportCSV);
    $("#btn-import-csv").addEventListener("click", () => $("#csv-input").click());
    $("#csv-input").addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importCSV(f);
      e.target.value = "";
    });

    // Toolbar
    $("#filter-craft").addEventListener("change", (e) => {
      state.filter.craft = e.target.value;
      // sync sidebar
      const v = state.filter.craft ? state.filter.craft.toLowerCase() : "all";
      $$(".nav-item[data-view]").forEach((x) => x.classList.toggle("active", x.dataset.view === v));
      renderAll(); autoSave();
    });
    $("#filter-search").addEventListener("input", (e) => {
      state.filter.search = e.target.value;
      renderSheet(); renderGantt(); renderKPIs();
    });
    $("#filter-fy-start").addEventListener("change", (e) => {
      state.filter.fyStart = +e.target.value;
      if (state.filter.fyEnd < state.filter.fyStart) state.filter.fyEnd = state.filter.fyStart;
      $("#filter-fy-end").value = state.filter.fyEnd;
      renderGantt(); renderContextMeta(); autoSave();
    });
    $("#filter-fy-end").addEventListener("change", (e) => {
      state.filter.fyEnd = +e.target.value;
      if (state.filter.fyEnd < state.filter.fyStart) state.filter.fyStart = state.filter.fyEnd;
      $("#filter-fy-start").value = state.filter.fyStart;
      renderGantt(); renderContextMeta(); autoSave();
    });
    $("#toggle-acq").addEventListener("click", () => {
      state.acqOpen = !state.acqOpen;
      $("#toggle-acq").classList.toggle("active", state.acqOpen);
      renderAcq();
    });

    // Page-head actions
    $("#btn-save").addEventListener("click", () => { saveNow(); audit("SAVE", "Manual save", ""); toast("Saved"); });
    $("#btn-sample").addEventListener("click", loadSample);
    $("#btn-zoom-in").addEventListener("click", () => { state.zoom = Math.min(2, state.zoom + 0.1); renderToolbar(); renderGantt(); });
    $("#btn-zoom-out").addEventListener("click", () => { state.zoom = Math.max(0.5, state.zoom - 0.1); renderToolbar(); renderGantt(); });
    $("#btn-zoom-100").addEventListener("click", () => { state.zoom = 1.0; renderToolbar(); renderGantt(); });

    // Sheet click (delegated)
    $("#sheet").addEventListener("click", (e) => {
      const delBtn = e.target.closest("[data-del]");
      if (delBtn) {
        const id = delBtn.dataset.del;
        const hull = getHull(id);
        confirmDialog("Delete Hull", `Permanently remove ${hull.designation} from the schedule?`, () => {
          state.hulls = state.hulls.filter((h) => h.id !== id);
          audit("HULL", "Delete hull", hull.designation);
          autoSave(); renderAll(); toast("Hull deleted");
        });
        return;
      }
      const td = e.target.closest("td");
      const tr = e.target.closest("tr");
      if (!td || !tr || !tr.dataset.hullId) return;
      const hull = getHull(tr.dataset.hullId);
      if (!hull) return;
      if (td.dataset.editMs) {
        openMSEditor(hull.id, td.dataset.editMs, false);
      } else if (td.dataset.editSf) {
        startSFEdit(td, hull, td.dataset.editSf);
      } else if (td.dataset.editField) {
        startInlineEdit(td, hull, td.dataset.editField);
      }
    });
    // Right-click sheet -> context menu
    $("#sheet").addEventListener("contextmenu", (e) => {
      const tr = e.target.closest("tr");
      if (!tr || !tr.dataset.hullId) return;
      e.preventDefault();
      showCtx(e.clientX, e.clientY, tr.dataset.hullId, e.target.closest("td"));
    });
    // Acq cell click
    $("#acq-table").addEventListener("click", (e) => {
      const td = e.target.closest("td");
      if (!td || !td.dataset.acq) return;
      openMSEditor(td.dataset.hullId, td.dataset.acq, true);
    });

    // Modals — milestone editor
    $("#ms-save").addEventListener("click", applyMSEdit);
    $("#ms-clear").addEventListener("click", clearMSEdit);
    $("#ms-cancel").addEventListener("click", closeMSEditor);
    $("#ms-mbg").addEventListener("click", (e) => { if (e.target.id === "ms-mbg") closeMSEditor(); });
    $("#ms-date-input").addEventListener("keydown", (e) => { if (e.key === "Enter") applyMSEdit(); });

    // Modals — add hull
    $("#hull-save").addEventListener("click", saveAddHull);
    $("#hull-cancel").addEventListener("click", closeAddHull);
    $("#hull-mbg").addEventListener("click", (e) => { if (e.target.id === "hull-mbg") closeAddHull(); });

    // Modals — add MS type
    $("#addms-save").addEventListener("click", saveAddMS);
    $("#addms-cancel").addEventListener("click", closeAddMS);
    $("#addms-mbg").addEventListener("click", (e) => { if (e.target.id === "addms-mbg") closeAddMS(); });

    // Confirm modal
    $("#confirm-yes").addEventListener("click", () => { const cb = state.confirmCb; state.confirmCb = null; $("#confirm-mbg").classList.remove("open"); if (cb) cb(); });
    $("#confirm-no").addEventListener("click", () => { state.confirmCb = null; $("#confirm-mbg").classList.remove("open"); });
    $("#confirm-mbg").addEventListener("click", (e) => { if (e.target.id === "confirm-mbg") { state.confirmCb = null; e.currentTarget.classList.remove("open"); } });

    // Drawer
    $("#drawer-close").addEventListener("click", closeDrawer);
    $$(".drawer-tab").forEach((b) => {
      b.addEventListener("click", () => { state.drawerTab = b.dataset.pane; openDrawer(state.drawerTab); });
    });
    $("#audit-search").addEventListener("input", renderAuditList);
    $("#export-audit").addEventListener("click", exportAuditCSV);
    $("#ai-send").addEventListener("click", () => { aiAnswer($("#ai-input").value); $("#ai-input").value = ""; });
    $("#ai-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); aiAnswer($("#ai-input").value); $("#ai-input").value = ""; }
    });

    // Click anywhere to close ctx menu
    document.addEventListener("click", () => $("#row-ctx").classList.remove("open"));

    // Escape closes things
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeMSEditor(); closeAddHull(); closeAddMS();
        $("#confirm-mbg").classList.remove("open"); state.confirmCb = null;
        if (state.drawerOpen) closeDrawer();
      }
    });
  }

  function showCtx(x, y, hullId, td) {
    const ctx = $("#row-ctx");
    ctx.innerHTML = "";
    const hull = getHull(hullId);
    const mkBtn = (label, cb, danger) => {
      const b = document.createElement("button");
      b.textContent = label;
      if (danger) b.className = "danger";
      b.addEventListener("click", (e) => { e.stopPropagation(); ctx.classList.remove("open"); cb(); });
      ctx.appendChild(b);
    };
    if (td && td.dataset.editMs) {
      const code = td.dataset.editMs;
      mkBtn(`Edit ${code}…`, () => openMSEditor(hullId, code, false));
      mkBtn(`Toggle ${code} complete`, () => {
        hull.complete = hull.complete || {};
        hull.complete[code] = !hull.complete[code];
        audit("SCHEDULE", `${hull.designation}.${code}`, hull.complete[code] ? "marked complete" : "complete cleared");
        autoSave(); renderAll();
      });
      mkBtn(`Clear ${code}`, () => {
        const old = hull.ms[code] || "";
        hull.ms[code] = "";
        if (hull.complete) hull.complete[code] = false;
        audit("SCHEDULE", `${hull.designation}.${code}`, `${old} → (cleared)`);
        autoSave(); renderAll();
      });
      const hr = document.createElement("hr"); ctx.appendChild(hr);
    }
    mkBtn("Cycle status", () => {
      const cycle = ["on-track","at-risk","delayed","not-planned"];
      const i = cycle.indexOf(hull.status);
      hull.status = cycle[(i + 1) % cycle.length];
      audit("HULL", "Cycle status", `${hull.designation}: ${hull.status}`);
      autoSave(); renderAll();
    });
    mkBtn("Delete hull", () => {
      confirmDialog("Delete Hull", `Permanently remove ${hull.designation}?`, () => {
        state.hulls = state.hulls.filter((h) => h.id !== hullId);
        audit("HULL", "Delete hull", hull.designation);
        autoSave(); renderAll();
      });
    }, true);

    ctx.style.left = Math.min(window.innerWidth - 220, x) + "px";
    ctx.style.top  = Math.min(window.innerHeight - 200, y) + "px";
    ctx.classList.add("open");
  }

  // ═══════════════════════════════════════════════════════════════
  //  Boot
  // ═══════════════════════════════════════════════════════════════
  function boot() {
    load();
    wire();
    renderAll();
    if (state.lastSavedAt) {
      const dt = new Date(state.lastSavedAt);
      $("#last-saved").textContent = "Saved " + dt.toLocaleTimeString();
    } else {
      $("#last-saved").textContent = "Demo · unsaved";
    }
    audit("SYSTEM", "HORIZON loaded", `${state.hulls.length} hulls`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
