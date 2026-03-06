"""
SonicRail – Decision Engine
Automated decision protocols based on threat severity and confidence.
"""
import random
from datetime import datetime
from config import EVENT_SEVERITY, ALERT_TIERS, INCIDENT_STATUSES


class DecisionEngine:
    def __init__(self):
        self.decisions_log = []
        self.protocol_mode = "AUTO"

    def evaluate(self, prediction, section, km):
        class_name = prediction["class_name"]
        confidence = prediction["confidence"]
        severity = EVENT_SEVERITY.get(class_name, "NORMAL")

        # Determine action based on severity
        actions = {
            "P1_CRITICAL": "EMERGENCY BRAKE + Speed Restriction + Alert Dispatch",
            "P2_WARNING": "Speed Restriction + Track Patrol Alert",
            "P3_ADVISORY": "Log & Monitor",
            "NORMAL": "Continue Normal Operations",
        }
        action = actions.get(severity, "Log & Monitor")

        # Escalation
        escalation = None
        if severity == "P1_CRITICAL" and confidence > 0.9:
            escalation = "AUTO-ESCALATED: Divisional Control Room notified"

        # Generate incident ID
        incident_id = self._generate_incident_id(severity)

        decision = {
            "incident_id": incident_id,
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "section": section["id"],
            "km": km,
            "class_name": class_name,
            "class_label": prediction["class_label"],
            "confidence": round(confidence, 3),
            "severity": severity,
            "action": action,
            "escalation": escalation,
            "status": "DETECTED",
        }

        if severity != "NORMAL":
            self.decisions_log.insert(0, decision)

        return decision

    def _generate_incident_id(self, severity):
        prefix = {"P1_CRITICAL": "P1", "P2_WARNING": "P2", "P3_ADVISORY": "P3", "NORMAL": "NR"}
        p = prefix.get(severity, "NR")
        ts = datetime.now().strftime("%H%M%S")
        r = random.randint(100, 999)
        return f"SR-{p}-{ts}-{r}"

    def acknowledge_incident(self, incident_id):
        for inc in self.decisions_log:
            if inc["incident_id"] == incident_id:
                inc["status"] = "ACKNOWLEDGED"
                return True
        return False

    def resolve_incident(self, incident_id, notes=""):
        for inc in self.decisions_log:
            if inc["incident_id"] == incident_id:
                inc["status"] = "RESOLVED"
                inc["resolution_notes"] = notes
                inc["resolved_at"] = datetime.now().strftime("%H:%M:%S")
                return True
        return False

    def get_incident_stats(self):
        total = len(self.decisions_log)
        active = sum(1 for i in self.decisions_log if i["status"] != "RESOLVED")
        resolved = total - active
        p1 = sum(1 for i in self.decisions_log if i["severity"] == "P1_CRITICAL")
        p2 = sum(1 for i in self.decisions_log if i["severity"] == "P2_WARNING")
        return {
            "total": total,
            "active": active,
            "resolved": resolved,
            "p1_count": p1,
            "p2_count": p2,
            "resolution_rate": round(resolved / max(total, 1) * 100, 1),
        }
