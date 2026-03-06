"""
SonicRail – Alert System v2.0
Alert creation, acknowledgment, operator feedback, and feedback statistics.
"""
from datetime import datetime
from config import ALERT_TIERS


class AlertManager:
    def __init__(self):
        self.alerts = []
        self._id_counter = 0
        self._feedback_map = {}   # incident_id → verdict

    def create_alert(self, decision):
        self._id_counter += 1
        severity = decision.get("severity", "NORMAL")
        tier = ALERT_TIERS.get(severity, ALERT_TIERS["NORMAL"])
        alert = {
            "id": self._id_counter,
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "severity": severity,
            "tier_label": tier["label"],
            "response": tier["response"],
            "section": decision.get("section"),
            "km": decision.get("km"),
            "action": decision.get("action"),
            "incident_id": decision.get("incident_id"),
            "acknowledged": False,
            "feedback": None,           # "correct" | "false_alarm"
        }
        self.alerts.insert(0, alert)
        return alert

    def acknowledge(self, alert_id):
        for a in self.alerts:
            if a["id"] == alert_id:
                a["acknowledged"] = True
                return True
        return False

    def operator_feedback(self, incident_id, verdict):
        """
        Record operator verdict for an incident.
        verdict: "correct" | "false_alarm"
        """
        self._feedback_map[incident_id] = verdict
        for a in self.alerts:
            if a.get("incident_id") == incident_id:
                a["feedback"] = verdict
                a["acknowledged"] = True  # auto-acknowledge on feedback
        return True

    def get_feedback_stats(self):
        total = len(self._feedback_map)
        confirmed = sum(1 for v in self._feedback_map.values() if v == "correct")
        false_alarms = total - confirmed
        return {
            "total_feedback": total,
            "confirmed": confirmed,
            "false_alarms": false_alarms,
            "confirmed_rate": round(confirmed / total, 4) if total > 0 else 1.0,
        }

    def get_unread_count(self):
        return sum(1 for a in self.alerts if not a["acknowledged"])

    def get_all_alerts(self):
        return self.alerts[:50]
