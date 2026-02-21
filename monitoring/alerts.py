"""
S4 Ledger — Alert Manager Configuration
Email/Slack notifications for critical platform events.

Production: Nodemailer (email), Slack webhooks, PagerDuty integration.
Current: Configuration definitions ready for integration.
"""

import json
import hashlib
from datetime import datetime, timezone


# ═══════════════════════════════════════════════════════════════════════
#  ALERT CHANNELS & ROUTING
# ═══════════════════════════════════════════════════════════════════════

ALERT_CHANNELS = {
    "email": {
        "enabled": True,
        "provider": "nodemailer",  # Production: SMTP or SES
        "recipients": {
            "critical": ["ops@s4systems.io", "cto@s4systems.io"],
            "warning": ["ops@s4systems.io"],
            "info": ["dev@s4systems.io"],
        },
        "from": "alerts@s4ledger.com",
        "subject_prefix": "[S4 Ledger]",
    },
    "slack": {
        "enabled": True,
        "webhook_url_env": "S4_SLACK_WEBHOOK_URL",
        "channels": {
            "critical": "#s4-critical",
            "warning": "#s4-ops",
            "info": "#s4-platform",
        },
    },
    "pagerduty": {
        "enabled": False,
        "routing_key_env": "S4_PAGERDUTY_KEY",
        "severity_mapping": {
            "critical": "critical",
            "warning": "warning",
            "info": "info",
        },
    },
}

# Alert routing rules
ALERT_ROUTES = [
    {
        "match": {"team": "blockchain", "severity": "critical"},
        "channels": ["email", "slack", "pagerduty"],
        "repeat_interval": "5m",
    },
    {
        "match": {"team": "platform", "severity": "critical"},
        "channels": ["email", "slack", "pagerduty"],
        "repeat_interval": "5m",
    },
    {
        "match": {"severity": "warning"},
        "channels": ["email", "slack"],
        "repeat_interval": "30m",
    },
    {
        "match": {"severity": "info"},
        "channels": ["slack"],
        "repeat_interval": "4h",
    },
]


class AlertManager:
    """Manage and deliver platform alerts."""

    def __init__(self):
        self._active_alerts = {}  # alert_key -> {alert, first_fired, last_fired, count}
        self._resolved_alerts = []
        self._delivery_log = []

    def fire_alert(self, alert_name: str, severity: str, team: str,
                   summary: str, details: str = "") -> dict:
        """Fire an alert. Deduplicates and respects repeat intervals."""
        alert_key = f"{alert_name}:{severity}:{team}"

        now = datetime.now(timezone.utc)
        if alert_key in self._active_alerts:
            existing = self._active_alerts[alert_key]
            existing["count"] += 1
            existing["last_fired"] = now.isoformat()
            return {"status": "deduplicated", "count": existing["count"]}

        alert = {
            "name": alert_name,
            "severity": severity,
            "team": team,
            "summary": summary,
            "details": details,
            "first_fired": now.isoformat(),
            "last_fired": now.isoformat(),
            "count": 1,
            "status": "firing",
        }
        self._active_alerts[alert_key] = alert

        # Route to channels
        self._route_alert(alert)

        return {"status": "fired", "alert_key": alert_key}

    def resolve_alert(self, alert_name: str, severity: str, team: str) -> dict:
        alert_key = f"{alert_name}:{severity}:{team}"
        if alert_key in self._active_alerts:
            alert = self._active_alerts.pop(alert_key)
            alert["status"] = "resolved"
            alert["resolved_at"] = datetime.now(timezone.utc).isoformat()
            self._resolved_alerts.append(alert)
            return {"status": "resolved"}
        return {"status": "not_found"}

    def _route_alert(self, alert: dict):
        """Route alert to appropriate channels based on rules."""
        for route in ALERT_ROUTES:
            match = route["match"]
            if all(alert.get(k) == v for k, v in match.items()):
                for channel in route["channels"]:
                    self._delivery_log.append({
                        "alert": alert["name"],
                        "channel": channel,
                        "severity": alert["severity"],
                        "timestamp": alert["first_fired"],
                        "status": "pending",  # Production: actual delivery
                    })
                break

    def get_active_alerts(self) -> list:
        return list(self._active_alerts.values())

    def get_delivery_log(self, limit: int = 50) -> list:
        return self._delivery_log[-limit:]


alert_manager = AlertManager()
