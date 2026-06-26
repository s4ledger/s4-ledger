#!/usr/bin/env python3
"""
S4ight eval harness.

Runs the golden Q/A set against either a live HTTP endpoint or the
in-process orchestrator, scores each item, and prints a summary +
exits non-zero on failures (CI-friendly).

Usage:
  python eval/run.py                           # in-process (uses local backend modules)
  python eval/run.py --url http://localhost:8000
  python eval/run.py --url https://s4ledger.com/api/s4ight
  python eval/run.py --verbose
  python eval/run.py --only ils-12-elements,evms-triage
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from typing import Dict, Any, List, Tuple
from urllib import request as urlrequest
from urllib.error import URLError, HTTPError

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
BACKEND = os.path.join(ROOT, "backend")
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)
sys.path.insert(0, HERE)

from golden import GOLDEN  # type: ignore  # noqa: E402


def _ci(s: str) -> str:
    return (s or "").lower()


def score(item: Dict[str, Any], resp: Dict[str, Any]) -> Tuple[int, int, List[str]]:
    """Return (passed, total, reasons)."""
    reasons: List[str] = []
    passed = 0
    total = 0
    text = _ci(resp.get("response", ""))
    sources = " ".join(resp.get("sources") or []).lower()
    agent = resp.get("agent") or ""

    # Agent routing
    total += 1
    expected = item["expect_agent"]
    if expected == "any" or expected.lower() == agent.lower():
        passed += 1
    else:
        reasons.append(f"agent mismatch (got '{agent}', expected '{expected}')")

    # Planner expectations (only when set)
    expect_plan = item.get("expect_plan_tools")
    if expect_plan:
        plan_steps = resp.get("plan_steps") or []
        got_tools = [s.get("tool") for s in plan_steps if isinstance(s, dict)]
        total += 1
        if got_tools == list(expect_plan):
            passed += 1
        else:
            reasons.append(f"plan steps mismatch (got {got_tools}, expected {expect_plan})")

    # Must-cite
    for cite in item.get("must_cite", []):
        total += 1
        if cite.lower() in sources:
            passed += 1
        else:
            reasons.append(f"missing source: {cite}")

    # Must-have
    for needle in item.get("must_have", []):
        total += 1
        if _ci(needle) in text:
            passed += 1
        else:
            reasons.append(f"missing required phrase: '{needle}'")

    # Forbid
    for needle in item.get("forbid", []):
        total += 1
        if _ci(needle) in text:
            reasons.append(f"forbidden phrase appeared: '{needle}'")
        else:
            passed += 1

    return passed, total, reasons


def call_live(url: str, q: str, program: str) -> Dict[str, Any]:
    payload = json.dumps({"message": q, "program": program}).encode("utf-8")
    base = url.rstrip("/")
    chat_url = base + "/chat"
    req = urlrequest.Request(
        chat_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlrequest.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def call_inproc(q: str, program: str) -> Dict[str, Any]:
    from agents import orchestrator  # type: ignore
    return orchestrator.route(query=q, program=program, session_id="eval")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--url", help="Live API base, e.g. http://localhost:8000 or https://s4ledger.com/api/s4ight")
    p.add_argument("--only", help="Comma-separated list of golden IDs to run")
    p.add_argument("--verbose", action="store_true")
    args = p.parse_args()

    only = set([s.strip() for s in (args.only or "").split(",") if s.strip()])
    items = [g for g in GOLDEN if not only or g["id"] in only]

    results: List[Dict[str, Any]] = []
    t0 = time.time()
    for item in items:
        rid = item["id"]
        try:
            if args.url:
                resp = call_live(args.url, item["q"], item["program"])
            else:
                resp = call_inproc(item["q"], item["program"])
        except (HTTPError, URLError, Exception) as e:  # noqa: BLE001
            print(f"[ERROR] {rid}: {type(e).__name__}: {e}", file=sys.stderr)
            results.append({"id": rid, "passed": 0, "total": 1, "reasons": [str(e)]})
            continue
        passed, total, reasons = score(item, resp)
        results.append({"id": rid, "passed": passed, "total": total, "reasons": reasons, "agent": resp.get("agent"), "engine": resp.get("engine")})
        flag = "PASS" if passed == total else "FAIL"
        print(f"[{flag}] {rid}: {passed}/{total}  agent={resp.get('agent')} engine={resp.get('engine')}")
        if args.verbose:
            for r in reasons:
                print(f"        - {r}")
            print(f"        sources: {resp.get('sources')}")

    elapsed = int((time.time() - t0) * 1000)
    total_pass = sum(r["passed"] for r in results)
    total_chk = sum(r["total"] for r in results)
    print(f"\nSummary: {total_pass}/{total_chk} checks in {elapsed}ms across {len(results)} items.")
    failed = [r for r in results if r["passed"] != r["total"]]
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
