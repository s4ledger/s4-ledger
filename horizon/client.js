/*
 * HORIZON — frontend client
 *
 * Runs in two modes:
 *   - LIVE  : POSTs /api/horizon/chat against the FastAPI backend.
 *   - LOCAL : in-browser engine (planner + tools + brief composer) that
 *             mirrors src/agent.py. Used when the backend is absent
 *             (e.g. on s4ledger.com served by Vercel).
 *
 * The page detects mode at startup by pinging /api/horizon/health.
 * No build step, no framework, no dependencies.
 */

(() => {
  "use strict";

  const API_BASE = "/api/horizon";

  // ──────────────────────────────────────────────────────────────
  //  In-browser seed data + engine (LOCAL mode)
  //  Mirrors horizon/seed_data/seed_pipeline.json so the static page
  //  works without a backend.
  // ──────────────────────────────────────────────────────────────
  const SEED = {
    hulls: [
      { id: "T-AO-209", display_name: "T-AO 209", coar: "T-AO 209", class_letter: "A", notes: "Lead vessel in the HORIZON demo set." },
      { id: "YRBM-44",  display_name: "YRBM 44",  coar: "YRBM",     class_letter: "A", notes: "Class A barracks barge." },
      { id: "LSV-7",    display_name: "LSV 7",    coar: "LSV",      class_letter: "B", notes: "Class B logistics support vessel." },
      { id: "LCU-1701", display_name: "LCU 1701", coar: "LCU",      class_letter: "C", notes: "Class C utility landing craft." },
    ],
    records: [
      { pr_number: "PR-00012", hull_id: "T-AO-209", title: "Bridge nav radar refresh",        phase: "Definition",  status: "On Track", riy: 14, baseline_date: "2026-07-12", actual_date: "2026-07-10", variance_days: -2,  next_action: "Specs walkthrough scheduled" },
      { pr_number: "PR-00027", hull_id: "T-AO-209", title: "Cargo pump motor replacements",   phase: "Procurement", status: "At Risk",  riy: 58, baseline_date: "2026-06-30", actual_date: "2026-07-15", variance_days: 15,  next_action: "Solicitation awaiting vendor response" },
      { pr_number: "PR-00042", hull_id: "T-AO-209", title: "Auxiliary diesel overhaul kits",  phase: "Procurement", status: "Overdue",  riy: 81, baseline_date: "2026-05-22", actual_date: "2026-07-03", variance_days: 42,  next_action: "Recompete after sole-source failure" },
      { pr_number: "PR-00055", hull_id: "T-AO-209", title: "Reefer compressor spares",        phase: "Shipbuilder", status: "On Track", riy: 21, baseline_date: "2026-08-04", actual_date: "2026-08-04", variance_days: 0,   next_action: "Vendor production confirmed" },
      { pr_number: "PR-00061", hull_id: "YRBM-44",  title: "Galley HVAC condensers",          phase: "Review",      status: "On Track", riy: 12, baseline_date: "2026-06-18", actual_date: "2026-06-19", variance_days: 1,   next_action: "Acceptance scheduled" },
      { pr_number: "PR-00074", hull_id: "YRBM-44",  title: "Berth life-safety upgrade",       phase: "Definition",  status: "On Track", riy: 9,  baseline_date: "2026-09-10", actual_date: "2026-09-10", variance_days: 0,   next_action: "Requirements package in review" },
      { pr_number: "PR-00088", hull_id: "LSV-7",    title: "Stern ramp hydraulics rebuild",   phase: "Award",       status: "Complete", riy: 4,  baseline_date: "2026-05-30", actual_date: "2026-05-29", variance_days: -1,  next_action: "Action closed out" },
      { pr_number: "PR-00093", hull_id: "LSV-7",    title: "Cargo deck non-skid recoat",      phase: "Shipbuilder", status: "At Risk",  riy: 47, baseline_date: "2026-07-20", actual_date: "2026-08-02", variance_days: 13,  next_action: "Vendor schedule slip flagged" },
      { pr_number: "PR-00104", hull_id: "LCU-1701", title: "Coxswain console refit",          phase: "Procurement", status: "On Track", riy: 18, baseline_date: "2026-08-15", actual_date: "2026-08-15", variance_days: 0,   next_action: "Solicitation released" },
      { pr_number: "PR-00118", hull_id: "LCU-1701", title: "Outboard engine rebuilds (qty 2)", phase: "Review",     status: "At Risk",  riy: 62, baseline_date: "2026-06-25", actual_date: "2026-07-09", variance_days: 14,  next_action: "Bench-test failure on unit 1" },
    ],
  };

  const KB = [
    {
      path: "knowledge_base/pipeline_stages.md",
      title: "HORIZON — Pipeline Stages",
      excerpt: "Five phases — Definition → Procurement → Shipbuilder → Review → Award. Status chips: On Track (green), At Risk (amber), Overdue (red), Complete (teal). RIY 0–24 nominal, 25–59 elevated, 60–100 critical.",
    },
    {
      path: "knowledge_base/terminology.md",
      title: "HORIZON — Terminology Reference",
      excerpt: "PR # is the Pipeline Record number (format PR-#####). Hull is the vessel a record is associated with. COAR is the classification chip. RIY is Risk-Index Yield (0–100). Variance is actual minus baseline in days.",
    },
    {
      path: "knowledge_base/manifest_overview.md",
      title: "MANIFEST — Platform Overview",
      excerpt: "MANIFEST is the S4 Systems institutional platform for operational continuity across vessel programs. HORIZON is its procurement_pipeline_analyst module.",
    },
  ];

  // Engine: tools
  const tools = {
    search_records({ query, status, phase, hull, limit = 25 } = {}) {
      let rs = SEED.records.slice();
      if (query) {
        const q = String(query).toLowerCase();
        rs = rs.filter((r) =>
          r.title.toLowerCase().includes(q) || r.pr_number.toLowerCase().includes(q)
        );
      }
      if (status) rs = rs.filter((r) => r.status === status);
      if (phase)  rs = rs.filter((r) => r.phase === phase);
      if (hull)   rs = rs.filter((r) => r.hull_id === hull);
      rs.sort((a, b) => b.riy - a.riy || a.pr_number.localeCompare(b.pr_number));
      return rs.slice(0, limit);
    },
    get_pipeline_snapshot({ hull } = {}) {
      const rs = hull ? SEED.records.filter((r) => r.hull_id === hull) : SEED.records;
      const phaseCounts = {};
      const statusCounts = {};
      rs.forEach((r) => {
        phaseCounts[r.phase]   = (phaseCounts[r.phase]   || 0) + 1;
        statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
      });
      return {
        hull: hull || null,
        by_phase:  Object.entries(phaseCounts).map(([phase, n])   => ({ phase, n })),
        by_status: Object.entries(statusCounts).map(([status, n]) => ({ status, n })),
        top_risk:  rs.slice().sort((a, b) => b.riy - a.riy).slice(0, 5),
      };
    },
    forecast_slip({ pr_number }) {
      const rec = SEED.records.find((r) => r.pr_number === pr_number);
      if (!rec) return { pr_number, error: "not_found" };
      const tail = { Definition: 5, Procurement: 18, Shipbuilder: 14, Review: 8, Award: 2 }[rec.phase] || 10;
      let projected = rec.variance_days;
      if (rec.status === "Overdue") projected += tail;
      else if (rec.status === "At Risk") projected += Math.floor(tail / 2);
      const confidence = rec.riy >= 60 ? "low" : rec.riy >= 25 ? "medium" : "high";
      return {
        pr_number,
        hull_id: rec.hull_id,
        phase: rec.phase,
        status: rec.status,
        current_variance_days: rec.variance_days,
        projected_variance_days: projected,
        confidence,
        rationale: `Phase ${rec.phase} carries ~${tail}d typical tail risk; current RIY=${rec.riy} with status ${rec.status}.`,
      };
    },
    get_hull_status({ hull }) {
      const h = SEED.hulls.find((x) => x.id === hull);
      if (!h) return { hull, error: "not_found" };
      const recs = SEED.records.filter((r) => r.hull_id === hull).sort((a, b) => b.riy - a.riy);
      const counts = { "On Track": 0, "At Risk": 0, "Overdue": 0, "Complete": 0 };
      recs.forEach((r) => counts[r.status]++);
      return { hull: h, record_count: recs.length, status_counts: counts, records: recs };
    },
    summarize_pipeline() {
      const statusCounts = {};
      SEED.records.forEach((r) => {
        statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
      });
      const top = SEED.records
        .filter((r) => r.status === "At Risk" || r.status === "Overdue")
        .sort((a, b) => b.riy - a.riy)
        .slice(0, 5);
      return {
        total_records: SEED.records.length,
        by_status: Object.entries(statusCounts).map(([status, n]) => ({ status, n })),
        top_attention: top,
      };
    },
  };

  // Engine: planner — mirrors src/agent.py::LLM.plan
  function plan(userText) {
    const text = userText.toLowerCase();
    const prMatch = text.match(/\bpr[- ]?(\d{3,6})\b/);
    if (prMatch) {
      const padded = String(parseInt(prMatch[1], 10)).padStart(5, "0");
      return { tool: "forecast_slip", args: { pr_number: `PR-${padded}` } };
    }
    const hullMatch = text.match(/\b(t-ao[- ]?\d+|yrbm[- ]?\d+|lsv[- ]?\d+|lcu[- ]?\d+)\b/);
    if (hullMatch) {
      const raw = hullMatch[1].toUpperCase().replace(/ /g, "-");
      return { tool: "get_hull_status", args: { hull: raw } };
    }
    if (/(snapshot|overview|pipeline|summary|brief)/.test(text)) {
      return { tool: "summarize_pipeline", args: {} };
    }
    if (/overdue/.test(text)) {
      return { tool: "search_records", args: { status: "Overdue" } };
    }
    if (/(at risk|at-risk|\brisk\b|\bslip\b|behind)/.test(text)) {
      return { tool: "search_records", args: { status: "At Risk" } };
    }
    if (/(search|find|show me|list)/.test(text)) {
      const qm = userText.match(/['"]([^'"]+)['"]/);
      const query = qm ? qm[1] : userText.split(/\s+/).pop();
      return { tool: "search_records", args: { query, limit: 10 } };
    }
    return { tool: null, args: {} };
  }

  // Engine: KB retrieval (cheap keyword overlap)
  function retrieve(query) {
    const STOP = new Set(["the","a","an","and","or","of","for","to","in","on","at","with","is","are","was","were","be","by","as","it","this","that","from","into","any","all","if","then","else","than","but","not","no","so","do","does","did","what","mean","does"]);
    const tokens = (query.toLowerCase().match(/[a-z][a-z0-9_\-]+/g) || []).filter((t) => !STOP.has(t));
    if (tokens.length === 0) return [];
    const qs = new Set(tokens);
    return KB.map((doc) => {
      const docTokens = new Set((doc.excerpt.toLowerCase().match(/[a-z][a-z0-9_\-]+/g) || []));
      let overlap = 0;
      qs.forEach((t) => { if (docTokens.has(t)) overlap++; });
      return { ...doc, score: overlap };
    }).filter((d) => d.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  // Engine: composer — mirrors src/agent.py::_format_brief
  function formatBrief(toolName, result) {
    const prLine = (r) =>
      `- \`${r.pr_number}\` · ${r.hull_id || "—"} · ${r.phase} · \`${r.status.toUpperCase()}\` · RIY ${r.riy} · ${(r.variance_days >= 0 ? "+" : "") + r.variance_days}d · ${r.title}`;

    if (toolName === "summarize_pipeline") {
      const lines = ["HORIZON · pipeline brief", "", `Total records: **${result.total_records}**`, "", "By status:"];
      result.by_status.forEach((row) => lines.push(`- \`${row.status.toUpperCase()}\` — ${row.n}`));
      if (result.top_attention.length) {
        lines.push("", "Top attention:");
        result.top_attention.forEach((r) => lines.push(prLine(r)));
      }
      return lines.join("\n");
    }
    if (toolName === "forecast_slip") {
      if (result.error === "not_found") return `HORIZON · ${result.pr_number} not found in the pipeline.`;
      const sign = result.projected_variance_days >= 0 ? "+" : "";
      const cvSign = result.current_variance_days >= 0 ? "+" : "";
      return [
        `HORIZON · slip forecast — \`${result.pr_number}\``,
        `- Hull: ${result.hull_id}`,
        `- Phase: ${result.phase} · Status: \`${result.status.toUpperCase()}\``,
        `- Current variance: \`${cvSign}${result.current_variance_days}d\``,
        `- Projected variance: \`${sign}${result.projected_variance_days}d\``,
        `- Confidence: **${result.confidence}**`,
        "",
        `_${result.rationale}_`,
      ].join("\n");
    }
    if (toolName === "get_hull_status") {
      if (result.error === "not_found") return `HORIZON · hull \`${result.hull}\` not found.`;
      const h = result.hull, sc = result.status_counts;
      const lines = [
        `HORIZON · hull brief — **${h.display_name}**`,
        `- COAR: \`${h.coar || "—"}\`  · Class: \`${h.class_letter || "—"}\``,
        `- Records tracked: ${result.record_count}`,
        `- Status mix: \`ON TRACK\` ${sc["On Track"]} · \`AT RISK\` ${sc["At Risk"]} · \`OVERDUE\` ${sc["Overdue"]} · \`COMPLETE\` ${sc["Complete"]}`,
        "",
      ];
      if (result.records.length) {
        lines.push("Top by RIY:");
        result.records.slice(0, 5).forEach((r) => lines.push(prLine(r)));
      }
      return lines.join("\n");
    }
    if (toolName === "get_pipeline_snapshot") {
      const lines = ["HORIZON · snapshot", ""];
      if (result.hull) { lines.push(`Hull scope: ${result.hull}`); lines.push(""); }
      lines.push("By phase:");
      result.by_phase.forEach((row) => lines.push(`- ${row.phase}: ${row.n}`));
      lines.push("");
      lines.push("By status:");
      result.by_status.forEach((row) => lines.push(`- \`${row.status.toUpperCase()}\`: ${row.n}`));
      if (result.top_risk.length) {
        lines.push("", "Top risk:");
        result.top_risk.forEach((r) => lines.push(prLine(r)));
      }
      return lines.join("\n");
    }
    if (toolName === "search_records") {
      if (!result.length) return "HORIZON · no pipeline records matched.";
      const lines = [`HORIZON · ${result.length} match(es)`, ""];
      result.forEach((r) => lines.push(prLine(r)));
      return lines.join("\n");
    }
    return `HORIZON · ${toolName} →\n\`\`\`\n${JSON.stringify(result, null, 2)}\n\`\`\``;
  }

  // Engine: full turn (LOCAL mode)
  function runTurnLocal(message) {
    const p = plan(message);
    let toolResult = null;
    let reply;
    if (p.tool && tools[p.tool]) {
      toolResult = tools[p.tool](p.args);
      reply = formatBrief(p.tool, toolResult);
    } else {
      const refs = retrieve(message);
      if (refs.length) {
        const top = refs[0];
        reply = `HORIZON · reference\nSource: \`${top.path}\` — *${top.title}*\n\n${top.excerpt}\n\n_(For pipeline data, ask about a specific PR #, hull, or for a snapshot.)_`;
      } else {
        reply = "HORIZON · ready\nAsk me about a pipeline record (e.g. `PR-00042`), a hull (e.g. `T-AO 209`), or request a `pipeline snapshot`.";
      }
    }
    return {
      session_id: "local-session",
      reply,
      tool: p.tool,
      tool_args: p.args,
      tool_result: toolResult,
      retrieved: retrieve(message),
    };
  }

  // ──────────────────────────────────────────────────────────────
  //  UI wiring
  // ──────────────────────────────────────────────────────────────
  const els = {
    convo:        document.getElementById("convo"),
    composer:     document.getElementById("composer"),
    sendBtn:      document.getElementById("send-btn"),
    turnCount:    document.getElementById("turn-count"),
    toast:        document.getElementById("toast"),
    saveDot:      document.getElementById("save-dot"),
    saveLabel:    document.getElementById("save-label"),
    sessionFoot:  document.getElementById("session-id-foot"),
    modeMeta:     document.getElementById("mode-meta"),
    bMode:        document.getElementById("b-mode"),
    bTool:        document.getElementById("b-tool"),
    bRefs:        document.getElementById("b-refs"),
    hullPicker:   document.getElementById("hull-picker"),
    snapBtn:      document.getElementById("snap-btn"),
    kpiTotal:     document.getElementById("kpi-total"),
    kpiOk:        document.getElementById("kpi-ok"),
    kpiRisk:      document.getElementById("kpi-risk"),
    kpiLate:      document.getElementById("kpi-late"),
  };

  const state = {
    sessionId: null,
    userHandle: "demo-pm",
    turns: 0,
    busy: false,
    runtime: "detecting", // 'live' | 'local'
    agentId: "mppt-001",
    agentMode: "stub",
  };

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    setTimeout(() => els.toast.classList.remove("show"), 2600);
  }
  function setSave(s, label) {
    els.saveDot.className = "save-dot " + s;
    els.saveLabel.textContent = label;
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  function renderMarkdown(src) {
    let out = escapeHTML(src);
    out = out.replace(/```([\s\S]*?)```/g, (_m, body) => `<pre><code>${body.replace(/\n$/, "")}</code></pre>`);
    out = out.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/(^|\s)_([^_\n]+)_(\s|$)/g, "$1<em>$2</em>$3");
    const lines = out.split("\n");
    const buf = [];
    let inUL = false;
    for (const ln of lines) {
      if (/^- /.test(ln)) {
        if (!inUL) { buf.push("<ul style='margin:6px 0 6px 18px;'>"); inUL = true; }
        buf.push(`<li>${ln.slice(2)}</li>`);
      } else {
        if (inUL) { buf.push("</ul>"); inUL = false; }
        buf.push(ln);
      }
    }
    if (inUL) buf.push("</ul>");
    return buf.join("\n").replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>");
  }

  function bubble(who, text, opts = {}) {
    const wrap = document.createElement("div");
    wrap.className = "msg " + (who === "user" ? "user" : "bot");
    wrap.innerHTML = `
      <div class="who">${who === "user" ? state.userHandle : "HORIZON"}</div>
      <div class="body">${opts.raw ? renderMarkdown(text) : escapeHTML(text)}</div>
    `;
    els.convo.appendChild(wrap);
    els.convo.scrollTop = els.convo.scrollHeight;
    state.turns += 1;
    els.turnCount.textContent = `${state.turns} turn${state.turns === 1 ? "" : "s"}`;
  }

  function updateBriefPanel(payload) {
    if (payload.tool) {
      els.bTool.innerHTML =
        `<div><strong>${escapeHTML(payload.tool)}</strong></div>` +
        `<div style="margin-top:4px; color: var(--text-3);">${escapeHTML(JSON.stringify(payload.tool_args || {}))}</div>`;
    } else {
      els.bTool.textContent = "No tool invoked on the last turn.";
    }
    if (payload.retrieved && payload.retrieved.length) {
      els.bRefs.innerHTML = payload.retrieved.map((r) =>
        `<div style="margin-bottom:6px;">
          <span style="color: var(--text-1); font-weight:500;">${escapeHTML(r.title)}</span>
          <div style="color: var(--text-4); font-size:10px;">${escapeHTML(r.path)} · score ${r.score}</div>
        </div>`
      ).join("");
    } else {
      els.bRefs.textContent = "No knowledge-base hits on the last turn.";
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  Runtime detection
  // ──────────────────────────────────────────────────────────────
  async function detectRuntime() {
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 1200);
      const res = await fetch(API_BASE + "/health", { signal: ac.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error("bad_status");
      const h = await res.json();
      state.runtime = "live";
      state.agentId = h.agent_id || state.agentId;
      state.agentMode = h.mode || state.agentMode;
      els.modeMeta.textContent = `MODE: ${state.agentMode.toUpperCase()} · Agent ${state.agentId} · LIVE`;
      els.bMode.textContent = `${state.agentMode} (live backend)`;
      setSave("ok", "Connected");
    } catch (_) {
      state.runtime = "local";
      els.modeMeta.textContent = `MODE: STUB · Agent ${state.agentId} · LOCAL`;
      els.bMode.textContent = "stub (in-browser)";
      setSave("ok", "Local mode");
    }
  }

  function loadKPIs() {
    const snap = tools.summarize_pipeline();
    let ok = 0, risk = 0, late = 0;
    snap.by_status.forEach((row) => {
      if (row.status === "On Track") ok = row.n;
      if (row.status === "At Risk")  risk = row.n;
      if (row.status === "Overdue")  late = row.n;
    });
    els.kpiTotal.textContent = snap.total_records;
    els.kpiOk.textContent    = ok;
    els.kpiRisk.textContent  = risk;
    els.kpiLate.textContent  = late;
  }

  function loadHulls() {
    const seen = new Set();
    SEED.records.forEach((r) => r.hull_id && seen.add(r.hull_id));
    [...seen].sort().forEach((h) => {
      const opt = document.createElement("option");
      opt.value = h;
      opt.textContent = h;
      els.hullPicker.appendChild(opt);
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  Send handler — talks to backend if live, else runs locally
  // ──────────────────────────────────────────────────────────────
  async function sendBackend(message) {
    const res = await fetch(API_BASE + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        session_id: state.sessionId,
        user_handle: state.userHandle,
      }),
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  }

  async function handleSend(text) {
    if (!text || state.busy) return;
    state.busy = true;
    els.sendBtn.disabled = true;
    setSave("busy", "Thinking…");
    bubble("user", text);
    els.composer.value = "";

    try {
      let data;
      if (state.runtime === "live") {
        try {
          data = await sendBackend(text);
        } catch (_) {
          // Backend went away mid-session — degrade to local.
          state.runtime = "local";
          els.modeMeta.textContent = `MODE: STUB · Agent ${state.agentId} · LOCAL (fallback)`;
          els.bMode.textContent = "stub (in-browser, fallback)";
          data = runTurnLocal(text);
        }
      } else {
        data = runTurnLocal(text);
      }
      state.sessionId = data.session_id;
      els.sessionFoot.textContent = "Session: " + String(data.session_id).slice(-8);
      bubble("bot", data.reply, { raw: true });
      updateBriefPanel(data);
      setSave("ok", state.runtime === "live" ? "Connected" : "Local mode");
    } catch (e) {
      bubble("bot", "HORIZON · request failed.\n```\n" + (e.message || e) + "\n```", { raw: true });
      setSave("err", "Error");
      toast("Send failed");
    } finally {
      state.busy = false;
      els.sendBtn.disabled = false;
      els.composer.focus();
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  Wire up
  // ──────────────────────────────────────────────────────────────
  els.sendBtn.addEventListener("click", () => handleSend(els.composer.value.trim()));
  els.composer.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      handleSend(els.composer.value.trim());
    }
  });
  els.snapBtn.addEventListener("click", () => handleSend("pipeline snapshot"));

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const cmd = btn.dataset.cmd;
      const phrases = {
        snapshot: "pipeline snapshot",
        risks:    "show at risk",
        overdue:  "show overdue",
        tools:    "what tools do you have",
        stages:   "explain the pipeline stages",
        terms:    "what does RIY mean",
      };
      handleSend(phrases[cmd] || cmd);
    });
  });

  els.hullPicker.addEventListener("change", () => {
    const h = els.hullPicker.value;
    if (h) handleSend(h + " status");
  });

  // First paint
  loadHulls();
  loadKPIs();
  detectRuntime();
  bubble(
    "bot",
    "HORIZON online. Ask for a `pipeline snapshot`, look up a `PR-#####`, or scope to a hull (e.g. `T-AO 209`).",
    { raw: true }
  );
})();
