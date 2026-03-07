"""
SonicRail – Decision Engine
Automated decision protocols based on threat severity and confidence.
Includes Contextual Intelligence & Predictive Maintenance capabilities.
"""
import random
from datetime import datetime
from config import EVENT_SEVERITY, ALERT_TIERS, INCIDENT_STATUSES, MODELS_DIR
import os
import json

class ContextAwarenessFilter:
    def __init__(self):
        # Mocks: dictionary of km_block -> active context
        self.active_contexts = {
            "215.4": "TRAIN_PASSING",
            "110.2": "MAINTENANCE_WINDOW",
            "50.5": "WEATHER_STORM"
        }

    def evaluate_context(self, km):
        return self.active_contexts.get(str(km), "CLEAR")

class PredictiveMaintenanceEngine:
    def __init__(self):
        # km -> stress score 0-100
        self.track_stress = {
            "110.2": 65.5,
            "215.4": 15.2,
            "180.1": 89.1, # High stress
            "50.5": 42.0
        }
        
    def record_vibration(self, km, severity):
        # Simulate stress buildup based on severity
        increment = {"P1_CRITICAL": 10.0, "P2_WARNING": 5.0, "P3_ADVISORY": 2.0, "NORMAL": 0.1}.get(severity, 0.1)
        current = self.track_stress.get(str(km), 10.0)
        self.track_stress[str(km)] = min(100.0, current + increment)
        
    def get_maintenance_data(self):
        return self.track_stress

class DecisionEngine:
    def __init__(self):
        self.decisions_log = []
        self.protocol_mode = "AUTO"
        self.context_filter = ContextAwarenessFilter()
        self.predictive_maintenance = PredictiveMaintenanceEngine()
        self.state_path = os.path.join(MODELS_DIR, "incident_history.json")
        self._load_state()

    def _load_state(self):
        if os.path.exists(self.state_path):
            try:
                with open(self.state_path) as f:
                    self.decisions_log = json.load(f)
            except Exception:
                pass

    def _save_state(self):
        try:
            os.makedirs(MODELS_DIR, exist_ok=True)
            with open(self.state_path, "w") as f:
                json.dump(self.decisions_log, f, indent=2)
        except Exception:
            pass

    def evaluate(self, prediction, section, km):
        class_name = prediction["class_name"]
        confidence = prediction["confidence"]
        severity = EVENT_SEVERITY.get(class_name, "NORMAL")
        
        # 1. Update Predictive Maintenance Stress Accumulation
        self.predictive_maintenance.record_vibration(km, severity)

        # 2. Context Awareness Filtering
        context_state = self.context_filter.evaluate_context(km)
        suppression_note = None
        
        # Suppress non-critical alarms if there is a known cause for vibration
        if context_state in ["TRAIN_PASSING", "MAINTENANCE_WINDOW"] and severity not in ["P1_CRITICAL"]:
            suppression_note = f"Alert suppressed. Context: {context_state}"
            severity = "NORMAL"

        # Determine action based on severity
        actions = {
            "P1_CRITICAL": "EMERGENCY BRAKE (PTC) + Speed Restriction + Alert Dispatch",
            "P2_WARNING": "Speed Restriction + Track Patrol Alert",
            "P3_ADVISORY": "Log & Monitor",
            "NORMAL": "Continue Normal Operations",
        }
        
        if suppression_note:
            action = suppression_note
        else:
            action = actions.get(severity, "Log & Monitor")

        # Escalation
        escalation = None
        if severity == "P1_CRITICAL" and confidence > 0.9:
            escalation = "AUTO-ESCALATED: Divisional Control Room notified & PTC Triggered"

        # Generate incident ID
        incident_id = self._generate_incident_id(severity) if severity != "NORMAL" else f"SR-NR-{datetime.now().strftime('%H%M%S')}"

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
            "status": "DETECTED" if severity != "NORMAL" else "SUPPRESSED",
            "context": context_state
        }

        if severity != "NORMAL":
            self.decisions_log.insert(0, decision)
            self._save_state()

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
                inc["acknowledged_at"] = datetime.now().strftime("%H:%M:%S")
                self._save_state()
                return True
        return False

    def investigate_incident(self, incident_id):
        for inc in self.decisions_log:
            if inc["incident_id"] == incident_id:
                inc["status"] = "INVESTIGATING"
                inc["investigating_at"] = datetime.now().strftime("%H:%M:%S")
                self._save_state()
                return True
        return False

    def resolve_incident(self, incident_id, resolution_data=None):
        if resolution_data is None:
            resolution_data = {}
        for inc in self.decisions_log:
            if inc["incident_id"] == incident_id:
                inc["status"] = "RESOLVED"
                inc["resolution_notes"] = resolution_data.get("notes", "")
                inc["resolver_name"] = resolution_data.get("resolver", "Unknown")
                inc["resolution_action"] = resolution_data.get("action", "")
                inc["current_condition"] = resolution_data.get("condition", "")
                inc["resolved_at"] = datetime.now().strftime("%H:%M:%S")
                self._save_state()
                return True
        return False

    def get_incident_stats(self):
        total = len(self.decisions_log)
        active = sum(1 for i in self.decisions_log if i["status"] in ["DETECTED", "ACKNOWLEDGED", "INVESTIGATING"])
        resolved = sum(1 for i in self.decisions_log if i["status"] == "RESOLVED")
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

