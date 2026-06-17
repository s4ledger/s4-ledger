"""HORIZON — tools the agent can invoke.

Each tool is a plain function with a typed signature and a JSON-schema
descriptor in `TOOL_SCHEMAS`. The agent loop in `agent.py` selects
tools by name and dispatches via `TOOL_DISPATCH`.

All tools are read-only against the seeded pipeline; mutations are not
exposed to the agent at this time.
"""

from __future__ import annotations

from typing import Any

from .db import db, rows_to_dicts


# ──────────────────────────────────────────────────────────────────
#  Tool implementations
# ──────────────────────────────────────────────────────────────────

def search_records(
    query: str | None = None,
    status: str | None = None,
    phase: str | None = None,
    hull: str | None = None,
    limit: int = 25,
) -> list[dict[str, Any]]:
    sql = ["SELECT * FROM pipeline_records WHERE 1=1"]
    args: list[Any] = []
    if query:
        sql.append("AND (LOWER(title) LIKE ? OR LOWER(pr_number) LIKE ?)")
        like = f"%{query.lower()}%"
        args.extend([like, like])
    if status:
        sql.append("AND status = ?")
        args.append(status)
    if phase:
        sql.append("AND phase = ?")
        args.append(phase)
    if hull:
        sql.append("AND hull_id = ?")
        args.append(hull)
    sql.append("ORDER BY riy DESC, pr_number ASC LIMIT ?")
    args.append(int(limit))
    with db() as conn:
        rows = conn.execute(" ".join(sql), tuple(args)).fetchall()
    return rows_to_dicts(rows)


def get_pipeline_snapshot(hull: str | None = None) -> dict[str, Any]:
    where = "WHERE hull_id = ?" if hull else ""
    args: tuple = (hull,) if hull else ()
    with db() as conn:
        by_phase = rows_to_dicts(conn.execute(
            f"SELECT phase, COUNT(*) AS n FROM pipeline_records {where} GROUP BY phase", args
        ).fetchall())
        by_status = rows_to_dicts(conn.execute(
            f"SELECT status, COUNT(*) AS n FROM pipeline_records {where} GROUP BY status", args
        ).fetchall())
        riskiest = rows_to_dicts(conn.execute(
            f"""SELECT pr_number, hull_id, title, phase, status, riy, variance_days
                  FROM pipeline_records {where}
                 ORDER BY riy DESC LIMIT 5""", args
        ).fetchall())
    return {
        "hull": hull,
        "by_phase": by_phase,
        "by_status": by_status,
        "top_risk": riskiest,
    }


