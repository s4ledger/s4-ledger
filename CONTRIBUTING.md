# Contributing to S4 Ledger

Thank you for your interest in contributing to S4 Ledger. This guide covers the process for contributing code, documentation, and improvements.

---

## ⚠️ Defense Information Handling

**Before contributing, understand these rules:**

- **Never** include classified, CUI, ITAR, or export-controlled information in any PR, issue, or comment
- **Never** include real contract numbers, personnel data, or sensitive NSNs
- Use only fictional or publicly available example data
- If in doubt, don't include it — ask first at info@s4ledger.com
- Violations will result in immediate removal of the contribution

---

## Getting Started

### 1. Fork & Clone

```bash
git clone https://github.com/s4ledger/s4-ledger.git
cd s4-ledger
```

### 2. Set Up Environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e .
```

### 3. Run Tests

```bash
pytest test_sdk.py test_sdk_coverage.py -v
```

---

## Development Standards

### Code Style
- **Python:** PEP 8, type hints on all public functions
- **HTML/CSS/JS:** Consistent with existing S4 Ledger site style
- **Markdown:** ATX headings, tables for structured data

### Commit Messages
```
type(scope): brief description

feat(sdk): add batch anchoring for multiple records
fix(verify): handle expired XRPL node connections
docs(readme): update SDK quick start examples
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`

### Testing
- All new Python code must include pytest tests
- Maintain or increase test coverage
- Test both success and error paths

---

## Pull Request Process

1. **Branch:** Create a feature branch from `main`
2. **Changes:** Keep PRs focused — one feature or fix per PR
3. **Tests:** Ensure all tests pass
4. **Description:** Include:
   - What the change does
   - Why it's needed
   - Any defense logistics context (e.g., which ILS element it supports)
5. **Review:** PRs require at least one review before merge

---

## What We're Looking For

- SDK improvements (new record types, batch operations, error handling)
- Documentation improvements (use case guides, integration examples)
- Security hardening
- Test coverage expansion
- CLI tool enhancements
- REST API development
- Integration examples (3-M, GCSS, DPAS, etc.)

---

## Reporting Issues

- **Bugs:** Open a GitHub issue with reproduction steps
- **Security vulnerabilities:** Email security@s4ledger.com (do NOT open a public issue)
- **Feature requests:** Open a GitHub issue with the `enhancement` label

---

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.

---

© 2026 S4 Systems, LLC. Charleston, SC.
