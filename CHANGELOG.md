# Changelog

All notable changes to the S4 Ledger project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.2.0] - 2026-02-13

### Added
- ITAR/export-control warning banner across all public-facing HTML pages
- OpenAPI 3.0 specification (`api/openapi.json`) documenting all 17 API endpoints
- CHANGELOG.md following Keep a Changelog format
- NIST SP 800-171 / CMMC compliance documentation (`NIST_CMMC_COMPLIANCE.md`)
- GDPR compliance documentation (`GDPR_COMPLIANCE.md`)
- SEC compliance documentation (`SEC_COMPLIANCE.md`)
- Investor slide deck (`INVESTOR_SLIDE_DECK.md`) with full market and technical overview
- Investor relations page (`INVESTOR_RELATIONS.md`) and investor overview (`INVESTOR_OVERVIEW.md`)
- Production readiness checklist (`PRODUCTION_READINESS.md`)
- Deployment guide (`DEPLOYMENT_GUIDE.md`) with Docker, Vercel, and bare-metal instructions
- Deployment metrics API documentation (`DEPLOYMENT_METRICS_API.md`)
- Recommendations engine documentation (`RECOMMENDATIONS.md`)
- Partner onboarding guide (`PARTNER_ONBOARDING.md`)
- Security audit report (`SECURITY_AUDIT.md`)
- Developer bio page (`DEVELOPER_BIO.md`)
- S4 Systems executive proposal (`S4_SYSTEMS_EXECUTIVE_PROPOSAL.md`)
- Mainnet migration guide (`MAINNET_MIGRATION.md`)
- SDK playground (`sdk-playground/`) for interactive API testing
- Fiat conversion documentation and test suite
- Cross-command logistics anchoring (`cross_command_logistics_anchor.py`)
- Predictive maintenance anchoring (`predictive_maintenance_anchor.py`)
- Ordnance lot anchoring (`ordnance_lot_anchor.py`)
- Custody transfer anchoring (`custody_transfer_anchor.py`)
- Multi-signature setup tooling (`s4-multi-sig-setup/`)
- Transparency report generation (`s4-transparency-report/`)
- Comprehensive test scenario runners (`run_comprehensive_scenarios.py`, `run_typed_scenarios.py`, `run_v28_scenarios.py`)
- S4 anomaly detection module (`s4_anomaly.py`)
- S4 backup management module (`s4_backup.py`)
- S4 communications module (`s4_comms.py`)
- S4 DLRS integration module (`s4_dlrs.py`)
- Webhook integration example (`webhook_example.py`)
- Partner API example (`partner_api_example.py`)
- BAA template (`BAA_TEMPLATE.md`)
- PWA manifest and service worker for demo app

### Changed
- Updated API version to 3.2.0
- Enhanced metrics dashboard with real-time XRPL transaction monitoring
- Improved ILS Intelligence categorization engine accuracy
- Expanded record type support with granular field definitions
- Refined security policy page with compliance badge display

### Fixed
- Scroll progress bar z-index consistency across all pages
- Mobile responsive layout for ILS check grid
- API rate limiting edge cases for burst traffic

### Security
- Added ITAR classification notice to prevent submission of export-controlled data
- Enforced CUI/UNCLASSIFIED data-only policy on all input endpoints
- Strengthened API key validation with scope-based access control

## [3.1.0] - 2026-02-12

### Added
- ILS Intelligence v3 dashboard with DMSMS risk monitoring
- Parts catalog API endpoint (`GET /api/parts`)
- Readiness assessment API endpoint (`GET /api/readiness`)
- DMSMS monitoring API endpoint (`GET /api/dmsms`)
- Infrastructure status API endpoint (`GET /api/infrastructure`)
- Categorization API endpoint (`POST /api/categorize`)
- Analysis persistence endpoints (`POST /api/db/save-analysis`, `GET /api/db/get-analyses`)
- Investor pitch documentation (`INVESTOR_PITCH.md`)
- Integration guide (`INTEGRATIONS.md`)
- S4 CLI tool (`s4_cli.py`) for command-line operations
- Ledger demo notebook (`s4_ledger_demo.ipynb`)

### Changed
- Redesigned main dashboard with particle effects and mesh overlays
- Enhanced transaction viewer with real-time updates
- Improved metrics page with chart visualizations

### Fixed
- XRPL connection timeout handling
- Hash computation for large payloads

## [3.0.0] - 2026-02-11

### Added
- ILS Intelligence v3 engine with ML-powered categorization
- XRPL mainnet anchoring with memo-based record storage
- Real-time transaction monitoring dashboard
- Supply chain receipt anchoring with deterministic verification
- Metrics API (`metrics_api.py`) with Prometheus-compatible output
- S4 SDK (`s4_sdk.py`) for programmatic platform access
- API key authentication system (`POST /api/auth/api-key`, `GET /api/auth/validate`)
- Technical specifications document (`TECHNICAL_SPECS.md`)
- Security policy (`SECURITY.md`)
- Code of Conduct (`CODE_OF_CONDUCT.md`)
- Contributing guidelines (`CONTRIBUTING.md`)
- Comprehensive API examples (`api_examples.md`)

### Changed
- Complete UI redesign with defense-grade dark theme
- Migrated from REST-only to hybrid REST + blockchain architecture
- Upgraded hashing to SHA-256 with XRPL memo anchoring

### Removed
- Legacy v2 API endpoints (deprecated since v2.0.0)

## [2.0.0] - 2026-02-01

### Added
- XRPL integration for immutable record anchoring
- Multi-record type support (supply chain receipts, custody transfers, maintenance logs)
- Transaction history viewer
- Hash verification endpoint (`POST /api/hash`)
- XRPL network status endpoint (`GET /api/xrpl-status`)
- Audit logging (`audit_log.md`)
- Whitepaper (`WHITEPAPER.md`)
- Roadmap documentation (`ROADMAP.md`)

### Changed
- Upgraded API to v2.0 with breaking schema changes
- Moved to serverless deployment on Vercel
- Enhanced error handling and input validation

## [1.0.0] - 2026-01-15

### Added
- Initial release of S4 Ledger platform
- Core anchoring engine with SHA-256 hashing
- REST API with status, health, and metrics endpoints
- Basic transaction recording
- Landing page and documentation site
- Docker deployment support
- Requirements and dependency management
- MIT License

[3.2.0]: https://github.com/solus-protocol/s4-ledger/compare/v3.1.0...v3.2.0
[3.1.0]: https://github.com/solus-protocol/s4-ledger/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/solus-protocol/s4-ledger/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/solus-protocol/s4-ledger/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/solus-protocol/s4-ledger/releases/tag/v1.0.0