def forecast_slip(pr_number: str) -> dict[str, Any]:
    with db() as conn:
        row = conn.execute(
            "SELECT * FROM pipeline_records WHERE pr_number = ?", (pr_number,)
        ).fetchone()
    if row is None:
        return {"pr_number": pr_number, "error": "not_found"}
    rec = dict(row)

    # Deterministic forecast for stub mode:
    #   - Complete: zero slip.
    #   - Else projected_variance = current_variance + per-phase tail risk.
    tail = {
        "Definition": 5,
        "Procurement": 18,
        "Shipbuilder": 14,
        "Review": 8,
        "Award": 2,
    }.get(rec["phase"], 10)
    if rec["status"] == "Complete":
        projected = rec["variance_days"]
    elif rec["status"] == "Overdue":
        projected = rec["variance_days"] + tail
    elif rec["status"] == "At Risk":
        projected = rec["variance_days"] + (tail // 2)
    else:
        projected = rec["variance_days"]

    confidence = "low" if rec["riy"] >= 60 else "medium" if rec["riy"] >= 25 else "high"
    return {
        "pr_number": pr_number,
        "hull_id": rec["hull_id"],
        "phase": rec["phase"],
        "status": rec["status"],
        "current_variance_days": rec["variance_days"],
        "projected_variance_days": projected,
        "confidence": confidence,
        "rationale": (
            f"Phase {rec['phase']} carries ~{tail}d typical tail risk; "
            f"current RIY={rec['riy']} with status {rec['status']}."
        ),
    }


def get_hull_status(hull: str) -> dict[str, Any]:
    with db() as conn:
        hull_row = conn.execute(
            "SELECT * FROM hulls WHERE id = ?", (hull,)
        ).fetchone()
        if hull_row is None:
            return {"hull": hull, "error": "not_found"}
        recs = rows_to_dicts(conn.execute(
            "SELECT * FROM pipeline_records WHERE hull_id = ? ORDER BY riy DESC", (hull,)
        ).fetchall())
    counts = {"On Track": 0, "At Risk": 0, "Overdue": 0, "Complete": 0}
    for r in recs:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    return {
        "hull": dict(hull_row),
        "record_count": len(recs),
        "status_counts": counts,
        "records": recs,
    }


def summarize_pipeline() -> dict[str, Any]:
    with db() as conn:
        totals = conn.execute("SELECT COUNT(*) AS n FROM pipeline_records").fetchone()["n"]
        by_status = rows_to_dicts(conn.execute(
            "SELECT status, COUNT(*) AS n FROM pipeline_records GROUP BY status"
        ).fetchall())
        worst = rows_to_dicts(conn.execute(
            """SELECT pr_number, hull_id, title, phase, status, riy, variance_days
                 FROM pipeline_records
                 WHERE status IN ('At Risk', 'Overdue')
                 ORDER BY riy DESC LIMIT 5"""
        ).fetchall())
    return {
        "total_records": totals,
        "by_status": by_status,
        "top_attention": worst,
    }


# ──────────────────────────────────────────────────────────────────
#  Registry
# ──────────────────────────────────────────────────────────────────

TOOL_DISPATCH = {
    "search_records":        search_records,
    "get_pipeline_snapshot": get_pipeline_snapshot,
    "forecast_slip":         forecast_slip,
    "get_hull_status":       get_hull_status,
    "summarize_pipeline":    summarize_pipeline,
}

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "name": "search_records",
        "description": "Filter pipeline records by free-text, status, phase, and hull.",
        "parameters": {
            "type": "object",
            "properties": {
                "query":  {"type": "string", "description": "Substring match against title or PR number."},
                "status": {"type": "string", "enum": ["On Track", "At Risk", "Overdue", "Complete"]},
                "phase":  {"type": "string", "enum": ["Definition", "Procurement", "Shipbuilder", "Review", "Award"]},
                "hull":   {"type": "string", "description": "Hull id, e.g. 'T-AO-209'."},
                "limit":  {"type": "integer", "default": 25, "maximum": 100},
            },
            "required": [],
        },
    },
    {
        "name": "get_pipeline_snapshot",
        "description": "Phase and status counts plus top-5 riskiest records. Optionally scope to one hull.",
        "parameters": {
            "type": "object",
            "properties": {"hull": {"type": "string"}},
            "required": [],
        },
    },
    {
        "name": "forecast_slip",
        "description": "Project the slip (in days) for a single PR number with a confidence band.",
        "parameters": {
            "type": "object",
            "properties": {"pr_number": {"type": "string"}},
            "required": ["pr_number"],
        },
    },
    {
        "name": "get_hull_status",
        "description": "Per-hull readiness summary: status counts and full record list.",
        "parameters": {
            "type": "object",
            "properties": {"hull": {"type": "string"}},
            "required": ["hull"],
        },
    },
    {
        "name": "summarize_pipeline",
        "description": "Top-of-pipeline brief across all hulls.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
]


def list_tools() -> list[dict[str, Any]]:
    return TOOL_SCHEMAS


def call_tool(name: str, args: dict[str, Any] | None = None) -> dict[str, Any]:
    if name not in TOOL_DISPATCH:
        return {"error": f"unknown_tool: {name}"}
    fn = TOOL_DISPATCH[name]
    payload = args or {}
    try:
        return {"tool": name, "args": payload, "result": fn(**payload)}
    except TypeError as exc:
        return {"tool": name, "args": payload, "error": f"bad_arguments: {exc}"}
    except Exception as exc:
        return {"tool": name, "args": payload, "error": f"tool_failed: {exc}"}
