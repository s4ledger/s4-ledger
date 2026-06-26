"""
S4ight golden Q/A set.

Each item declares:
  q          : the user prompt
  program    : program in scope
  expect_agent: which agent should answer (loose check; "any" allowed)
  must_cite  : list of substrings that should appear in the cited source list
  must_have  : list of substrings the response MUST contain (case-insensitive)
  should_have: list of substrings the response SHOULD contain (warn if missing)
  forbid     : substrings that MUST NOT appear (anti-hallucination guardrails)

This file is read by run.py — keep it pure Python data.
"""

GOLDEN = [
    {
        "id": "ils-12-elements",
        "q": "What are the 12 IPS elements and which one owns provisioning?",
        "program": "PMS 325",
        "expect_agent": "ILS Agent",
        "must_cite": ["ils_12_elements.md"],
        "must_have": ["Supply Support", "12"],
        "should_have": ["Maintenance Planning", "Technical Data"],
        "forbid": ["I cannot help"],
    },
    {
        "id": "lcsp-milestones",
        "q": "At which milestones is the LCSP required and what changes between MS B and MS C?",
        "program": "PMS 325",
        "expect_agent": "ILS Agent",
        "must_cite": ["lcsp_overview.md"],
        "must_have": ["LCSP", "Milestone"],
        "should_have": ["MS B", "MS C"],
        "forbid": ["I cannot help"],
    },
    {
        "id": "ila-process",
        "q": "Walk me through the ILA process and how I prepare a CAP.",
        "program": "PMS 300",
        "expect_agent": "ILS Agent",
        "must_cite": ["ila_process.md"],
        "must_have": ["ILA", "CAP"],
        "should_have": ["corrective", "finding"],
        "forbid": [],
    },
    {
        "id": "gate-evidence",
        "q": "What evidence should I bring to Gate 5 (pre-MS C)?",
        "program": "PMS 325",
        "expect_agent": "Acquisition Agent",
        "must_cite": ["gate_review_evidence.md"],
        "must_have": ["Gate 5", "LCSP"],
        "should_have": ["ILA", "CPI", "TDP"],
        "forbid": [],
    },
    {
        "id": "evms-triage",
        "q": "Triage EVMS for me. cpi=0.88 spi=0.92 on PMS 325 sustainment WBS.",
        "program": "PMS 325",
        "expect_agent": "Programmatic Agent",
        "must_cite": ["evms_variance_triage.md", "evms_basics.md"],
        "must_have": ["CPI", "SPI"],
        "should_have": ["Red", "VAR", "recovery"],
        "forbid": [],
    },
    {
        "id": "ims-triage",
        "q": "Run a critical path triage for my IMS — what does S4ight expect to find?",
        "program": "PMS 325",
        "expect_agent": "Programmatic Agent",
        "must_cite": ["dcma_14_point_ims.md", "ims_quality.md"],
        "must_have": ["critical path"],
        "should_have": ["CPLI", "BEI"],
        "forbid": [],
    },
    {
        "id": "dmsms",
        "q": "What does S4ight recommend for handling a critical obsolete part?",
        "program": "PMS 385",
        "expect_agent": "ILS Agent",
        "must_cite": ["dmsms_obsolescence.md"],
        "must_have": ["DMSMS"],
        "should_have": ["LTB", "alternate", "redesign"],
        "forbid": [],
    },
    {
        "id": "traceability",
        "q": "Show me how a CDD KPP threads to a CDRL and the LCSP.",
        "program": "PMS 325",
        "expect_agent": "Acquisition Agent",
        "must_cite": ["requirements_traceability.md"],
        "must_have": ["CDD"],
        "should_have": ["APB", "LCSP", "CDRL"],
        "forbid": [],
    },
    {
        "id": "sustaining-engineering",
        "q": "How should I size sustaining engineering capacity for a new auxiliary class?",
        "program": "PMS 325",
        "expect_agent": "ILS Agent",
        "must_cite": ["sustaining_engineering_isea.md"],
        "must_have": ["sustaining engineering", "ISEA"],
        "should_have": ["DR", "OMN"],
        "forbid": [],
    },
    {
        "id": "cyber-sustainment",
        "q": "What should I include for cybersecurity sustainment in IPS Element 7?",
        "program": "PMS 325",
        "expect_agent": "ILS Agent",
        "must_cite": ["cybersecurity_rmf_ato.md"],
        "must_have": ["ATO"],
        "should_have": ["STIG", "POA&M"],
        "forbid": [],
    },
    {
        "id": "out-of-scope",
        "q": "Write me a haiku about sunsets.",
        "program": "PMS 325",
        "expect_agent": "any",
        "must_cite": [],
        "must_have": [],
        "should_have": [],
        "forbid": ["sunset", "haiku"],
    },
]
